import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ClipboardList, Loader2, Pencil, X, Check } from "lucide-react";
import { MultiImageUpload, MultiImageDisplay } from "@/components/ImageUpload";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { getPaginationRange } from "@/lib/pagination";
import { highlightSearchTerm } from "@/lib/highlightText";

interface BulletinPost {
  id: string;
  user_id: string;
  title: string;
  message: string;
  image_url?: string | null;
  image_urls: string[] | null;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  name: string;
}

const POSTS_PER_PAGE = 10;

export type BulletinBoardVariant = "bulletin" | "workshop";

interface BulletinBoardProps {
  searchHighlightTerm?: string | null;
  variant?: BulletinBoardVariant;
}

const VARIANT_CONFIG = {
  bulletin: {
    table: "bulletin_posts" as const,
    folder: "bulletin",
    formLabel: "Skriv i loggboka",
    submitLabel: "Legg til i loggbok",
    successMessage: "Innlegg lagt til i loggboka!",
    emptyTitle: "Ingen innlegg i loggboka",
    emptyBody: "Vær den første til å skrive i loggboka!",
  },
  workshop: {
    table: "workshop_logbook_posts" as const,
    folder: "bulletin",
    formLabel: "Skriv i verksted-loggboka",
    submitLabel: "Legg til i verksted-loggbok",
    successMessage: "Innlegg lagt til i verksted-loggboka!",
    emptyTitle: "Ingen innlegg i verksted-loggboka",
    emptyBody: "Vær den første til å skrive i verksted-loggboka!",
  },
} as const;

