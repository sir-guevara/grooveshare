import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { api } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface JoinRequest {
  id: string;
  username: string;
  browserName: string;
  browserVersion: string;
  status: "pending" | "approved" | "rejected";
  requestedAt: string;
}

interface JoinRequestsPanelProps {
  roomCode: string;
}

const JoinRequestsPanel = ({ roomCode }: JoinRequestsPanelProps) => {
  const { toast } = useToast();
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const result = await api.getJoinRequests(roomCode);
      setRequests(result.requests || []);
    } catch (error) {
      console.error("Error fetching join requests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    const interval = setInterval(fetchRequests, 3000);
    return () => clearInterval(interval);
  }, [roomCode]);

  const handleApprove = async (requestId: string, username: string) => {
    try {
      await api.approveJoinRequest(roomCode, requestId);
      toast({
        title: "Approved",
        description: `${username} has been approved to join.`,
      });
      fetchRequests();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to approve request.",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (requestId: string, username: string) => {
    try {
      await api.rejectJoinRequest(roomCode, requestId);
      toast({
        title: "Rejected",
        description: `${username}'s request has been rejected.`,
      });
      fetchRequests();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject request.",
        variant: "destructive",
      });
    }
  };

  const pendingRequests = requests.filter((r) => r.status === "pending");

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className="backdrop-blur-glass bg-card/60 rounded-lg sm:rounded-xl p-3 sm:p-6 border border-border/50">
      <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
        <Clock className="h-4 sm:h-5 w-4 sm:w-5 text-primary" />
        Join Requests ({pendingRequests.length})
      </h3>

      <div className="space-y-2 sm:space-y-3">
        {pendingRequests.map((request) => (
          <div
            key={request.id}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 bg-background/50 rounded-lg border border-border/50 gap-3 sm:gap-2"
          >
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm sm:text-base text-foreground truncate">{request.username}</p>
              <p className="text-xs sm:text-sm text-muted-foreground truncate">
                {request.browserName} {request.browserVersion}
              </p>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                size="sm"
                variant="default"
                onClick={() => handleApprove(request.id, request.username)}
                className="gap-1 flex-1 sm:flex-none text-xs sm:text-sm"
              >
                <CheckCircle className="h-3 sm:h-4 w-3 sm:w-4" />
                <span className="hidden sm:inline">Approve</span>
                <span className="sm:hidden">OK</span>
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleReject(request.id, request.username)}
                className="gap-1 flex-1 sm:flex-none text-xs sm:text-sm"
              >
                <XCircle className="h-3 sm:h-4 w-3 sm:w-4" />
                <span className="hidden sm:inline">Reject</span>
                <span className="sm:hidden">No</span>
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default JoinRequestsPanel;

