import { useEffect, useRef, useCallback } from "react";

interface RoomUpdatePayload {
  video_url?: string;
  playback_position?: number;
  is_playing?: boolean;
  subtitle_enabled?: boolean;
}

interface WebSocketMessage {
  type: string;
  payload?: any;
  position?: number;
  username?: string;
  userId?: string;
  status?: "pending" | "approved" | "rejected" | "active";
}

export const useRoomWebSocket = (
  roomCode: string | undefined,
  userId: string | undefined,
  username: string | undefined,
  onRoomUpdate: (payload: RoomUpdatePayload) => void,
  onSeek: (position: number, username: string) => void,
  onUserJoined: (username: string) => void,
  onUserLeft: (username: string) => void,
  onApprovalStatusChange?: (status: "pending" | "approved" | "rejected" | "active") => void
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store callbacks in refs to avoid dependency issues
  const callbacksRef = useRef({ onRoomUpdate, onSeek, onUserJoined, onUserLeft, onApprovalStatusChange });

  useEffect(() => {
    callbacksRef.current = { onRoomUpdate, onSeek, onUserJoined, onUserLeft, onApprovalStatusChange };
  }, [onRoomUpdate, onSeek, onUserJoined, onUserLeft, onApprovalStatusChange]);

  const connect = useCallback(() => {
    if (!roomCode || !userId || !username) return;

    // Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const hostname = window.location.hostname;
    const isDev = window.location.port === "8080";
    const wsPort = isDev ? "4000" : window.location.port;
    const wsUrl = `${protocol}//${hostname}${wsPort ? `:${wsPort}` : ""}/ws`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        // Send join message
        wsRef.current?.send(
          JSON.stringify({
            type: "join",
            roomCode,
            userId,
            username,
          })
        );
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === "approval_status") {
            // User approval status changed
            if (message.userId === userId && callbacksRef.current.onApprovalStatusChange) {
              callbacksRef.current.onApprovalStatusChange(message.status || "pending");
            }
          } else if (message.type === "room_state") {
            // New user joining - receive current room state
            callbacksRef.current.onRoomUpdate(message.payload);
          } else if (message.type === "room_update") {
            callbacksRef.current.onRoomUpdate(message.payload);
          } else if (message.type === "seek") {
            callbacksRef.current.onSeek(message.position || 0, message.username || "Unknown");
          } else if (message.type === "user_joined") {
            callbacksRef.current.onUserJoined(message.username || "Unknown");
          } else if (message.type === "user_left") {
            callbacksRef.current.onUserLeft(message.username || "Unknown");
          }
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected, attempting to reconnect...");
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, 3000);
      };
    } catch (error) {
      console.error("Failed to create WebSocket:", error);
    }
  }, [roomCode, userId, username]);

  const sendRoomUpdate = useCallback((payload: RoomUpdatePayload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "room_update",
          roomCode,
          userId,
          username,
          payload,
        })
      );
    }
  }, [roomCode, userId, username]);

  const sendSeek = useCallback((position: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "seek",
          roomCode,
          userId,
          username,
          payload: { position },
        })
      );
    }
  }, [roomCode, userId, username]);

  useEffect(() => {
    if (!roomCode || !userId || !username) return;

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Don't close on unmount if still connected - let server handle cleanup
    };
  }, [roomCode, userId, username]);

  return { sendRoomUpdate, sendSeek };
};

