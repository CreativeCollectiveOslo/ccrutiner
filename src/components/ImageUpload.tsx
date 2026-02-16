import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { ImagePlus, X, Loader2 } from "lucide-react";

interface ImageUploadProps {
  folder: "routines" | "announcements" | "bulletin";
  currentUrl?: string | null;
  onImageUploaded: (url: string | null) => void;
  className?: string;
}

export function ImageUpload({ folder, currentUrl, onImageUploaded, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Kun billedfiler er tilladt");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Billedet må maks være 5MB");
      return;
    }

    setUploading(true);

    const fileExt = file.name.split(".").pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("attachments")
      .upload(fileName, file);

    if (uploadError) {
      toast.error("Kunne ikke uploade billede");
      console.error(uploadError);
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("attachments")
      .getPublicUrl(fileName);

    onImageUploaded(publicUrl);
    setUploading(false);

    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = () => {
    onImageUploaded(null);
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {currentUrl ? (
        <div className="space-y-2">
          <div className="relative inline-block">
            <img
              src={currentUrl}
              alt="Vedhæftet billede"
              className="max-h-32 rounded-lg border cursor-pointer object-cover"
              onClick={() => setPreviewOpen(true)}
            />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full"
              onClick={handleRemove}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
            <DialogContent className="max-w-3xl p-2">
              <img
                src={currentUrl}
                alt="Billede i fuld størrelse"
                className="w-full rounded-lg"
              />
            </DialogContent>
          </Dialog>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploader...
            </>
          ) : (
            <>
              <ImagePlus className="h-4 w-4 mr-2" />
              Vedhæft billede
            </>
          )}
        </Button>
      )}
    </div>
  );
}

interface ImageDisplayProps {
  url: string;
  className?: string;
}

export function ImageDisplay({ url, className }: ImageDisplayProps) {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <>
      <img
        src={url}
        alt="Vedhæftet billede"
        className={`max-w-full rounded-lg border cursor-pointer hover:opacity-90 transition-opacity ${className || ""}`}
        onClick={() => setPreviewOpen(true)}
      />
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl p-2">
          <img
            src={url}
            alt="Billede i fuld størrelse"
            className="w-full rounded-lg"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
