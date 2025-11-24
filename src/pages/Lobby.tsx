import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Clock, CheckCircle, XCircle } from "lucide-react";
import { api } from "@/lib/api";

const Lobby = () => {
  const { code } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [username, setUsername] = useState("");
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    const storedUsername = localStorage.getItem("pendingUsername");
    if (storedUsername) {
      setUsername(storedUsername);
    }
  }, []);

  useEffect(() => {
    if (!code || status !== "pending") return;

    const checkStatus = async () => {
      setIsChecking(true);
      try {
        const result = await api.getJoinRequests(code);
        const request = result.requests.find((r: any) => r.username === username);

        if (request) {
          if (request.status === "approved") {
            setStatus("approved");
            toast({
              title: "Approved!",
              description: "You've been approved to join the room.",
            });
            setTimeout(() => {
              localStorage.removeItem("pendingRoomCode");
              localStorage.removeItem("pendingUsername");
              navigate(`/room/${code}`);
            }, 1500);
          } else if (request.status === "rejected") {
            setStatus("rejected");
            toast({
              title: "Request Rejected",
              description: "The host declined your request.",
              variant: "destructive",
            });
          }
        }
      } catch (error) {
        console.error("Error checking status:", error);
      } finally {
        setIsChecking(false);
      }
    };

    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [code, username, status, navigate, toast]);

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