export function BulletinBoard({ searchHighlightTerm, variant = "bulletin" }: BulletinBoardProps) {
  const config = VARIANT_CONFIG[variant];
  const { user } = useAuth();
  const { activeStore } = useStore();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newMessage, setNewMessage] = useState("");
  const [newImageUrls, setNewImageUrls] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMessage, setEditMessage] = useState("");
  const [editImageUrls, setEditImageUrls] = useState<string[]>([]);
  const firstMatchRef = useRef<HTMLDivElement>(null);
  const hasScrolledRef = useRef(false);

  // Auto-scroll to first match when searchHighlightTerm is set
  useEffect(() => {
    if (searchHighlightTerm && firstMatchRef.current && !hasScrolledRef.current) {
      // Use longer delay on mobile for DOM to settle
      const scrollDelay = window.innerWidth < 768 ? 300 : 100;
      setTimeout(() => {
        if (firstMatchRef.current) {
          // Use scrollTo with offset calculation for better mobile support
          const element = firstMatchRef.current;
          const elementRect = element.getBoundingClientRect();
          const absoluteElementTop = elementRect.top + window.scrollY;
          const middle = absoluteElementTop - (window.innerHeight / 2) + (elementRect.height / 2);
          
          window.scrollTo({
            top: middle,
            behavior: "smooth"
          });
          hasScrolledRef.current = true;
        }
      }, scrollDelay);
    }
    if (!searchHighlightTerm) {
      hasScrolledRef.current = false;
    }
  }, [searchHighlightTerm, posts]);

  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);

  useEffect(() => {
    if (activeStore) {
      fetchPosts();
      fetchProfiles();
    }
  }, [currentPage, activeStore]);

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name");

    if (!error && data) {
      const profileMap = new Map<string, string>();
      data.forEach((p: UserProfile) => profileMap.set(p.id, p.name));
      setProfiles(profileMap);
    }
  };

  const fetchPosts = async () => {
    if (!activeStore) return;
    setLoading(true);

    // Get total count
    const { count, error: countError } = await supabase
      .from(config.table)
      .select("*", { count: "exact", head: true })
      .eq("store_id", activeStore.id);

    if (countError) {
      console.error(countError);
      setLoading(false);
      return;
    }

    setTotalCount(count || 0);

    // Calculate range for pagination
    const from = (currentPage - 1) * POSTS_PER_PAGE;
    const to = from + POSTS_PER_PAGE - 1;

    // Fetch posts with pagination (newest first)
    const { data, error } = await supabase
      .from(config.table)
      .select("*")
      .eq("store_id", activeStore.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      toast.error("Kunne ikke hente innlegg");
      console.error(error);
    } else {
      setPosts(data || []);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeStore || !newTitle.trim() || !newMessage.trim()) return;

    setSubmitting(true);

    const { error } = await supabase.from(config.table).insert({
      user_id: user.id,
      title: newTitle.trim(),
      message: newMessage.trim(),
      image_urls: newImageUrls.length > 0 ? newImageUrls : null,
      image_url: newImageUrls[0] || null,
      store_id: activeStore.id,
    } as any);

    if (error) {
      toast.error("Kunne ikke opprette innlegg");
      console.error(error);
    } else {
      toast.success(config.successMessage);
      setNewTitle("");
      setNewMessage("");
      setNewImageUrls([]);
      setCurrentPage(1);
      fetchPosts();
    }

    setSubmitting(false);
  };

  const startEditing = (post: BulletinPost) => {
    setEditingPostId(post.id);
    setEditTitle(post.title);
    setEditMessage(post.message);
    setEditImageUrls(post.image_urls?.length ? post.image_urls : post.image_url ? [post.image_url] : []);
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditTitle("");
    setEditMessage("");
    setEditImageUrls([]);
  };

  const saveEdit = async (postId: string) => {
    if (!editTitle.trim() || !editMessage.trim()) return;

    const { error } = await supabase
      .from(config.table)
      .update({ 
        title: editTitle.trim(),
        message: editMessage.trim(),
        image_urls: editImageUrls.length > 0 ? editImageUrls : null,
        image_url: editImageUrls[0] || null,
      } as any)
      .eq("id", postId);

    if (error) {
      toast.error("Kunne ikke oppdatere innlegg");
      console.error(error);
    } else {
      toast.success("Innlegg oppdatert!");
      setEditingPostId(null);
      setEditTitle("");
      setEditMessage("");
      setEditImageUrls([]);
      fetchPosts();
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d. MMMM yyyy 'kl.' HH:mm", { locale: nb });
  };

  const isEdited = (post: BulletinPost) => {
    return new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 1000;
  };

  const getAuthorName = (userId: string) => {
    return profiles.get(userId) || "Ukjent bruker";
  };

  if (loading && posts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* New post form */}
      <Card>
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            <Label className="text-sm font-medium">{config.formLabel}</Label>
            <div className="space-y-2">
              <Input
                placeholder="Overskrift"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Textarea
                placeholder="Skriv din besked her..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                className="min-h-[100px]"
              />
              <MultiImageUpload
                folder={config.folder}
                currentUrls={newImageUrls}
                onImagesChanged={setNewImageUrls}
              />
            </div>
            <Button type="submit" disabled={submitting || !newTitle.trim() || !newMessage.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Lagrer...
                </>
              ) : (
                config.submitLabel
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Posts list */}
      {posts.length === 0 ? (
        <Card>
          <CardContent className="py-12 px-4 text-center">
            <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">{config.emptyTitle}</h3>
            <p className="text-sm text-muted-foreground">
              {config.emptyBody}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {(() => {
            // Find first matching post for scroll (search in title and message)
            const firstMatchId = searchHighlightTerm 
              ? posts.find(p => 
                  p.title.toLowerCase().includes(searchHighlightTerm.toLowerCase()) ||
                  p.message.toLowerCase().includes(searchHighlightTerm.toLowerCase())
                )?.id
              : null;
            
            return posts.map((post) => (
              <Card 
                key={post.id}
                ref={post.id === firstMatchId ? firstMatchRef : undefined}
              >
              <CardContent className="p-4">
                {editingPostId === post.id ? (
                  <div className="space-y-3">
                    <Input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Overskrift"
                    />
                    <Textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <MultiImageUpload
                      folder={config.folder}
                      currentUrls={editImageUrls}
                      onImagesChanged={setEditImageUrls}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveEdit(post.id)}
                        disabled={!editTitle.trim() || !editMessage.trim()}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Lagre
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEditing}>
                        <X className="h-4 w-4 mr-1" />
                        Avbryt
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-sm font-medium">
                        {getAuthorName(post.user_id)}
                      </span>
                      {user?.id === post.user_id && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 px-2"
                          onClick={() => startEditing(post)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{highlightSearchTerm(post.title, searchHighlightTerm)}</h4>
                    <p className="text-sm whitespace-pre-wrap mb-3">{highlightSearchTerm(post.message, searchHighlightTerm)}</p>
                    {(() => {
                      const urls = post.image_urls?.length ? post.image_urls : post.image_url ? [post.image_url] : [];
                      return urls.length > 0 && <MultiImageDisplay urls={urls} className="mb-3" />;
                    })()}
                    <p className="text-xs text-muted-foreground">
                      {formatDate(post.created_at)}
                      {isEdited(post) && (
                        <span className="ml-2 italic">(redigert)</span>
                      )}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
            ));
          })()}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage > 1) setCurrentPage(currentPage - 1);
                }}
                className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            {getPaginationRange(currentPage, totalPages, 1).map((item, idx) =>
              item === "ellipsis" ? (
                <PaginationItem key={`e-${idx}`}>
                  <PaginationEllipsis />
                </PaginationItem>
              ) : (
                <PaginationItem key={item}>
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setCurrentPage(item);
                    }}
                    isActive={item === currentPage}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  if (currentPage < totalPages) setCurrentPage(currentPage + 1);
                }}
                className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
