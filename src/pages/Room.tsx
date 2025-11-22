import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Pause, Volume2, Subtitles, Users, Copy, Check, Maximize, Upload, Library } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useRoomWebSocket } from "@/hooks/useRoomWebSocket";
import VideoBrowser from "@/components/VideoBrowser";
import { api } from "@/lib/api";

interface RoomData {
  id: string;
  code: string;
  video_url: string | null;
  playback_position: number;
  is_playing: boolean;
  subtitle_enabled: boolean;
}

interface Participant {
  id: string;
  username: string;
}

const mapRoom = (data: any): RoomData => ({
  id: data.id,
  code: data.code,
  video_url: data.video_url ?? data.videoUrl ?? null,
  playback_position: Number(data.playback_position ?? data.playbackPosition ?? 0),
  is_playing: Boolean(data.is_playing ?? data.isPlaying),
  subtitle_enabled: Boolean(data.subtitle_enabled ?? data.subtitleEnabled),
});

const getMimeType = (url: string): string => {
  if (!url) return "video/mp4";
  const ext = url.split(".").pop()?.toLowerCase() || "";
  const mimeTypes: { [key: string]: string } = {
    mp4: "video/mp4",
    mkv: "video/x-matroska",
    webm: "video/webm",
    avi: "video/x-msvideo",
    mov: "video/quicktime",
    flv: "video/x-flv",
    wmv: "video/x-ms-wmv",
    m4v: "video/x-m4v",
  };
  return mimeTypes[ext] || "video/mp4";
};

