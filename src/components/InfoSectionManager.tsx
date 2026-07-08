import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, FolderOpen, MoreHorizontal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MultiImageUpload, MultiImageDisplay } from "@/components/ImageUpload";

interface Section {
  id: string;
  info_category_id: string | null;
  name: string;
  order_index: number | null;
}

interface InfoItem {
  id: string;
  title: string;
  description: string | null;
  image_urls: string[] | null;
  order_index: number | null;
  section_id: string | null;
  category_id: string | null;
}

interface Category {
  id: string;
  name: string;
}

interface Props {
  categoryId: string;
  categories: Category[];
}

export function InfoSectionManager({ categoryId, categories }: Props) {
  const { activeStore } = useStore();
  const [sections, setSections] = useState<Section[]>([]);
  const [items, setItems] = useState<InfoItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [editSectionDialogOpen, setEditSectionDialogOpen] = useState(false);
  const [editSectionName, setEditSectionName] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [deleteSectionDialogOpen, setDeleteSectionDialogOpen] = useState(false);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const [deleteWithItems, setDeleteWithItems] = useState(false);

  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [currentSectionForNewItem, setCurrentSectionForNewItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ title: "", description: "", imageUrls: [] as string[] });

  const [editItemDialogOpen, setEditItemDialogOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItem, setEditItem] = useState({ title: "", description: "", imageUrls: [] as string[] });

  const [moveItemDialogOpen, setMoveItemDialogOpen] = useState(false);
  const [itemToMove, setItemToMove] = useState<InfoItem | null>(null);
  const [targetSectionId, setTargetSectionId] = useState<string>("unsorted");

  const categoryName = categories.find((c) => c.id === categoryId)?.name || "";

  useEffect(() => {
    fetchSections();
    fetchItems();
  }, [categoryId]);

  const fetchSections = async () => {
    const { data, error } = await supabase
      .from("sections")
      .select("*")
      .eq("info_category_id", categoryId)
      .order("order_index");
    if (error) console.error(error);
    else setSections((data as Section[]) || []);
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("shift_info")
      .select("*")
      .eq("category_id", categoryId)
      .order("order_index");
    if (error) console.error(error);
    else setItems((data as InfoItem[]) || []);
    setLoading(false);
  };

  // --- Sections ---
  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;
    const { error } = await supabase.from("sections").insert({
      info_category_id: categoryId,
      shift_id: null,
      name: newSectionName,
      order_index: sections.length,
      store_id: activeStore.id,
    } as any);
    if (error) toast.error("Kunne ikke opprette avsnitt");
    else {
      toast.success("Avsnitt opprettet!");
      setSectionDialogOpen(false);
      setNewSectionName("");
      fetchSections();
    }
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSectionId) return;
    const { error } = await supabase.from("sections").update({ name: editSectionName }).eq("id", editingSectionId);
    if (error) toast.error("Kunne ikke oppdatere avsnitt");
    else {
      toast.success("Avsnitt oppdatert!");
      setEditSectionDialogOpen(false);
      fetchSections();
    }
  };

  const handleDeleteSection = async () => {
    if (!deletingSectionId) return;
    if (deleteWithItems) {
      const { error } = await supabase.from("shift_info").delete().eq("section_id", deletingSectionId);
      if (error) { toast.error("Kunne ikke slette info"); return; }
    } else {
      const { error } = await supabase.from("shift_info").update({ section_id: null }).eq("section_id", deletingSectionId);
      if (error) { toast.error("Kunne ikke flytte info"); return; }
    }
    const { error } = await supabase.from("sections").delete().eq("id", deletingSectionId);
    if (error) toast.error("Kunne ikke slette avsnitt");
    else {
      toast.success("Avsnitt slettet!");
      setDeleteSectionDialogOpen(false);
      setDeleteWithItems(false);
      fetchSections();
      fetchItems();
    }
  };

  const handleMoveSection = async (id: string, direction: "up" | "down") => {
    const currentIndex = sections.findIndex((s) => s.id === id);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;
    const current = sections[currentIndex];
    const target = sections[targetIndex];
    await supabase.from("sections").update({ order_index: target.order_index }).eq("id", current.id);
    await supabase.from("sections").update({ order_index: current.order_index }).eq("id", target.id);
    fetchSections();
  };

  // --- Items ---
  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStore) return;
    const maxOrder = items.length > 0 ? Math.max(...items.map((i) => i.order_index ?? 0)) + 1 : 0;
    const { error } = await supabase.from("shift_info").insert({
      title: newItem.title,
      description: newItem.description || null,
      image_urls: newItem.imageUrls.length > 0 ? newItem.imageUrls : null,
      order_index: maxOrder,
      shift_id: null,
      category_id: categoryId,
      section_id: currentSectionForNewItem,
      store_id: activeStore.id,
    });
    if (error) toast.error("Kunne ikke opprette info");
    else {
      toast.success("Info opprettet!");
      setItemDialogOpen(false);
      setNewItem({ title: "", description: "", imageUrls: [] });
      setCurrentSectionForNewItem(null);
      fetchItems();
    }
  };

  const handleUpdateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItemId) return;
    const { error } = await supabase.from("shift_info").update({
      title: editItem.title,
      description: editItem.description || null,
      image_urls: editItem.imageUrls.length > 0 ? editItem.imageUrls : null,
    }).eq("id", editingItemId);
    if (error) toast.error("Kunne ikke oppdatere info");
    else {
      toast.success("Info oppdatert!");
      setEditItemDialogOpen(false);
      fetchItems();
    }
  };

  const handleDeleteItem = async (id: string) => {
    const { error } = await supabase.from("shift_info").delete().eq("id", id);
    if (error) toast.error("Kunne ikke slette info");
    else { toast.success("Info slettet!"); fetchItems(); }
  };

  const handleMoveItem = async () => {
    if (!itemToMove) return;
    const newSectionId = targetSectionId === "unsorted" ? null : targetSectionId;
    const { error } = await supabase.from("shift_info").update({ section_id: newSectionId }).eq("id", itemToMove.id);
    if (error) toast.error("Kunne ikke flytte info");
    else {
      toast.success("Info flyttet!");
      setMoveItemDialogOpen(false);
      setItemToMove(null);
      fetchItems();
    }
  };

  const openEditSection = (s: Section) => { setEditingSectionId(s.id); setEditSectionName(s.name); setEditSectionDialogOpen(true); };
  const openDeleteSection = (id: string) => { setDeletingSectionId(id); setDeleteWithItems(false); setDeleteSectionDialogOpen(true); };
  const openNewItem = (sectionId: string | null) => { setCurrentSectionForNewItem(sectionId); setNewItem({ title: "", description: "", imageUrls: [] }); setItemDialogOpen(true); };
  const openEditItem = (item: InfoItem) => {
    setEditingItemId(item.id);
    setEditItem({ title: item.title, description: item.description || "", imageUrls: item.image_urls || [] });
    setEditItemDialogOpen(true);
  };
  const openMoveItem = (item: InfoItem) => { setItemToMove(item); setTargetSectionId(item.section_id || "unsorted"); setMoveItemDialogOpen(true); };

  const renderItemCard = (item: InfoItem) => (
    <div key={item.id} className="flex items-start justify-between py-3 border-b last:border-b-0">
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-medium">{item.title}</h4>
        {item.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description}</p>}
        {item.image_urls && item.image_urls.length > 0 && <MultiImageDisplay urls={item.image_urls} className="mt-2" />}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openMoveItem(item)}>Flytt</DropdownMenuItem>
          <DropdownMenuItem onClick={() => openEditItem(item)}>Rediger</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDeleteItem(item.id)} className="text-destructive focus:text-destructive">Slett</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  if (loading) return <p className="text-sm text-muted-foreground">Laster...</p>;

  const unsortedItems = items.filter((i) => !i.section_id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{categoryName}</h2>
        <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <FolderOpen className="h-4 w-4 mr-2" />
              Nytt avsnitt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateSection}>
              <DialogHeader>
                <DialogTitle>Opprett nytt avsnitt</DialogTitle>
                <DialogDescription>Organiser info i avsnitt.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="info-section-name">Avsnittsnavn *</Label>
                <Input id="info-section-name" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} placeholder="F.eks. Regler" required />
              </div>
              <DialogFooter>
                <Button type="submit">Opprett avsnitt</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Unsorted items */}
      <div className="bg-muted/60 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usortert info</span>
            <Badge variant="secondary" className="text-xs">{unsortedItems.length}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => openNewItem(null)} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" /> Ny info
          </Button>
        </div>
        {unsortedItems.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Ingen usortert info</p>
        ) : (
          <div>{unsortedItems.map(renderItemCard)}</div>
        )}
      </div>

      {/* Named sections */}
      {sections.map((section) => {
        const sectionItems = items.filter((i) => i.section_id === section.id);
        const sectionIndex = sections.findIndex((s) => s.id === section.id);
        return (
          <div key={section.id} className="bg-muted/60 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">{section.name}</span>
                <Badge variant="secondary" className="text-xs shrink-0">{sectionItems.length}</Badge>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openNewItem(section.id)} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> Ny info
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditSection(section)}>Rediger</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMoveSection(section.id, "up")} disabled={sectionIndex === 0}>Flytt opp</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleMoveSection(section.id, "down")} disabled={sectionIndex === sections.length - 1}>Flytt ned</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => openDeleteSection(section.id)} className="text-destructive focus:text-destructive">Slett</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {sectionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Ingen info i dette avsnittet</p>
            ) : (
              <div>{sectionItems.map(renderItemCard)}</div>
            )}
          </div>
        );
      })}

      {/* Edit section dialog */}
      <Dialog open={editSectionDialogOpen} onOpenChange={setEditSectionDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpdateSection}>
            <DialogHeader><DialogTitle>Rediger avsnitt</DialogTitle></DialogHeader>
            <div className="py-4">
              <Label htmlFor="edit-info-section-name">Avsnittsnavn *</Label>
              <Input id="edit-info-section-name" value={editSectionName} onChange={(e) => setEditSectionName(e.target.value)} required />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditSectionDialogOpen(false)}>Avbryt</Button>
              <Button type="submit">Lagre endringer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete section dialog */}
      <AlertDialog open={deleteSectionDialogOpen} onOpenChange={setDeleteSectionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett avsnitt</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const count = items.filter((i) => i.section_id === deletingSectionId).length;
                if (count === 0) return "Er du sikker på at du vil slette dette avsnittet?";
                return `Dette avsnittet har ${count} info-element(er). Hva vil du gjøre med dem?`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {items.filter((i) => i.section_id === deletingSectionId).length > 0 && (
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <input type="radio" name="deleteInfoAction" checked={!deleteWithItems} onChange={() => setDeleteWithItems(false)} className="mt-1" />
                <div>
                  <p className="font-medium text-sm">Flytt til usortert</p>
                  <p className="text-xs text-muted-foreground">Info-elementene flyttes til usortert info</p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <input type="radio" name="deleteInfoAction" checked={deleteWithItems} onChange={() => setDeleteWithItems(true)} className="mt-1" />
                <div>
                  <p className="font-medium text-sm text-destructive">Slett alt</p>
                  <p className="text-xs text-muted-foreground">Alle info-elementer i avsnittet slettes permanent</p>
                </div>
              </label>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSection} className={deleteWithItems ? "bg-destructive hover:bg-destructive/90" : ""}>
              {deleteWithItems ? "Slett avsnitt og info" : "Slett avsnitt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New item dialog */}
      <Dialog open={itemDialogOpen} onOpenChange={setItemDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateItem}>
            <DialogHeader>
              <DialogTitle>Opprett ny info</DialogTitle>
              <DialogDescription>
                Legg til info i {categoryName}
                {currentSectionForNewItem && ` - ${sections.find((s) => s.id === currentSectionForNewItem)?.name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-info-title">Tittel *</Label>
                <Input id="new-info-title" value={newItem.title} onChange={(e) => setNewItem({ ...newItem, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-info-description">Beskrivelse</Label>
                <Textarea id="new-info-description" value={newItem.description} onChange={(e) => setNewItem({ ...newItem, description: e.target.value })} rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Bilder</Label>
                <MultiImageUpload folder="shift-info" currentUrls={newItem.imageUrls} onImagesChanged={(urls) => setNewItem({ ...newItem, imageUrls: urls })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Opprett info</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit item dialog */}
      <Dialog open={editItemDialogOpen} onOpenChange={setEditItemDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpdateItem}>
            <DialogHeader><DialogTitle>Rediger info</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-info-title">Tittel *</Label>
                <Input id="edit-info-title" value={editItem.title} onChange={(e) => setEditItem({ ...editItem, title: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-info-description">Beskrivelse</Label>
                <Textarea id="edit-info-description" value={editItem.description} onChange={(e) => setEditItem({ ...editItem, description: e.target.value })} rows={4} />
              </div>
              <div className="space-y-2">
                <Label>Bilder</Label>
                <MultiImageUpload folder="shift-info" currentUrls={editItem.imageUrls} onImagesChanged={(urls) => setEditItem({ ...editItem, imageUrls: urls })} />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditItemDialogOpen(false)}>Avbryt</Button>
              <Button type="submit">Lagre endringer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move item dialog */}
      <Dialog open={moveItemDialogOpen} onOpenChange={setMoveItemDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flytt info</DialogTitle>
            <DialogDescription>Velg hvor du vil flytte "{itemToMove?.title}" til</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="info-target-section">Flytt til avsnitt</Label>
            <Select value={targetSectionId} onValueChange={setTargetSectionId}>
              <SelectTrigger id="info-target-section"><SelectValue placeholder="Velg avsnitt" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unsorted">Usortert info</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>{section.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveItemDialogOpen(false)}>Avbryt</Button>
            <Button onClick={handleMoveItem}>Flytt info</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
