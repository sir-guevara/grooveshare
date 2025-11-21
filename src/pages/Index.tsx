import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Film, Users, Play, Library, LogIn, UserPlus } from "lucide-react";
import { api } from "@/lib/api";

const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkAuthAndAdmin();
  }, []);

  const checkAuthAndAdmin = async () => {
    try {
      const { user } = await api.currentUser();
      setIsLoggedIn(true);
      setIsAdmin(user.roles?.includes("admin"));
    } catch (error) {
      setIsLoggedIn(false);
      setIsAdmin(false);
    }
  };

  const createRoom = async () => {
    if (!username.trim()) {
      toast({
        title: "Username required",
        description: "Please enter your name to create a room.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { code } = await api.createRoom(username.trim());

      toast({
        title: "Room created!",
        description: `Room code: ${code}`,
      });

      navigate(`/room/${code}`);
    } catch (error) {
      console.error("Error creating room:", error);
      toast({
        title: "Failed to create room",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const joinRoom = async () => {
    const trimmedUsername = username.trim();
    const normalizedCode = roomCode.trim().toUpperCase();

    if (!trimmedUsername || !normalizedCode) {
      toast({
        title: "Missing information",
        description: "Please enter both your name and a room code.",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      await api.joinRoom(normalizedCode, trimmedUsername);

      toast({
        title: "Joined room!",
        description: `Welcome to room ${normalizedCode}`,
      });

      navigate(`/room/${normalizedCode}`);
    } catch (error: any) {
      console.error("Error joining room:", error);
      toast({
        title: "Failed to join room",
        description:
          error instanceof Error
            ? error.message
            : "Please check the room code and try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero">
      {/* Header */}
      <header className="backdrop-blur-glass bg-card/60 border-b border-border/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img
            src="/logo.png"
            alt="GrooveShare logo"
            className="h-12 w-auto rounded-md"
          />

          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => navigate("/media")}
                  >
                    <Library className="h-4 w-4 mr-2" />
                    Media Library
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={async () => {
                    api.logout();
                    setIsLoggedIn(false);
                    setIsAdmin(false);
                    toast({
                      title: "Logged out",
                      description: "You've been logged out successfully.",
                    });
                  }}
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/login")}
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Login
                </Button>
                <Button
                  variant="default"
                  onClick={() => navigate("/signup")}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Sign Up
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center p-4 pt-20">
        <div className="w-full max-w-2xl space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Hero */}
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 shadow-glow-primary mb-4">
              <Film className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              GrooveShare
            </h1>
            <p className="text-xl text-muted-foreground max-w-md mx-auto">
              Watch movies and TV shows together in perfect sync with friends
            </p>
          </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="backdrop-blur-glass bg-card/40 rounded-xl p-4 border border-border/50 hover:border-primary/50 transition-all">
            <Play className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Synchronized Playback</h3>
            <p className="text-sm text-muted-foreground">Everyone plays and pauses together</p>
          </div>
          <div className="backdrop-blur-glass bg-card/40 rounded-xl p-4 border border-border/50 hover:border-primary/50 transition-all">
            <Users className="w-6 h-6 text-accent mb-2" />
            <h3 className="font-semibold mb-1">Watch with Friends</h3>
            <p className="text-sm text-muted-foreground">Invite unlimited participants</p>
          </div>
          <div className="backdrop-blur-glass bg-card/40 rounded-xl p-4 border border-border/50 hover:border-primary/50 transition-all">
            <Film className="w-6 h-6 text-primary mb-2" />
            <h3 className="font-semibold mb-1">Subtitle Support</h3>
            <p className="text-sm text-muted-foreground">Toggle subtitles for everyone</p>
          </div>
        </div>

        {/* Main Card */}
        <div className="backdrop-blur-glass bg-card/60 rounded-2xl p-8 border border-border/50 shadow-glow-primary space-y-6">
          {/* Username Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Your Name</label>
            <Input
              type="text"
              placeholder="Enter your name"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-input border-border focus:border-primary"
            />
          </div>

          {/* Create Room */}
          <div className="space-y-3">
            <Button
              onClick={createRoom}
              disabled={isCreating || !username.trim()}
              className="w-full h-12 text-lg shadow-glow-primary hover:shadow-glow-accent transition-all"
              size="lg"
            >
              {isCreating ? "Creating..." : "Create New Room"}
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border/50" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">Or join existing</span>
            </div>
          </div>

          {/* Join Room */}
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              joinRoom();
            }}
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Room Code</label>
              <Input
                type="text"
                placeholder="Enter room code"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="bg-input border-border focus:border-accent"
              />
            </div>
            <Button
              type="submit"
              disabled={isJoining}
              variant="secondary"
              className="w-full h-12 text-lg"
              size="lg"
            >
              {isJoining ? "Joining..." : "Join Room"}
            </Button>
          </form>
        </div>

          {/* Footer Note */}
          <p className="text-center text-sm text-muted-foreground">
            Free • No sign-up required • Works with any video URL
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