const Room = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const videoRef = useRef<HTMLVideoElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [room, setRoom] = useState<RoomData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [localVideoUrl, setLocalVideoUrl] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [username, setUsername] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isSyncingRef = useRef(false);

  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const { user } = await api.currentUser();
        setIsAdmin(user.roles?.includes("admin"));
        setUsername(user.username || "Anonymous");
      } catch {
        setIsAdmin(false);
        setUsername("Anonymous");
      }
    };
    checkAdmin();
  }, []);

  // WebSocket handlers
  const handleRoomUpdate = (payload: any) => {
    setRoom((prev) =>
      prev
        ? {
            ...prev,
            video_url: payload.video_url ?? prev.video_url,
            playback_position: payload.playback_position ?? prev.playback_position,
            is_playing: payload.is_playing ?? prev.is_playing,
            subtitle_enabled: payload.subtitle_enabled ?? prev.subtitle_enabled,
          }
        : prev
    );

    // Sync video player
    if (videoRef.current) {
      if (payload.is_playing !== undefined) {
        if (payload.is_playing && videoRef.current.paused) {
          videoRef.current.play().catch((err) => {
            console.error("Video play() failed", err);
            toast({
              title: "Tap to start playback",
              description:
                "Your browser blocked autoplay. Tap the video once to start, then it will stay in sync.",
            });
          });
        } else if (!payload.is_playing && !videoRef.current.paused) {
          videoRef.current.pause();
        }
      }

      if (payload.playback_position !== undefined) {
        const timeDiff = Math.abs(videoRef.current.currentTime - payload.playback_position);
        if (timeDiff > 0.5) {
          isSyncingRef.current = true;
          videoRef.current.currentTime = payload.playback_position;
          setTimeout(() => {
            isSyncingRef.current = false;
          }, 100);
        }
      }
    }
  };

  const handleSeek = (position: number, seekUsername: string) => {
    if (videoRef.current) {
      isSyncingRef.current = true;
      videoRef.current.currentTime = position;
      setTimeout(() => {
        isSyncingRef.current = false;
      }, 100);
    }
  };

  const handleUserJoined = (newUsername: string) => {
    toast({
      title: "User joined",
      description: `${newUsername} joined the room.`,
    });
  };

  const handleUserLeft = (leftUsername: string) => {
    toast({
      title: "User left",
      description: `${leftUsername} left the room.`,
    });
  };

  const { sendRoomUpdate, sendSeek } = useRoomWebSocket(
    code,
    username,
    handleRoomUpdate,
    handleSeek,
    handleUserJoined,
    handleUserLeft
  );

  // Initial room fetch
  useEffect(() => {
    const fetchRoom = async () => {
      if (!code) return;

      try {
        const data = await api.getRoomWithParticipants(code);
        setRoom(mapRoom(data.room));
        setParticipants(data.participants);
        setIsLoading(false);
      } catch (error) {
        toast({
          title: "Room not found",
          description: "This room doesn't exist or has expired.",
          variant: "destructive",
        });
        navigate("/");
      }
    };

    fetchRoom();
  }, [code, navigate, toast]);

  // Handle video source changes
  useEffect(() => {
    if (!videoRef.current || !room?.video_url) return;

    // Reset video element to force reload
    videoRef.current.load();
    console.log("Video source changed, reloading:", room.video_url);
  }, [room?.video_url]);

  const updateRoomState = async (updates: Partial<RoomData>) => {
    if (!room) return;

    // Update local state immediately
    setRoom((prev) =>
      prev
        ? {
            ...prev,
            ...updates,
          }
        : prev
    );

    // Send update via WebSocket for real-time sync
    sendRoomUpdate({
      video_url: updates.video_url,
      playback_position: updates.playback_position,
      is_playing: updates.is_playing,
      subtitle_enabled: updates.subtitle_enabled,
    });

    // Also update on server for persistence
    await api.updateRoom(room.id, {
      video_url: updates.video_url,
      playback_position: updates.playback_position,
      is_playing: updates.is_playing,
      subtitle_enabled: updates.subtitle_enabled,
    });
  };

  const handlePlayPause = async () => {
    if (!room || !videoRef.current) return;

    const newPlayingState = !room.is_playing;

    // Update local video immediately for better UX
    if (newPlayingState) {
      videoRef.current.play().catch(() => {});
    } else {
      videoRef.current.pause();
    }

    // Update room state on server
    await updateRoomState({
      is_playing: newPlayingState,
      playback_position: videoRef.current.currentTime
    });
  };

  const handleSubtitles = () => {
    if (!room) return;
    updateRoomState({ subtitle_enabled: !room.subtitle_enabled });
  };

  const lastUpdateRef = useRef<number>(0);

  const handleVideoTimeUpdate = () => {
    if (!room || !videoRef.current || !room.is_playing || isSyncingRef.current) return;

    const currentTime = videoRef.current.currentTime;
    const now = Date.now();

    // Send updates every 500ms for smooth sync
    if (now - lastUpdateRef.current > 500) {
      lastUpdateRef.current = now;
      sendRoomUpdate({ playback_position: currentTime });
    }
  };

  const handleSetVideo = async () => {
    if (!room || !localVideoUrl.trim()) return;

    await updateRoomState({ 
      video_url: localVideoUrl,
      playback_position: 0,
      is_playing: false 
    });

    toast({
      title: "Video updated",
      description: "The video URL has been set for everyone.",
    });
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(code || "");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    toast({
      title: "Room code copied!",
      description: "Share this code with friends to watch together.",
    });
  };

  const handleFullscreen = () => {
    if (!videoRef.current) return;

    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      videoRef.current.requestFullscreen();
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !room) return;

    setUploading(true);

    try {
      const response = await api.uploadMedia(file, {
        title: file.name,
      });

      await updateRoomState({
        video_url: response.fileUrl,
        playback_position: 0,
        is_playing: false,
      });

      toast({
        title: "Video uploaded!",
        description: "The video is now ready to watch.",
      });
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading room...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="backdrop-blur-glass bg-card/60 border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img
              src="/logo.png"
              alt="GrooveShare logo"
              className="h-12 w-auto rounded-md"
            />
            <Badge
              variant="secondary" 
              className="cursor-pointer hover:bg-secondary/80 transition-all"
              onClick={copyRoomCode}
            >
              <span className="mr-2">Room: {code}</span>
              {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              {participants.length}
            </Badge>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Video Player */}
          <div className="relative rounded-xl overflow-hidden bg-black shadow-glow-primary">
            {room?.video_url ? (
              <div className="aspect-video">
                <video
                  ref={videoRef}
                  key={room.video_url}
                  className="w-full h-full"
                  onTimeUpdate={handleVideoTimeUpdate}
                  onSeeked={() => {
                    if (videoRef.current && !isSyncingRef.current) {
                      sendSeek(videoRef.current.currentTime);
                      updateRoomState({ playback_position: videoRef.current.currentTime });
                    }
                  }}
                  onError={(e) => {
                    const video = e.target as HTMLVideoElement;
                    const errorCode = video.error?.code;
                    const errorMessage = video.error?.message;
                    console.error("Video error:", { errorCode, errorMessage, url: room.video_url, mimeType: getMimeType(room.video_url) });
                  }}
                  onLoadedMetadata={() => {
                    console.log("Video metadata loaded:", { url: room.video_url, duration: videoRef.current?.duration });
                  }}
                  playsInline
                  controls
                  crossOrigin="anonymous"
                  preload="metadata"
                >
                  <source src={room.video_url} type={getMimeType(room.video_url)} />
                  Your browser does not support the video tag.
                </video>
              </div>
            ) : (
              <div className="aspect-video flex items-center justify-center bg-muted">
                <p className="text-muted-foreground">No video loaded. Set a video URL below.</p>
              </div>
            )}

            {/* Video Controls Overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    size="lg"
                    variant="default"
                    onClick={handlePlayPause}
                    className="shadow-glow-primary"
                  >
                    {room?.is_playing ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5 ml-0.5" />
                    )}
                  </Button>

                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={handleSubtitles}
                  >
                    <Subtitles className="h-5 w-5" />
                  </Button>

                  <Button size="lg" variant="secondary">
                    <Volume2 className="h-5 w-5" />
                  </Button>
                </div>

                <Button
                  size="lg"
                  variant="secondary"
                  onClick={handleFullscreen}
                >
                  <Maximize className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Video Source Selection */}
          <div className="backdrop-blur-glass bg-card/60 rounded-xl p-6 border border-border/50">
            <Tabs defaultValue="library" className="w-full">
              <TabsList className="w-full grid grid-cols-2">
                <TabsTrigger value="library" className="gap-2">
                  <Library className="h-4 w-4" />
                  Video Library
                </TabsTrigger>
                <TabsTrigger value="manual" className="gap-2">
                  <Upload className="h-4 w-4" />
                  Manual Upload
                </TabsTrigger>
              </TabsList>

              <TabsContent value="library" className="mt-4">
                <h3 className="text-lg font-semibold mb-4">Choose from Library</h3>
                <VideoBrowser roomId={room.id} onVideoSelected={() => {}} />
              </TabsContent>

              <TabsContent value="manual" className="mt-4">
                <h3 className="text-lg font-semibold mb-4">Upload or Enter URL</h3>
                
                {isAdmin && (
                  <div className="mb-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/*,.mkv,.mp4,.webm,.avi,.mov"
                      onChange={handleVideoUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      className="w-full mb-2 shadow-glow-primary"
                      variant="default"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? "Uploading..." : "Upload Video File (Admin)"}
                    </Button>
                  </div>
                )}

                <div className="flex gap-2">
                  <input
                    type="url"
                    placeholder="Enter video URL (MP4, MKV, WebM, etc.)"
                    value={localVideoUrl}
                    onChange={(e) => setLocalVideoUrl(e.target.value)}
                    className="flex-1 bg-input border border-border rounded-lg px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <Button onClick={handleSetVideo} className="shadow-glow-primary">
                    Set Video
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  {isAdmin ? "Upload a video file or enter a URL. " : ""}
                  Anyone in the room can set the video. Supports MP4, MKV, WebM, and more.
                </p>
              </TabsContent>
            </Tabs>
          </div>

          {/* Participants */}
          <div className="backdrop-blur-glass bg-card/60 rounded-xl p-6 border border-border/50">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Users className="h-5 w-5" />
              Watching Now ({participants.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {participants.map((participant) => (
                <Badge key={participant.id} variant="secondary">
                  {participant.username}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
