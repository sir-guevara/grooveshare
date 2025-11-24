import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Upload, Trash2, Film, ArrowLeft, Edit2, RefreshCw } from "lucide-react";
import { api } from "@/lib/api";
import { MediaEditModal } from "@/components/MediaEditModal";

interface MediaFile {
  id: string;
  title: string;
  description: string | null;
  file_url: string;
  file_type: string;
  file_size: number | null;
  created_at: string;
  // IMDB metadata
  posterUrl?: string | null;
  imdbId?: string | null;
  releaseYear?: number | null;
  rating?: string | null;
  genre?: string | null;
  director?: string | null;
  actors?: string | null;
  externalApiUrl?: string | null;
}

const MediaLibrary = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mediaFiles, setMediaFiles] = useState<MediaFile[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    percentage: 0,
    loaded: 0,
    total: 0,
    eta: 0,
  });

  const [uploadForm, setUploadForm] = useState({
    title: "",
    description: "",
  });

  const [editingMedia, setEditingMedia] = useState<MediaFile | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isEditLoading, setIsEditLoading] = useState(false);
  const [resyncing, setResyncing] = useState<string | null>(null);

  useEffect(() => {
    checkAdminAndFetchFiles();
  }, []);

  const checkAdminAndFetchFiles = async () => {
    try {
      const { user } = await api.currentUser();
      const adminStatus = user.roles?.includes("admin");

      if (!adminStatus) {
        toast({
          title: "Access Denied",
          description: "Only admins can access the media library management.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      setIsAdmin(true);
      await fetchMediaFiles();
      setLoading(false);
    } catch {
      navigate("/login");
    }
  };

  const fetchMediaFiles = async () => {
    try {
      const { media } = await api.listMedia();
      setMediaFiles(
        media.map((file: any) => ({
          ...file,
          file_url: file.file_url ?? file.fileUrl,
          file_type: file.file_type ?? file.fileType,
          file_size: file.file_size ?? file.fileSize ?? null,
          created_at: file.created_at ?? file.createdAt,
        }))
      );
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch media files.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!uploadForm.title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for the video.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    setUploadProgress({ percentage: 0, loaded: 0, total: 0, eta: 0 });

    try {
      await api.uploadMedia(
        file,
        {
          title: uploadForm.title,
          description: uploadForm.description || undefined,
        },
        (progress) => {
          setUploadProgress({
            percentage: progress.percentage,
            loaded: progress.loaded,
            total: progress.total,
            eta: progress.eta,
          });
        }
      );

      toast({
        title: "Upload successful!",
        description: "Video has been added to the media library.",
      });

      setUploadForm({ title: "", description: "" });
      await fetchMediaFiles();
    } catch (error) {
      toast({
        title: "Upload failed",
        description: "Failed to upload video. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
      setUploadProgress({ percentage: 0, loaded: 0, total: 0, eta: 0 });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return;

    try {
      await api.deleteMedia(id);

      toast({
        title: "Deleted",
        description: "Video has been removed from the library.",
      });

      await fetchMediaFiles();
    } catch (error) {
      toast({
        title: "Delete failed",
        description: "Failed to delete video.",
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (media: MediaFile) => {
    setEditingMedia(media);
    setIsEditModalOpen(true);
  };

  const handleEditSave = async (title: string, description: string, file_url?: string) => {
    if (!editingMedia) return;

    setIsEditLoading(true);
    try {
      const payload: any = { title, description };
      if (file_url) {
        payload.file_url = file_url;
      }
      await api.updateMedia(editingMedia.id, payload);

      toast({
        title: "Updated",
        description: "Media information has been updated.",
      });

      await fetchMediaFiles();
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update media.",
        variant: "destructive",
      });
    } finally {
      setIsEditLoading(false);
    }
  };

  const handleResyncOMDB = async (id: string) => {
    setResyncing(id);
    try {
      await api.resyncMediaOMDB(id);

      toast({
        title: "Resynced",
        description: "OMDB metadata has been updated.",
      });

      await fetchMediaFiles();
    } catch (error) {
      toast({
        title: "Resync failed",
        description: "Failed to resync OMDB metadata.",
        variant: "destructive",
      });
    } finally {
      setResyncing(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="backdrop-blur-glass bg-card/60 border-b border-border/50 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Media Library
            </h1>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto space-y-6">
          {/* Upload Section */}
          <Card className="backdrop-blur-glass bg-card/60 border-border/50 p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Upload New Video
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Title *</label>
                <Input
                  placeholder="Enter video title"
                  value={uploadForm.title}
                  onChange={(e) => setUploadForm({ ...uploadForm, title: e.target.value })}
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Description</label>
                <Textarea
                  placeholder="Enter video description (optional)"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm({ ...uploadForm, description: e.target.value })}
                  rows={3}
                />
              </div>

              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,.mkv,.mp4,.webm,.avi,.mov"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-full shadow-glow-primary"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? "Uploading..." : "Select & Upload Video"}
                </Button>

                {/* Upload Progress */}
                {uploading && uploadProgress.total > 0 && (
                  <div className="mt-4 space-y-2">
                    <Progress value={uploadProgress.percentage} className="h-2" />
                    <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                      <div>
                        <p className="font-medium text-foreground">{uploadProgress.percentage}%</p>
                        <p className="text-xs">
                          {(uploadProgress.loaded / 1024 / 1024).toFixed(1)} MB / {(uploadProgress.total / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      <div>
                        <p className="font-medium text-foreground">
                          {uploadProgress.eta > 0 ? `${uploadProgress.eta}s` : "Calculating..."}
                        </p>
                        <p className="text-xs">Time remaining</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>

          {/* Media Files Grid */}
          <div>
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Film className="h-5 w-5" />
              Uploaded Videos ({mediaFiles.length})
            </h2>
            
            {mediaFiles.length === 0 ? (
              <Card className="backdrop-blur-glass bg-card/60 border-border/50 p-12 text-center">
                <Film className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">No videos uploaded yet.</p>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {mediaFiles.map((file) => (
                  <Card key={file.id} className="backdrop-blur-glass bg-card/60 border-border/50 overflow-hidden hover:border-primary/50 transition-colors">
                    {/* Poster or Placeholder */}
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

                    <div className="p-4 space-y-3">
                      <div>
                        <h3 className="font-semibold mb-1 truncate">{file.title}</h3>
                        {file.releaseYear && (
                          <p className="text-xs text-muted-foreground">
                            {file.releaseYear}
                            {file.rating && ` • ${file.rating}`}
                          </p>
                        )}
                      </div>

                      {file.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {file.description}
                        </p>
                      )}

                      {/* IMDB Metadata */}
                      {(file.genre || file.director || file.actors) && (
                        <div className="space-y-1 text-xs text-muted-foreground border-t border-border/50 pt-2">
                          {file.genre && (
                            <p><span className="font-medium">Genre:</span> {file.genre}</p>
                          )}
                          {file.director && (
                            <p><span className="font-medium">Director:</span> {file.director}</p>
                          )}
                          {file.actors && (
                            <p><span className="font-medium">Cast:</span> {file.actors}</p>
                          )}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border/50 pt-2">
                        <span className="uppercase">{file.file_type}</span>
                        {file.file_size && (
                          <span>{(file.file_size / 1024 / 1024).toFixed(1)} MB</span>
                        )}
                      </div>

                      {/* IMDB Link */}
                      {file.externalApiUrl && (
                        <a
                          href={file.externalApiUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-primary hover:underline block"
                        >
                          View on IMDB →
                        </a>
                      )}

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(file)}
                          className="flex-1"
                        >
                          <Edit2 className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleResyncOMDB(file.id)}
                          disabled={resyncing === file.id}
                          className="flex-1"
                        >
                          <RefreshCw className={`h-4 w-4 mr-2 ${resyncing === file.id ? "animate-spin" : ""}`} />
                          {resyncing === file.id ? "Syncing..." : "Resync"}
                        </Button>
                      </div>

                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleDelete(file.id)}
                        className="w-full"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Edit Modal */}
        <MediaEditModal
          isOpen={isEditModalOpen}
          media={editingMedia}
          isLoading={isEditLoading}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingMedia(null);
          }}
          onSave={handleEditSave}
        />
      </div>
    </div>
  );
};

export default MediaLibrary;
