import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface JoinRoomModalProps {
  isOpen: boolean;
  roomCode: string;
  onJoin: (username: string) => Promise<void>;
  isLoading?: boolean;
}

export const JoinRoomModal = ({
  isOpen,
  roomCode,
  onJoin,
  isLoading = false,
}: JoinRoomModalProps) => {
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!username.trim()) {
      setError("Please enter a username");
      return;
    }

    try {
      await onJoin(username.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room");
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Join Room</DialogTitle>
          <DialogDescription>
            Enter your name to join the room. The host will need to approve your request.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Your Name</label>
            <Input
              placeholder="Enter your name"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              disabled={isLoading}
              autoFocus
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            disabled={isLoading || !username.trim()}
            className="w-full shadow-glow-primary"
          >
            {isLoading ? "Joining..." : "Join Room"}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Room Code: <span className="font-mono font-semibold">{roomCode}</span>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

