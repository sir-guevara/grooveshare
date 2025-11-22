import "dotenv/config";
import cors from "cors";
import bcrypt from "bcryptjs";
import express, { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";
import { db } from "./db/client";
import { ensureDatabase } from "./db/setup";
import {
  mediaFiles,
  roomParticipants,
  rooms,
  userRoles,
  users,
} from "./db/schema";
import { fetchOmdbMetadata, cachePosterImage } from "./utils/omdb";

const app = express();
const port = Number(process.env.PORT) || 4000;
const jwtSecret = process.env.JWT_SECRET || "dev-secret";
const apiBase = "/api";

ensureDatabase();

const uploadDir = path.join(process.cwd(), "server", "uploads");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    // Preserve file extension
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    const filename = `${name}-${Date.now()}${ext}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 5000 }, // 5GB ceiling
});

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(",") ?? [
      "http://localhost:8080",
      "http://localhost:5173",
    ],
    credentials: true,
  })
);
app.use(express.json({ limit: "5gb" }));
app.use(express.urlencoded({ limit: "5gb", extended: true }));

// Serve uploads with proper video MIME types and streaming support
app.use("/uploads", (req, res, next) => {
  const filePath = path.join(uploadDir, req.path);
  const ext = path.extname(filePath).toLowerCase();

  // Set proper MIME types for video files
  const mimeTypes: { [key: string]: string } = {
    ".mp4": "video/mp4",
    ".mkv": "video/x-matroska",
    ".webm": "video/webm",
    ".avi": "video/x-msvideo",
    ".mov": "video/quicktime",
    ".flv": "video/x-flv",
    ".wmv": "video/x-ms-wmv",
    ".m4v": "video/x-m4v",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".gif": "image/gif",
  };

  if (mimeTypes[ext]) {
    res.setHeader("Content-Type", mimeTypes[ext]);
  }

  // Enable range requests for video streaming
  res.setHeader("Accept-Ranges", "bytes");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Range");

  next();
}, express.static(uploadDir));

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  const originalSend = res.send;

  res.send = function (data) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;
    const method = req.method;
    const url = req.originalUrl;
    const timestamp = new Date().toISOString();

    console.log(
      `[${timestamp}] ${method} ${url} - ${statusCode} (${duration}ms)`
    );

    return originalSend.call(this, data);
  };

  next();
});

type AuthenticatedRequest = Request & { userId?: string };

const sanitizeUser = (
  user: typeof users.$inferSelect,
  roles: string[]
) => ({
  id: user.id,
  email: user.email,
  username: user.username ?? "",
  roles,
});

const generateToken = (userId: string) =>
  jwt.sign({ userId }, jwtSecret, { expiresIn: "7d" });

const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const bearer = req.headers.authorization?.replace("Bearer ", "");
  const token = bearer || (req.headers["x-auth-token"] as string | undefined);

  if (!token) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const payload = jwt.verify(token, jwtSecret) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const getUserWithRoles = (userId: string) => {
  const user =
    db.select().from(users).where(eq(users.id, userId)).all()[0] ?? null;
  if (!user) return null;

  const rolesRows = db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .all();

  return { user, roles: rolesRows.map((r) => r.role) };
};

const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });

  const data = getUserWithRoles(req.userId);
  if (!data) return res.status(401).json({ error: "Unauthorized" });

  const isAdmin = data.roles.includes("admin");
  if (!isAdmin) return res.status(403).json({ error: "Admin access required" });

  next();
};

const generateRoomCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

app.get("/health", (_req, res) => res.json({ ok: true }));

app.post(`${apiBase}/auth/signup`, (req, res) => {
  const { email, password, username } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const existing = db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .all()[0];

  if (existing) {
    return res.status(400).json({ error: "Email already registered" });
  }

  const userId = randomUUID();
  const passwordHash = bcrypt.hashSync(password, 10);
  const now = new Date();

  db.insert(users)
    .values({
      id: userId,
      email,
      passwordHash,
      username: username || email.split("@")[0],
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(userRoles)
    .values({ id: randomUUID(), userId, role: "user" })
    .run();

  const hasAdmin =
    db
      .select()
      .from(userRoles)
      .where(eq(userRoles.role, "admin"))
      .all().length > 0;

  if (!hasAdmin) {
    db.insert(userRoles)
      .values({ id: randomUUID(), userId, role: "admin" })
      .run();
  }

  const roles = hasAdmin ? ["user"] : ["user", "admin"];

  return res.json({
    token: generateToken(userId),
    user: sanitizeUser(
      {
        id: userId,
        email,
        passwordHash,
        username: username || email.split("@")[0],
        createdAt: now,
        updatedAt: now,
      },
      roles
    ),
  });
});

app.post(`${apiBase}/auth/login`, (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const user =
    db.select().from(users).where(eq(users.email, email)).all()[0] ?? null;

  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const valid = bcrypt.compareSync(password, user.passwordHash);
  if (!valid) return res.status(401).json({ error: "Invalid credentials" });

  const roles = db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, user.id))
    .all()
    .map((r) => r.role);

  return res.json({
    token: generateToken(user.id),
    user: sanitizeUser(user, roles),
  });
});

app.get(`${apiBase}/auth/me`, authMiddleware, (req: AuthenticatedRequest, res) => {
  if (!req.userId) return res.status(401).json({ error: "Unauthorized" });

  const data = getUserWithRoles(req.userId);
  if (!data) return res.status(401).json({ error: "Unauthorized" });

  return res.json({ user: sanitizeUser(data.user, data.roles) });
});

app.post(`${apiBase}/rooms`, (req, res) => {
  const { username } = req.body;
  if (!username?.trim()) {
    return res.status(400).json({ error: "Username is required" });
  }

  let code = generateRoomCode();
  let attempts = 0;
  while (
    db.select().from(rooms).where(eq(rooms.code, code)).all()[0] &&
    attempts < 5
  ) {
    code = generateRoomCode();
    attempts += 1;
  }

  const roomId = randomUUID();
  const now = new Date();

  db.insert(rooms)
    .values({
      id: roomId,
      code,
      playbackPosition: 0,
      isPlaying: false,
      subtitleEnabled: false,
      createdAt: now,
      updatedAt: now,
    })
    .run();

  db.insert(roomParticipants)
    .values({
      id: randomUUID(),
      roomId,
      username: username.trim(),
      joinedAt: now,
    })
    .run();

  const room =
    db.select().from(rooms).where(eq(rooms.id, roomId)).all()[0] ?? null;

  return res.json({ room, code });
});

app.post(`${apiBase}/rooms/:code/join`, (req, res) => {
  const { username } = req.body;
  const { code } = req.params;

  if (!username?.trim()) {
    return res.status(400).json({ error: "Username is required" });
  }

  const room =
    db.select().from(rooms).where(eq(rooms.code, code)).all()[0] ?? null;

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const now = new Date();

  db.insert(roomParticipants)
    .values({
      id: randomUUID(),
      roomId: room.id,
      username: username.trim(),
      joinedAt: now,
    })
    .run();

  return res.json({ room });
});

app.get(`${apiBase}/rooms/:code`, (req, res) => {
  const { code } = req.params;

  const room =
    db.select().from(rooms).where(eq(rooms.code, code)).all()[0] ?? null;

  if (!room) {
    return res.status(404).json({ error: "Room not found" });
  }

  const participants = db
    .select()
    .from(roomParticipants)
    .where(eq(roomParticipants.roomId, room.id))
    .all();

  return res.json({ room, participants });
});

app.put(`${apiBase}/rooms/:id`, (req, res) => {
  const { id } = req.params;
  const updates: {
    video_url?: string;
    playback_position?: number;
    is_playing?: boolean;
    subtitle_enabled?: boolean;
  } = req.body ?? {};

  const room =
    db.select().from(rooms).where(eq(rooms.id, id)).all()[0] ?? null;

  if (!room) return res.status(404).json({ error: "Room not found" });

  const payload: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (typeof updates.video_url === "string") payload.videoUrl = updates.video_url;
  if (typeof updates.playback_position === "number")
    payload.playbackPosition = updates.playback_position;
  if (typeof updates.is_playing === "boolean")
    payload.isPlaying = updates.is_playing;
  if (typeof updates.subtitle_enabled === "boolean")
    payload.subtitleEnabled = updates.subtitle_enabled;

  db.update(rooms).set(payload).where(eq(rooms.id, id)).run();

  const refreshed =
    db.select().from(rooms).where(eq(rooms.id, id)).all()[0] ?? null;

  return res.json({ room: refreshed });
});

app.get(`${apiBase}/rooms/:id/participants`, (req, res) => {
  const { id } = req.params;

  const participants = db
    .select()
    .from(roomParticipants)
    .where(eq(roomParticipants.roomId, id))
    .all();

  return res.json({ participants });
});

app.get(`${apiBase}/media`, (_req, res) => {
  const files = db.select().from(mediaFiles).orderBy(desc(mediaFiles.createdAt)).all();
  return res.json({ media: files });
});

app.post(
  `${apiBase}/media`,
  authMiddleware,
  requireAdmin,
  upload.single("file"),
  async (req: AuthenticatedRequest, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "File is required" });
    }

    const { title, description, externalApiUrl } = req.body;
    if (!title?.trim()) {
      return res.status(400).json({ error: "Title is required" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;
    const now = new Date();
    const mediaId = randomUUID();

    // Fetch metadata from OMDB if title is provided
    let metadata = null;
    if (title?.trim()) {
      metadata = await fetchOmdbMetadata(title.trim());
    }

    // Cache poster image locally if available
    let cachedPosterUrl = null;
    if (metadata?.posterUrl) {
      cachedPosterUrl = await cachePosterImage(metadata.posterUrl, mediaId);
    }

    db.insert(mediaFiles)
      .values({
        id: mediaId,
        title: title.trim(),
        description: description?.trim() || metadata?.description || null,
        fileUrl,
        fileType: req.file.mimetype || "unknown",
        fileSize: req.file.size,
        uploadedBy: req.userId!,
        externalApiUrl: externalApiUrl || metadata?.externalApiUrl || null,
        posterUrl: cachedPosterUrl || metadata?.posterUrl || null,
        imdbId: metadata?.imdbId || null,
        releaseYear: metadata?.releaseYear || null,
        rating: metadata?.rating || null,
        genre: metadata?.genre || null,
        director: metadata?.director || null,
        actors: metadata?.actors || null,
        createdAt: now,
        updatedAt: now,
      })
      .run();

    return res.json({ fileUrl, metadata });
  }
);

app.delete(`${apiBase}/media/:id`, authMiddleware, requireAdmin, (req, res) => {
  const { id } = req.params;

  const file =
    db.select().from(mediaFiles).where(eq(mediaFiles.id, id)).all()[0] ?? null;

  if (!file) {
    return res.status(404).json({ error: "Media not found" });
  }

  if (file.fileUrl.startsWith("/uploads/")) {
    const filepath = path.join(process.cwd(), "server", file.fileUrl.replace("/uploads/", "uploads/"));
    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
    }
  }

  db.delete(mediaFiles).where(eq(mediaFiles.id, id)).run();

  return res.json({ success: true });
});

// WebSocket management
interface RoomConnection {
  ws: WebSocket;
  roomCode: string;
  username: string;
}

const connections = new Map<WebSocket, RoomConnection>();
const roomConnections = new Map<string, Set<WebSocket>>();

const broadcastToRoom = (roomCode: string, message: unknown, excludeWs?: WebSocket) => {
  const clients = roomConnections.get(roomCode);
  if (!clients) return;

  const payload = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
      client.send(payload);
    }
  });
};

// Create HTTP server
const server = createServer(app);

// Create WebSocket server with noServer option to handle upgrade manually
const wss = new WebSocketServer({ noServer: true });

// Handle WebSocket upgrade
server.on("upgrade", (request, socket, head) => {
  if (request.url === "/ws") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

wss.on("connection", (ws: WebSocket) => {
  ws.on("message", (data: string) => {
    try {
      const message = JSON.parse(data);
      const { type, roomCode, username, payload } = message;

      if (type === "join") {
        const conn: RoomConnection = { ws, roomCode, username };
        connections.set(ws, conn);

        if (!roomConnections.has(roomCode)) {
          roomConnections.set(roomCode, new Set());
        }
        roomConnections.get(roomCode)!.add(ws);

        // Broadcast user joined
        broadcastToRoom(roomCode, {
          type: "user_joined",
          username,
        });
      } else if (type === "room_update") {
        const conn = connections.get(ws);
        if (conn) {
          // Broadcast room state update to all users in the room
          broadcastToRoom(conn.roomCode, {
            type: "room_update",
            payload,
          });
        }
      } else if (type === "seek") {
        const conn = connections.get(ws);
        if (conn) {
          // Broadcast seek event to all users in the room
          broadcastToRoom(conn.roomCode, {
            type: "seek",
            position: payload.position,
            username,
          });
        }
      }
    } catch (error) {
      console.error("WebSocket message error:", error);
    }
  });

  ws.on("close", () => {
    const conn = connections.get(ws);
    if (conn) {
      const clients = roomConnections.get(conn.roomCode);
      if (clients) {
        clients.delete(ws);
        if (clients.size === 0) {
          roomConnections.delete(conn.roomCode);
        }
      }
      connections.delete(ws);

      // Broadcast user left
      broadcastToRoom(conn.roomCode, {
        type: "user_left",
        username: conn.username,
      });
    }
  });

  ws.on("error", (error) => {
    console.error("WebSocket error:", error);
  });
});

server.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});
