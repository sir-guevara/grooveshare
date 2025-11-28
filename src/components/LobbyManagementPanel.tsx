import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Clock, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface Participant {
  id: string;
  username: string;
  status: "active" | "left" | "rejected";
  isHost: boolean;
  joinedAt: string;
}

interface LobbyManagementPanelProps {
  roomCode: string;
}

export const LobbyManagementPanel = ({ roomCode }: LobbyManagementPanelProps) => {
  const { toast } = useToast();
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [participantsRes, requestsRes] = await Promise.all([
        api.getAllParticipants(roomCode),
        api.getJoinRequests(roomCode),
      ]);
      setParticipants(participantsRes.participants || []);
      setJoinRequests(requestsRes.requests || []);
    } catch (error) {
      console.error("Failed to load lobby data:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load lobby data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [roomCode]);

  const handleApprove = async (requestId: string) => {
    try {
      await api.approveJoinRequest(roomCode, requestId);
      toast({ title: "Approved", description: "User has been approved" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to approve", variant: "destructive" });
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await api.rejectJoinRequest(roomCode, requestId);
      toast({ title: "Rejected", description: "User request has been rejected" });
      fetchData();
    } catch (error) {
      toast({ title: "Error", description: "Failed to reject", variant: "destructive" });
    }
  };

  const pendingRequests = joinRequests.filter((r) => r.status === "pending");
  const activeParticipants = participants.filter((p) => p.status === "active" && !p.isHost);
  const rejectedParticipants = participants.filter((p) => p.status === "rejected");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Lobby Management</h2>
        <Button size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Pending Requests */}
      <Card className="backdrop-blur-glass bg-card/60 border-border/50 p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Pending Requests ({pendingRequests.length})
        </h3>
        <div className="space-y-2">
          {pendingRequests.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending requests</p>
          ) : (
            pendingRequests.map((req) => (
              <div key={req.id} className="flex items-center justify-between p-2 bg-background/50 rounded">
                <div>
                  <p className="font-medium text-sm">{req.username}</p>
                  <p className="text-xs text-muted-foreground">{req.browserName} {req.browserVersion}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => handleApprove(req.id)}>
                    <CheckCircle className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => handleReject(req.id)}>
                    <XCircle className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Active Participants */}
      <Card className="backdrop-blur-glass bg-card/60 border-border/50 p-4">
        <h3 className="font-semibold mb-3">Active Participants ({activeParticipants.length})</h3>
        <div className="space-y-2">
          {activeParticipants.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active participants</p>
          ) : (
            activeParticipants.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 bg-background/50 rounded">
                <p className="font-medium text-sm">{p.username}</p>
                <Badge variant="outline" className="bg-green-500/20 text-green-500">Active</Badge>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Rejected Users */}
      {rejectedParticipants.length > 0 && (
        <Card className="backdrop-blur-glass bg-card/60 border-border/50 p-4">
          <h3 className="font-semibold mb-3">Rejected Users ({rejectedParticipants.length})</h3>
          <div className="space-y-2">
            {rejectedParticipants.map((p) => (
              <div key={p.id} className="flex items-center justify-between p-2 bg-background/50 rounded">
                <p className="font-medium text-sm">{p.username}</p>
                <Badge variant="outline" className="bg-red-500/20 text-red-500">Rejected</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

