import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { ClipboardList, Loader2, Pencil, X, Check } from "lucide-react";
import { format } from "date-fns";
import { da } from "date-fns/locale";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

interface BulletinPost {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  updated_at: string;
}

interface UserProfile {
  id: string;
  name: string;
}

const POSTS_PER_PAGE = 10;

export function BulletinBoard() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<BulletinPost[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editMessage, setEditMessage] = useState("");

  const totalPages = Math.ceil(totalCount / POSTS_PER_PAGE);

  useEffect(() => {
    fetchPosts();
    fetchProfiles();
  }, [currentPage]);

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
    setLoading(true);

    // Get total count
    const { count, error: countError } = await supabase
      .from("bulletin_posts")
      .select("*", { count: "exact", head: true });

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
      .from("bulletin_posts")
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      toast.error("Kunne ikke hente indlæg");
      console.error(error);
    } else {
      setPosts(data || []);
    }

    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newMessage.trim()) return;

    setSubmitting(true);

    const { error } = await supabase.from("bulletin_posts").insert({
      user_id: user.id,
      message: newMessage.trim(),
    });

    if (error) {
      toast.error("Kunne ikke oprette indlæg");
      console.error(error);
    } else {
      toast.success("Indlæg delt!");
      setNewMessage("");
      setCurrentPage(1);
      fetchPosts();
    }

    setSubmitting(false);
  };

  const startEditing = (post: BulletinPost) => {
    setEditingPostId(post.id);
    setEditMessage(post.message);
  };

  const cancelEditing = () => {
    setEditingPostId(null);
    setEditMessage("");
  };

  const saveEdit = async (postId: string) => {
    if (!editMessage.trim()) return;

    const { error } = await supabase
      .from("bulletin_posts")
      .update({ message: editMessage.trim() })
      .eq("id", postId);

    if (error) {
      toast.error("Kunne ikke opdatere indlæg");
      console.error(error);
    } else {
      toast.success("Indlæg opdateret!");
      setEditingPostId(null);
      setEditMessage("");
      fetchPosts();
    }
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d. MMMM yyyy 'kl.' HH:mm", { locale: da });
  };

  const isEdited = (post: BulletinPost) => {
    return new Date(post.updated_at).getTime() - new Date(post.created_at).getTime() > 1000;
  };

  const getAuthorName = (userId: string) => {
    return profiles.get(userId) || "Ukendt bruger";
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
            <label className="text-sm font-medium">Skriv et indlæg</label>
            <Textarea
              placeholder="Del noget med dine kolleger..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="min-h-[100px]"
            />
            <Button type="submit" disabled={submitting || !newMessage.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deler...
                </>
              ) : (
                "Del indlæg"
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
            <h3 className="text-lg font-medium mb-2">Ingen indlæg endnu</h3>
            <p className="text-sm text-muted-foreground">
              Vær den første til at skrive et indlæg!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id}>
              <CardContent className="p-4">
                {editingPostId === post.id ? (
                  <div className="space-y-3">
                    <Textarea
                      value={editMessage}
                      onChange={(e) => setEditMessage(e.target.value)}
                      className="min-h-[100px]"
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => saveEdit(post.id)}
                        disabled={!editMessage.trim()}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Gem
                      </Button>
                      <Button size="sm" variant="outline" onClick={cancelEditing}>
                        <X className="h-4 w-4 mr-1" />
                        Annuller
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
                    <p className="text-sm whitespace-pre-wrap mb-3">{post.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDate(post.created_at)}
                      {isEdited(post) && (
                        <span className="ml-2 italic">(redigeret)</span>
                      )}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
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
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <PaginationItem key={page}>
                <PaginationLink
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setCurrentPage(page);
                  }}
                  isActive={page === currentPage}
                >
                  {page}
                </PaginationLink>
              </PaginationItem>
            ))}
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
