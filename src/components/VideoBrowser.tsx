import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Film, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface MediaFile {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  posterUrl?: string | null;
  releaseYear?: number | null;
  rating?: string | null;
}

interface VideoBrowserProps {
  roomId: string;
  onVideoSelected: () => void;
}

const VideoBrowser = ({ roomId, onVideoSelected }: VideoBrowserProps) => {
  const { toast } = useToast();
  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    fetchMediaFiles();
  }, []);

  const fetchMediaFiles = async () => {
    try {
      const { media } = await api.listMedia();
      setMediaFiles(
        media.map((file: any) => ({
          ...file,
          file_url: file.file_url ?? file.fileUrl,
          file_type: file.file_type ?? file.fileType,
          posterUrl: file.posterUrl ?? file.poster_url ?? null,
        }))
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVideo = async (file: MediaFile) => {
    setSelectedId(file.id);

    try {
      await api.updateRoom(roomId, {
        video_url: file.file_url,
        playback_position: 0,
        is_playing: false,
      });

      toast({
        title: "Video selected!",
        description: `Now playing: ${file.title}`,
      });

      onVideoSelected();
    } catch (error) {
      toast({
        title: "Failed to set video",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSelectedId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-pulse text-muted-foreground">Loading videos...</div>
      </div>
    );
  }

  if (mediaFiles.length === 0) {
    return (
      <div className="text-center py-8">
        <Film className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <p className="text-muted-foreground">No videos available in the library.</p>
        <p className="text-sm text-muted-foreground mt-2">
          An admin needs to upload videos first.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {mediaFiles.map((file) => (
        <Card
          key={file.id}
          className="backdrop-blur-glass bg-card/60 border-border/50 overflow-hidden hover:border-primary/50 transition-colors cursor-pointer"
          onClick={() => handleSelectVideo(file)}
        >
          <div className="aspect-video bg-black/50 flex items-center justify-center overflow-hidden">
            {file.posterUrl ? (
              <img
                src={file.posterUrl}
                alt={file.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <Film className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
          <div className="p-4">
            <h3 className="font-semibold mb-1 truncate">{file.title}</h3>
            {file.description && (
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                {file.description}
              </p>
            )}
            <Button
              variant="default"
              size="sm"
              className="w-full shadow-glow-primary"
              disabled={selectedId === file.id}
            >
              {selectedId === file.id ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Selected
                </>
              ) : (
                "Select Video"
              )}
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
};

export default VideoBrowser;
