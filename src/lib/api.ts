const API_BASE = import.meta.env.VITE_API_URL || "/api";
const TOKEN_KEY = "watchparty_token";

const getToken = () => localStorage.getItem(TOKEN_KEY);
const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
const clearToken = () => localStorage.removeItem(TOKEN_KEY);

type RequestInitWithBody = Omit<RequestInit, "body"> & {
  body?: any;
  rawBody?: BodyInit;
};

const request = async <T>(
  path: string,
  options: RequestInitWithBody = {}
): Promise<T> => {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.rawBody instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] ?? "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    body:
      options.rawBody ||
      (options.body && headers["Content-Type"] === "application/json"
        ? JSON.stringify(options.body)
        : (options.body as BodyInit)),
  });

  if (!res.ok) {
    const message = (await res.json().catch(() => ({} as { error?: string })))
      .error;
    throw new Error(message || "Request failed");
  }

  return res.json() as Promise<T>;
};

export const api = {
  getToken,
  setToken,
  clearToken,
  async signup(email: string, password: string, username: string) {
    const data = await request<{ token: string; user: any }>("/auth/signup", {
      method: "POST",
      body: { email, password, username },
    });
    setToken(data.token);
    return data.user;
  },
  async login(email: string, password: string) {
    const data = await request<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: { email, password },
    });
    setToken(data.token);
    return data.user;
  },
  async currentUser() {
    return request<{ user: any }>("/auth/me", { method: "GET" });
  },
  logout() {
    clearToken();
  },
  async createRoom(username: string) {
    return request<{ room: any; code: string }>("/rooms", {
      method: "POST",
      body: { username },
    });
  },
  async joinRoom(code: string, username: string) {
    return request<{ room: any }>(`/rooms/${code}/join`, {
      method: "POST",
      body: { username },
    });
  },
  async getRoomWithParticipants(code: string) {
    return request<{ room: any; participants: any[] }>(`/rooms/${code}`, {
      method: "GET",
    });
  },
  async updateRoom(
    id: string,
    updates: Partial<{
      video_url: string;
      playback_position: number;
      is_playing: boolean;
      subtitle_enabled: boolean;
    }>
  ) {
    return request<{ room: any }>(`/rooms/${id}`, {
      method: "PUT",
      body: updates,
    });
  },
  async listParticipants(roomId: string) {
    return request<{ participants: any[] }>(`/rooms/${roomId}/participants`);
  },
  async listMedia() {
    return request<{ media: any[] }>("/media", { method: "GET" });
  },
  async uploadMedia(
    file: File,
    payload: { title: string; description?: string },
    onProgress?: (progress: { loaded: number; total: number; percentage: number; eta: number }) => void
  ) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", payload.title);
    if (payload.description) formData.append("description", payload.description);

    return new Promise<{ fileUrl: string }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const token = getToken();

      // Track upload progress
      if (onProgress) {
        let startTime = Date.now();
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const loaded = e.loaded;
            const total = e.total;
            const percentage = Math.round((loaded / total) * 100);
            const elapsed = (Date.now() - startTime) / 1000; // seconds
            const speed = loaded / elapsed; // bytes per second
            const remaining = total - loaded;
            const eta = Math.round(remaining / speed); // seconds

            onProgress({ loaded, total, percentage, eta });
          }
        });
      }

      xhr.addEventListener("load", () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve(response);
          } catch (e) {
            reject(new Error("Failed to parse response"));
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText);
            reject(new Error(error.error || "Upload failed"));
          } catch {
            reject(new Error("Upload failed"));
          }
        }
      });

      xhr.addEventListener("error", () => {
        reject(new Error("Upload failed"));
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload cancelled"));
      });

      xhr.open("POST", `${API_BASE}/media`);
      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  },
  async deleteMedia(id: string) {
    return request<{ success: boolean }>(`/media/${id}`, { method: "DELETE" });
  },
};
