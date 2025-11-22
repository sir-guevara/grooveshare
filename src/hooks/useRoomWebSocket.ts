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
}

export const useRoomWebSocket = (
  roomCode: string | undefined,
  username: string | undefined,
  onRoomUpdate: (payload: RoomUpdatePayload) => void,
  onSeek: (position: number, username: string) => void,
  onUserJoined: (username: string) => void,
  onUserLeft: (username: string) => void
) => {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Store callbacks in refs to avoid dependency issues
  const callbacksRef = useRef({ onRoomUpdate, onSeek, onUserJoined, onUserLeft });

  useEffect(() => {
    callbacksRef.current = { onRoomUpdate, onSeek, onUserJoined, onUserLeft };
  }, [onRoomUpdate, onSeek, onUserJoined, onUserLeft]);

  const connect = useCallback(() => {
    if (!roomCode || !username) return;

    // Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const hostname = window.location.hostname;
    const port = window.location.port;
    const wsUrl = `${protocol}//${hostname}${port ? `:${port}` : ""}/ws`;

    try {
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected");
        // Send join message
        wsRef.current?.send(
          JSON.stringify({
            type: "join",
            roomCode,
            username,
          })
        );
      };

      wsRef.current.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === "room_update") {
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
  }, [roomCode, username]);

  const sendRoomUpdate = useCallback((payload: RoomUpdatePayload) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "room_update",
          roomCode,
          username,
          payload,
        })
      );
    }
  }, [roomCode, username]);

  const sendSeek = useCallback((position: number) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "seek",
          roomCode,
          username,
          payload: { position },
        })
      );
    }
  }, [roomCode, username]);

  useEffect(() => {
    if (!roomCode || !username) return;

    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      // Don't close on unmount if still connected - let server handle cleanup
    };
  }, [roomCode, username]);

  return { sendRoomUpdate, sendSeek };
};

