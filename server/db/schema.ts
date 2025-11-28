import { sql } from "drizzle-orm";
import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  username: text("username"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const userRoles = sqliteTable("user_roles", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  role: text("role").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const rooms = sqliteTable("rooms", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  videoUrl: text("video_url"),
  playbackPosition: real("playback_position").notNull().default(0),
  isPlaying: integer("is_playing", { mode: "boolean" })
    .notNull()
    .default(false),
  subtitleEnabled: integer("subtitle_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const roomParticipants = sqliteTable("room_participants", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(), // Unique ID based on IP + browser
  username: text("username").notNull(),
  isHost: integer("is_host", { mode: "boolean" })
    .notNull()
    .default(false),
  status: text("status").notNull().default("active"), // active, left, rejected
  joinedAt: integer("joined_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  leftAt: integer("left_at", { mode: "timestamp" }),
});

export const roomJoinRequests = sqliteTable("room_join_requests", {
  id: text("id").primaryKey(),
  roomId: text("room_id")
    .notNull()
    .references(() => rooms.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(), // Unique ID based on IP + browser
  username: text("username").notNull(),
  browserName: text("browser_name"),
  browserVersion: text("browser_version"),
  ipAddress: text("ip_address"),
  status: text("status").notNull().default("pending"), // pending, approved, rejected
  requestedAt: integer("requested_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  respondedAt: integer("responded_at", { mode: "timestamp" }),
});

export const mediaFiles = sqliteTable("media_files", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  fileUrl: text("file_url").notNull(),
  fileType: text("file_type").notNull(),
  fileSize: integer("file_size"),
  uploadedBy: text("uploaded_by")
    .notNull()
    .references(() => users.id),
  // External API metadata
  externalApiUrl: text("external_api_url"), // IMDB, TMDB, etc. link
  posterUrl: text("poster_url"), // Cached poster image URL
  imdbId: text("imdb_id"), // IMDB ID for reference
  releaseYear: integer("release_year"),
  rating: text("rating"), // e.g., "PG-13", "R"
  genre: text("genre"), // Comma-separated genres
  director: text("director"),
  actors: text("actors"), // Comma-separated actors
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
