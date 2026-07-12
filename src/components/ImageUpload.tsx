import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ImagePlus, X, Loader2, ChevronLeft, ChevronRight } from "lucide-react";

// ===== Shared Lightbox =====

interface LightboxProps {
  urls: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (i: number) => void;
}

export function Lightbox({ urls, index, onClose, onIndexChange }: LightboxProps) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && urls.length > 1) onIndexChange((index - 1 + urls.length) % urls.length);
      if (e.key === "ArrowRight" && urls.length > 1) onIndexChange((index + 1) % urls.length);
    };
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [index, urls.length, onClose, onIndexChange]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center animate-in fade-in-0"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      {/* Close button - large tap target, always visible */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-10 h-11 w-11 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
        style={{ top: "max(1rem, env(safe-area-inset-top))", right: "max(1rem, env(safe-area-inset-right))" }}
        aria-label="Lukk"
      >
        <X className="h-6 w-6" />
      </button>

      {urls.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onIndexChange((index - 1 + urls.length) % urls.length); }}
            className="absolute left-2 sm:left-4 z-10 h-11 w-11 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            aria-label="Forrige"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onIndexChange((index + 1) % urls.length); }}
            className="absolute right-2 sm:right-4 z-10 h-11 w-11 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
            aria-label="Neste"
          >
            <ChevronRight className="h-6 w-6" />
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1 rounded-full bg-black/60 text-white text-sm">
            {index + 1} / {urls.length}
          </div>
        </>
      )}

      <img
        src={urls[index]}
        alt={`Billede ${index + 1}`}
        className="max-w-[95vw] max-h-[90vh] object-contain select-none"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}

// ===== Multi-image upload =====

interface MultiImageUploadProps {
  folder: "routines" | "announcements" | "bulletin" | "shift-info";
  currentUrls: string[];
  onImagesChanged: (urls: string[]) => void;
  maxImages?: number;
  className?: string;
}

export function MultiImageUpload({ folder, currentUrls, onImagesChanged, maxImages = 10, className }: MultiImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remaining = maxImages - currentUrls.length;
    const toUpload = files.slice(0, remaining);

    for (const file of toUpload) {
      if (!file.type.startsWith("image/")) {
        toast.error("Kun billedfiler er tilladt");
        continue;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Billedet må maks være 5MB");
        continue;
      }
    }

    setUploading(true);
    const newUrls: string[] = [];

    for (const file of toUpload) {
      if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) continue;

      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) {
        toast.error("Du må være logget inn for å laste opp");
        continue;
      }
      const fileExt = file.name.split(".").pop();
      const fileName = `${userId}/${folder}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("attachments-private")
        .upload(fileName, file);

      if (uploadError) {
        toast.error("Kunne ikke uploade billede");
        console.error(uploadError);
        continue;
      }

      // Long-lived signed URL (~10 years) since bucket is private
      const { data: signed, error: signErr } = await supabase.storage
        .from("attachments-private")
        .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);

      if (signErr || !signed?.signedUrl) {
        toast.error("Kunne ikke generere billed-URL");
        console.error(signErr);
        continue;
      }

      newUrls.push(signed.signedUrl);
    }

    if (newUrls.length > 0) {
      onImagesChanged([...currentUrls, ...newUrls]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (index: number) => {
    const updated = currentUrls.filter((_, i) => i !== index);
    onImagesChanged(updated);
  };

  const canAddMore = currentUrls.length < maxImages;

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      {currentUrls.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-2">
          {currentUrls.map((url, i) => (
            <div key={i} className="relative group">
              <img
                src={url}
                alt={`Billede ${i + 1}`}
                className="h-20 w-full object-cover rounded-lg border cursor-pointer"
                onClick={() => setPreviewIndex(i)}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeImage(i)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {canAddMore && (
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
              Vedhæft billede {currentUrls.length > 0 && `(${currentUrls.length}/${maxImages})`}
            </>
          )}
        </Button>
      )}

      {previewIndex !== null && (
        <Lightbox
          urls={currentUrls}
          index={previewIndex}
          onClose={() => setPreviewIndex(null)}
          onIndexChange={setPreviewIndex}
        />
      )}
    </div>
  );
}

// ===== Legacy single-image upload (wrapper around multi) =====

interface ImageUploadProps {
  folder: "routines" | "announcements" | "bulletin" | "shift-info";
  currentUrl?: string | null;
  onImageUploaded: (url: string | null) => void;
  className?: string;
}

export function ImageUpload({ folder, currentUrl, onImageUploaded, className }: ImageUploadProps) {
  const urls = currentUrl ? [currentUrl] : [];
  return (
    <MultiImageUpload
      folder={folder}
      currentUrls={urls}
      onImagesChanged={(newUrls) => onImageUploaded(newUrls[0] || null)}
      maxImages={1}
      className={className}
    />
  );
}

// ===== Multi-image display with gallery =====

interface MultiImageDisplayProps {
  urls: string[];
  className?: string;
}

export function MultiImageDisplay({ urls, className }: MultiImageDisplayProps) {
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);

  if (urls.length === 0) return null;

  return (
    <div className={className}>
      <div className={`grid gap-2 ${urls.length === 1 ? "grid-cols-1" : "grid-cols-2 sm:grid-cols-3"}`}>
        {urls.map((url, i) => (
          <img
            key={i}
            src={url}
            alt={`Billede ${i + 1}`}
            className={`rounded-lg border cursor-pointer hover:opacity-90 transition-opacity object-cover ${
              urls.length === 1 ? "max-h-48 w-auto" : "h-24 w-full"
            }`}
            onClick={() => setPreviewIndex(i)}
          />
        ))}
      </div>

      <Dialog open={previewIndex !== null} onOpenChange={() => setPreviewIndex(null)}>
        <DialogContent className="max-w-3xl p-2">
          {previewIndex !== null && (
            <div className="relative">
              <img
                src={urls[previewIndex]}
                alt="Billede i fuld størrelse"
                className="w-full rounded-lg"
              />
              {urls.length > 1 && (
                <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-2">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full opacity-80"
                    onClick={() => setPreviewIndex((previewIndex - 1 + urls.length) % urls.length)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="rounded-full opacity-80"
                    onClick={() => setPreviewIndex((previewIndex + 1) % urls.length)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ===== Legacy single-image display =====

interface ImageDisplayProps {
  url: string;
  className?: string;
}

export function ImageDisplay({ url, className }: ImageDisplayProps) {
  return <MultiImageDisplay urls={[url]} className={className} />;
}
