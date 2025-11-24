import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Film, Users, Play, Library, LogIn, UserPlus } from "lucide-react";
import { api } from "@/lib/api";
import { detectBrowser } from "@/lib/browser-detect";

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
      setUsername(user.username || "");
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
      const browser = detectBrowser();
      const result = await api.joinRoom(normalizedCode, trimmedUsername, browser.name, browser.version);

      if (result.status === "pending") {
        toast({
          title: "Waiting for approval",
          description: "The host will review your request shortly.",
        });
        // Store the room code and username for polling
        localStorage.setItem("pendingRoomCode", normalizedCode);
        localStorage.setItem("pendingUsername", trimmedUsername);
        navigate(`/lobby/${normalizedCode}`);
      } else {
        toast({
          title: "Joined room!",
          description: `Welcome to room ${normalizedCode}`,
        });
        navigate(`/room/${normalizedCode}`);
      }
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
      <header className="backdrop-blur-glass bg-card/60 border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-3 sm:px-4 py-3 sm:py-4 flex items-center justify-between">
          <img
            src="/logo.png"
            alt="GrooveShare logo"
            className="h-8 sm:h-10 md:h-12 w-auto rounded-md"
          />

          <div className="flex items-center gap-1 sm:gap-2">
            {isLoggedIn ? (
              <>
                {isAdmin && (
                  <Button
                    variant="outline"
                    onClick={() => navigate("/media")}
                    size="sm"
                    className="hidden sm:flex text-xs sm:text-sm"
                  >
                    <Library className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Media Library</span>
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
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  <span className="hidden sm:inline">Logout</span>
                  <span className="sm:hidden">Out</span>
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/login")}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  <LogIn className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Login</span>
                </Button>
                <Button
                  variant="default"
                  onClick={() => navigate("/signup")}
                  size="sm"
                  className="text-xs sm:text-sm"
                >
                  <UserPlus className="h-3 sm:h-4 w-3 sm:w-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Sign Up</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="flex items-center justify-center p-3 sm:p-4 pt-12 sm:pt-20 min-h-screen">
        <div className="w-full max-w-6xl space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
          {/* Hero */}
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="inline-flex items-center justify-center w-16 sm:w-20 h-16 sm:h-20 rounded-full bg-primary/20 shadow-glow-primary mb-2 sm:mb-4">
              <Film className="w-8 sm:w-10 h-8 sm:h-10 text-primary" />
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary-glow to-accent bg-clip-text text-transparent">
              GrooveShare
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-md mx-auto px-2">
              Watch movies and TV shows together in perfect sync with friends
            </p>
          </div>

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="backdrop-blur-glass bg-card/40 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border/50 hover:border-primary/50 transition-all">
            <Play className="w-5 sm:w-6 h-5 sm:h-6 text-primary mb-2" />
            <h3 className="font-semibold text-sm sm:text-base mb-1">Synchronized Playback</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Everyone plays and pauses together</p>
          </div>
          <div className="backdrop-blur-glass bg-card/40 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border/50 hover:border-primary/50 transition-all">
            <Users className="w-5 sm:w-6 h-5 sm:h-6 text-accent mb-2" />
            <h3 className="font-semibold text-sm sm:text-base mb-1">Watch with Friends</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Invite unlimited participants</p>
          </div>
          <div className="backdrop-blur-glass bg-card/40 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-border/50 hover:border-primary/50 transition-all">
            <Film className="w-5 sm:w-6 h-5 sm:h-6 text-primary mb-2" />
            <h3 className="font-semibold text-sm sm:text-base mb-1">Subtitle Support</h3>
            <p className="text-xs sm:text-sm text-muted-foreground">Toggle subtitles for everyone</p>
          </div>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
          {/* Join Room Card - First on mobile */}
          <div className="backdrop-blur-glass bg-card/60 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-border/50 shadow-glow-accent space-y-4 sm:space-y-6 order-first md:order-last">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
              <div className="inline-flex items-center justify-center w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-accent/20">
                <Users className="w-5 sm:w-6 h-5 sm:h-6 text-accent" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-foreground">Join Room</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Join an existing watch party</p>
              </div>
            </div>

            {/* Join Room Form */}
            <form
              className="space-y-3 sm:space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                joinRoom();
              }}
            >
              {isLoggedIn ? (
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-foreground">Your Name</label>
                  <div className="px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground">
                    {username}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="text-xs sm:text-sm font-medium text-foreground">Your Name</label>
                  <Input
                    type="text"
                    placeholder="Enter your name"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-input border-border focus:border-accent text-sm"
                  />
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-foreground">Room Code</label>
                <Input
                  type="text"
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  className="bg-input border-border focus:border-accent text-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={isJoining}
                variant="secondary"
                className="w-full h-10 sm:h-12 text-sm sm:text-base"
                size="lg"
              >
                {isJoining ? "Joining..." : "Join Room"}
              </Button>
            </form>
          </div>

          {/* Create Room Card - Second on mobile */}
          <div className="backdrop-blur-glass bg-card/60 rounded-xl sm:rounded-2xl p-4 sm:p-6 md:p-8 border border-border/50 shadow-glow-primary space-y-4 sm:space-y-6 order-last md:order-first">
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
              <div className="inline-flex items-center justify-center w-10 sm:w-12 h-10 sm:h-12 rounded-lg bg-primary/20">
                <Play className="w-5 sm:w-6 h-5 sm:h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-lg sm:text-2xl font-bold text-foreground">Create Room</h2>
                <p className="text-xs sm:text-sm text-muted-foreground">Start a new watch party</p>
              </div>
            </div>

            {/* Username Input */}
            {isLoggedIn ? (
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-foreground">Your Name</label>
                <div className="px-3 py-2 bg-input border border-border rounded-md text-sm text-foreground">
                  {username}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs sm:text-sm font-medium text-foreground">Your Name</label>
                <Input
                  type="text"
                  placeholder="Enter your name"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-input border-border focus:border-primary text-sm"
                />
              </div>
            )}

            {/* Create Room Button */}
            <Button
              onClick={createRoom}
              disabled={isCreating || !username.trim()}
              className="w-full h-10 sm:h-12 text-sm sm:text-base shadow-glow-primary hover:shadow-glow-accent transition-all"
              size="lg"
            >
              {isCreating ? "Creating..." : "Create New Room"}
            </Button>
          </div>
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs sm:text-sm text-muted-foreground px-2">
          Free • No sign-up required • Works with any video URL
        </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
