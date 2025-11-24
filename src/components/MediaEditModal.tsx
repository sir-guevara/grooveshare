import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface MediaEditModalProps {
  isOpen: boolean;
  media: {
    id: string;
    title: string;
    description: string | null;
    file_url?: string;
  } | null;
  isLoading: boolean;
  onClose: () => void;
  onSave: (title: string, description: string, file_url?: string) => Promise<void>;
}

export const MediaEditModal = ({
  isOpen,
  media,
  isLoading,
  onClose,
  onSave,
}: MediaEditModalProps) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [fileUrl, setFileUrl] = useState("");

  // Update form fields when media changes
  useEffect(() => {
    if (media) {
      setTitle(media.title || "");
      setDescription(media.description || "");
      setFileUrl(media.file_url || "");
    }
  }, [media, isOpen]);

  const handleSave = async () => {
    if (!title.trim()) {
      return;
    }
    await onSave(title, description, fileUrl);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edit Media</DialogTitle>
          <DialogDescription>
            Update the title and description for this media file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Title *</label>
            <Input
              placeholder="Enter media title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Description</label>
            <Textarea
              placeholder="Enter media description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">File URL</label>
            <Input
              placeholder="Enter media file URL (e.g., /uploads/video.mp4)"
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground mt-1">
              Update the file URL if you've moved or changed the video file location.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isLoading || !title.trim()}>
            {isLoading ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

