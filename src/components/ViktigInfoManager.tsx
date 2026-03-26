import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Info } from "lucide-react";
import { MultiImageUpload, MultiImageDisplay } from "@/components/ImageUpload";

interface ShiftInfo {
  id: string;
  title: string;
  description: string | null;
  image_urls: string[] | null;
  order_index: number;
}

export function ViktigInfoManager() {
  const [items, setItems] = useState<ShiftInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newInfo, setNewInfo] = useState({ title: "", description: "", imageUrls: [] as string[] });
  const [editInfo, setEditInfo] = useState({ title: "", description: "", imageUrls: [] as string[] });

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("shift_info")
      .select("*")
      .is("shift_id", null)
      .order("order_index");

    if (!error) setItems(data || []);
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("shift_info").insert({
      title: newInfo.title,
      description: newInfo.description || null,
      image_urls: newInfo.imageUrls.length > 0 ? newInfo.imageUrls : null,
      order_index: items.length,
      shift_id: null,
    });

    if (error) {
      toast.error("Kunne ikke opprette info");
    } else {
      toast.success("Viktig info opprettet!");
      setCreateOpen(false);
      setNewInfo({ title: "", description: "", imageUrls: [] });
      fetchItems();
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;

    const { error } = await supabase
      .from("shift_info")
      .update({
        title: editInfo.title,
        description: editInfo.description || null,
        image_urls: editInfo.imageUrls.length > 0 ? editInfo.imageUrls : null,
      })
      .eq("id", editingId);

    if (error) {
      toast.error("Kunne ikke oppdatere info");
    } else {
      toast.success("Info oppdatert!");
      setEditOpen(false);
      fetchItems();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("shift_info").delete().eq("id", id);
    if (error) {
      toast.error("Kunne ikke slette info");
    } else {
      toast.success("Info slettet!");
      fetchItems();
    }
  };

  const openEdit = (item: ShiftInfo) => {
    setEditingId(item.id);
    setEditInfo({
      title: item.title,
      description: item.description || "",
      imageUrls: item.image_urls || [],
    });
    setEditOpen(true);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Laster...</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Viktig informasjon</h2>
        <Button variant="outline" size="sm" onClick={() => { setNewInfo({ title: "", description: "", imageUrls: [] }); setCreateOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Ny info
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="bg-muted/60 rounded-lg p-6 text-center">
          <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">Ingen viktig info ennå</p>
          <p className="text-xs text-muted-foreground mt-1">Legg til informasjon som alle ansatte bør vite</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <div key={item.id} className="bg-muted/60 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 flex items-start gap-3">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium">{item.title}</h4>
                    {item.description && (
                      <p className="text-xs text-muted-foreground mt-1 whitespace-pre-line">{item.description}</p>
                    )}
                    {item.image_urls && item.image_urls.length > 0 && (
                      <MultiImageDisplay urls={item.image_urls} className="mt-2" />
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEdit(item)}>Rediger</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleDelete(item.id)} className="text-destructive focus:text-destructive">
                      Slett
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <form onSubmit={handleCreate}>
            <DialogHeader>
              <DialogTitle>Legg til viktig info</DialogTitle>
              <DialogDescription>Informasjon som vises til alle ansatte</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="info-title">Tittel *</Label>
                <Input id="info-title" value={newInfo.title} onChange={(e) => setNewInfo({ ...newInfo, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="info-desc">Beskrivelse</Label>
                <Textarea id="info-desc" value={newInfo.description} onChange={(e) => setNewInfo({ ...newInfo, description: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Bilder</Label>
                <MultiImageUpload folder="shift-info" currentUrls={newInfo.imageUrls} onImagesChanged={(urls) => setNewInfo({ ...newInfo, imageUrls: urls })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Legg til</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <form onSubmit={handleUpdate}>
            <DialogHeader>
              <DialogTitle>Rediger viktig info</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-info-title">Tittel *</Label>
                <Input id="edit-info-title" value={editInfo.title} onChange={(e) => setEditInfo({ ...editInfo, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-info-desc">Beskrivelse</Label>
                <Textarea id="edit-info-desc" value={editInfo.description} onChange={(e) => setEditInfo({ ...editInfo, description: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Bilder</Label>
                <MultiImageUpload folder="shift-info" currentUrls={editInfo.imageUrls} onImagesChanged={(urls) => setEditInfo({ ...editInfo, imageUrls: urls })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Avbryt</Button>
              <Button type="submit">Lagre endringer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
