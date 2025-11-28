import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { useRoomWebSocket } from "@/hooks/useRoomWebSocket";

const Lobby = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "active">("pending");
  const [username, setUsername] = useState("");
  const [userId, setUserId] = useState("");

  useEffect(() => {
    const storedUsername = localStorage.getItem("pendingUsername");
    const storedUserId = localStorage.getItem("userId");

    if (!storedUsername || !storedUserId || !code) {
      // No pending request context – send the user home
      navigate("/");
      return;
    }

    setUsername(storedUsername);
    setUserId(storedUserId);
  }, [code, navigate]);

  const handleApprovalStatusChange = (
    newStatus: "pending" | "approved" | "rejected" | "active"
  ) => {
    if (newStatus === "active") {
      setStatus("approved");
      toast({
        title: "Approved!",
        description: "You've been approved to join the room.",
      });
      // Clear pending room code but keep username/userId for the room
      localStorage.removeItem("pendingRoomCode");
      setTimeout(() => {
        if (code) {
          navigate(`/room/${code}`);
        }
      }, 1000);
    } else if (newStatus === "rejected") {
      setStatus("rejected");
      toast({
        title: "Request Rejected",
        description: "The host declined your request.",
        variant: "destructive",
      });
      localStorage.removeItem("pendingRoomCode");
      localStorage.removeItem("pendingUsername");
    } else {
      setStatus(newStatus);
    }
  };

  useRoomWebSocket(
    code || "",
    userId,
    username,
    () => {},
    () => {},
    () => {},
    () => {},
    handleApprovalStatusChange
  );

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-md">
        <div className="backdrop-blur-glass bg-card/60 rounded-xl sm:rounded-2xl p-4 sm:p-8 border border-border/50 text-center space-y-4 sm:space-y-6">
          {status === "pending" && (
            <>
              <div className="inline-flex items-center justify-center w-14 sm:w-16 h-14 sm:h-16 rounded-full bg-primary/20 animate-pulse">
                <Clock className="w-7 sm:w-8 h-7 sm:h-8 text-primary" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Waiting for Approval</h1>
                <p className="text-xs sm:text-sm text-muted-foreground px-2">
                  The host is reviewing your request to join room <span className="font-semibold text-primary">{code}</span>
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-xs sm:text-sm text-muted-foreground">Joining as: <span className="font-semibold text-foreground">{username}</span></p>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                  <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
                </div>
              </div>
              <Button
                variant="outline"
                onClick={() => {
                  localStorage.removeItem("pendingRoomCode");
                  localStorage.removeItem("pendingUsername");
                  navigate("/");
                }}
                className="w-full text-sm sm:text-base"
              >
                Cancel
              </Button>
            </>
          )}

          {status === "approved" && (
            <>
              <div className="inline-flex items-center justify-center w-14 sm:w-16 h-14 sm:h-16 rounded-full bg-green-500/20">
                <CheckCircle className="w-7 sm:w-8 h-7 sm:h-8 text-green-500" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Approved!</h1>
                <p className="text-xs sm:text-sm text-muted-foreground px-2">You've been approved to join the room. Redirecting...</p>
              </div>
            </>
          )}

          {status === "rejected" && (
            <>
              <div className="inline-flex items-center justify-center w-14 sm:w-16 h-14 sm:h-16 rounded-full bg-red-500/20">
                <XCircle className="w-7 sm:w-8 h-7 sm:h-8 text-red-500" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Request Rejected</h1>
                <p className="text-xs sm:text-sm text-muted-foreground px-2">The host declined your request to join the room.</p>
              </div>
              <Button
                onClick={() => {
                  localStorage.removeItem("pendingRoomCode");
                  localStorage.removeItem("pendingUsername");
                  navigate("/");
                }}
                className="w-full text-sm sm:text-base"
              >
                Back to Home
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;

