import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, MoreHorizontal, Info, ChevronRight, FolderPlus } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { MultiImageUpload, MultiImageDisplay } from "@/components/ImageUpload";

interface ShiftInfo {
  id: string;
  title: string;
  description: string | null;
  image_urls: string[] | null;
  order_index: number;
  category_id: string | null;
}

interface InfoCategory {
  id: string;
  name: string;
  icon: string;
  order_index: number;
}

const ICON_OPTIONS = [
  "Info", "CreditCard", "Shield", "Wrench", "Heart", "BookOpen",
  "Phone", "MapPin", "Clock", "Users", "Key", "FileText",
  "AlertTriangle", "Star", "Coffee", "Truck",
];

export function ViktigInfoManager() {
  const [items, setItems] = useState<ShiftInfo[]>([]);
  const [categories, setCategories] = useState<InfoCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Info item dialogs
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newInfo, setNewInfo] = useState({ title: "", description: "", imageUrls: [] as string[], categoryId: "" });
  const [editInfo, setEditInfo] = useState({ title: "", description: "", imageUrls: [] as string[], categoryId: "" });

  // Category dialogs
  const [catCreateOpen, setCatCreateOpen] = useState(false);
  const [catEditOpen, setCatEditOpen] = useState(false);
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [newCat, setNewCat] = useState({ name: "", icon: "Info" });
  const [editCat, setEditCat] = useState({ name: "", icon: "Info" });

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    const [itemsRes, catsRes] = await Promise.all([
      supabase.from("shift_info").select("*").is("shift_id", null).order("order_index"),
      supabase.from("info_categories").select("*").order("order_index"),
    ]);
    if (!itemsRes.error) setItems(itemsRes.data || []);
    if (!catsRes.error) setCategories(catsRes.data || []);
    setLoading(false);
  };

  // --- Category CRUD ---
  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("info_categories").insert({
      name: newCat.name,
      icon: newCat.icon,
      order_index: categories.length,
    });
    if (error) {
      toast.error("Kunne ikke opprette kategori");
    } else {
      toast.success("Kategori opprettet!");
      setCatCreateOpen(false);
      setNewCat({ name: "", icon: "Info" });
      fetchAll();
    }
  };

  const handleUpdateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCatId) return;
    const { error } = await supabase.from("info_categories").update({
      name: editCat.name,
      icon: editCat.icon,
    }).eq("id", editingCatId);
    if (error) {
      toast.error("Kunne ikke oppdatere kategori");
    } else {
      toast.success("Kategori oppdatert!");
      setCatEditOpen(false);
      fetchAll();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await supabase.from("info_categories").delete().eq("id", id);
    if (error) {
      toast.error("Kunne ikke slette kategori");
    } else {
      toast.success("Kategori slettet!");
      if (selectedCategory === id) setSelectedCategory(null);
      fetchAll();
    }
  };

  // --- Info item CRUD ---
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from("shift_info").insert({
      title: newInfo.title,
      description: newInfo.description || null,
      image_urls: newInfo.imageUrls.length > 0 ? newInfo.imageUrls : null,
      order_index: items.length,
      shift_id: null,
      category_id: newInfo.categoryId || null,
    });
    if (error) {
      toast.error("Kunne ikke opprette info");
    } else {
      toast.success("Info opprettet!");
      setCreateOpen(false);
      setNewInfo({ title: "", description: "", imageUrls: [], categoryId: "" });
      fetchAll();
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId) return;
    const { error } = await supabase.from("shift_info").update({
      title: editInfo.title,
      description: editInfo.description || null,
      image_urls: editInfo.imageUrls.length > 0 ? editInfo.imageUrls : null,
      category_id: editInfo.categoryId || null,
    }).eq("id", editingId);
    if (error) {
      toast.error("Kunne ikke oppdatere info");
    } else {
      toast.success("Info oppdatert!");
      setEditOpen(false);
      fetchAll();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("shift_info").delete().eq("id", id);
    if (error) {
      toast.error("Kunne ikke slette info");
    } else {
      toast.success("Info slettet!");
      fetchAll();
    }
  };

  const openEdit = (item: ShiftInfo) => {
    setEditingId(item.id);
    setEditInfo({
      title: item.title,
      description: item.description || "",
      imageUrls: item.image_urls || [],
      categoryId: item.category_id || "",
    });
    setEditOpen(true);
  };

  if (loading) {
    return <p className="text-sm text-muted-foreground">Laster...</p>;
  }

  // Category detail view
  if (selectedCategory) {
    const cat = selectedCategory === "uncategorized"
      ? null
      : categories.find(c => c.id === selectedCategory);
    const catItems = selectedCategory === "uncategorized"
      ? items.filter(i => !i.category_id)
      : items.filter(i => i.category_id === selectedCategory);
    const catName = selectedCategory === "uncategorized" ? "Generelt" : cat?.name;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <button
              onClick={() => setSelectedCategory(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mb-2"
            >
              ← Tilbake
            </button>
            <h2 className="text-lg font-semibold">{catName}</h2>
          </div>
          <Button variant="outline" size="sm" onClick={() => {
            setNewInfo({ title: "", description: "", imageUrls: [], categoryId: selectedCategory === "uncategorized" ? "" : selectedCategory });
            setCreateOpen(true);
          }}>
            <Plus className="h-4 w-4 mr-2" />
            Ny info
          </Button>
        </div>

        {catItems.length === 0 ? (
          <div className="bg-muted/60 rounded-lg p-6 text-center">
            <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">Ingen info i denne kategorien ennå</p>
          </div>
        ) : (
          <div className="space-y-3">
            {catItems.map((item) => (
              <InfoItemCard key={item.id} item={item} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}

        <InfoFormDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          title="Legg til info"
          description="Informasjon som vises til alle ansatte"
          info={newInfo}
          setInfo={setNewInfo}
          categories={categories}
          onSubmit={handleCreate}
          submitLabel="Legg til"
        />
        <InfoFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          title="Rediger info"
          info={editInfo}
          setInfo={setEditInfo}
          categories={categories}
          onSubmit={handleUpdate}
          submitLabel="Lagre endringer"
          showCancel
          onCancel={() => setEditOpen(false)}
        />
      </div>
    );
  }

  // Category list view
  const uncategorizedCount = items.filter(i => !i.category_id).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Viktig informasjon</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => { setNewCat({ name: "", icon: "Info" }); setCatCreateOpen(true); }}>
            <FolderPlus className="h-4 w-4 mr-2" />
            Ny kategori
          </Button>
        </div>
      </div>

      {categories.length === 0 && uncategorizedCount === 0 ? (
        <div className="bg-muted/60 rounded-lg p-6 text-center">
          <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">Ingen kategorier eller info ennå</p>
          <p className="text-xs text-muted-foreground mt-1">Opprett en kategori for å organisere informasjon</p>
        </div>
      ) : (
        <div className="space-y-3">
          {categories.map((cat) => {
            const IconComponent = (LucideIcons as any)[cat.icon] || Info;
            const count = items.filter(i => i.category_id === cat.id).length;
            return (
              <Card key={cat.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedCategory(cat.id)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <IconComponent className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{cat.name}</p>
                    <p className="text-xs text-muted-foreground">{count} {count === 1 ? 'element' : 'elementer'}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                        <MoreHorizontal className="h-3.5 w-3.5" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditingCatId(cat.id); setEditCat({ name: cat.name, icon: cat.icon }); setCatEditOpen(true); }}>
                        Rediger
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} className="text-destructive focus:text-destructive">
                        Slett
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            );
          })}

          {uncategorizedCount > 0 && (
            <Card className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => setSelectedCategory("uncategorized")}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Info className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">Generelt</p>
                  <p className="text-xs text-muted-foreground">{uncategorizedCount} elementer</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Category Create Dialog */}
      <CategoryFormDialog
        open={catCreateOpen}
        onOpenChange={setCatCreateOpen}
        title="Ny kategori"
        cat={newCat}
        setCat={setNewCat}
        onSubmit={handleCreateCategory}
        submitLabel="Opprett"
      />

      {/* Category Edit Dialog */}
      <CategoryFormDialog
        open={catEditOpen}
        onOpenChange={setCatEditOpen}
        title="Rediger kategori"
        cat={editCat}
        setCat={setEditCat}
        onSubmit={handleUpdateCategory}
        submitLabel="Lagre"
        showCancel
        onCancel={() => setCatEditOpen(false)}
      />

      {/* Info dialogs (for when creating from category list) */}
      <InfoFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Legg til info"
        description="Informasjon som vises til alle ansatte"
        info={newInfo}
        setInfo={setNewInfo}
        categories={categories}
        onSubmit={handleCreate}
        submitLabel="Legg til"
      />
      <InfoFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        title="Rediger info"
        info={editInfo}
        setInfo={setEditInfo}
        categories={categories}
        onSubmit={handleUpdate}
        submitLabel="Lagre endringer"
        showCancel
        onCancel={() => setEditOpen(false)}
      />
    </div>
  );
}

// --- Sub-components ---

function InfoItemCard({ item, onEdit, onDelete }: { item: ShiftInfo; onEdit: (item: ShiftInfo) => void; onDelete: (id: string) => void }) {
  return (
    <div className="bg-muted/60 rounded-lg p-4">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0 flex items-start gap-3">
          <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
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
            <DropdownMenuItem onClick={() => onEdit(item)}>Rediger</DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDelete(item.id)} className="text-destructive focus:text-destructive">
              Slett
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

function InfoFormDialog({
  open, onOpenChange, title, description, info, setInfo, categories, onSubmit, submitLabel, showCancel, onCancel
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  info: { title: string; description: string; imageUrls: string[]; categoryId: string };
  setInfo: (v: any) => void;
  categories: InfoCategory[];
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  showCancel?: boolean;
  onCancel?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            {description && <DialogDescription>{description}</DialogDescription>}
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tittel *</Label>
              <Input value={info.title} onChange={(e) => setInfo({ ...info, title: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Beskrivelse</Label>
              <Textarea value={info.description} onChange={(e) => setInfo({ ...info, description: e.target.value })} rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Kategori</Label>
              <Select value={info.categoryId || "none"} onValueChange={(v) => setInfo({ ...info, categoryId: v === "none" ? "" : v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Velg kategori" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Ingen (Generelt)</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Bilder</Label>
              <MultiImageUpload folder="shift-info" currentUrls={info.imageUrls} onImagesChanged={(urls) => setInfo({ ...info, imageUrls: urls })} />
            </div>
          </div>
          <DialogFooter>
            {showCancel && <Button type="button" variant="outline" onClick={onCancel}>Avbryt</Button>}
            <Button type="submit">{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CategoryFormDialog({
  open, onOpenChange, title, cat, setCat, onSubmit, submitLabel, showCancel, onCancel
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  cat: { name: string; icon: string };
  setCat: (v: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
  showCancel?: boolean;
  onCancel?: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={onSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Navn *</Label>
              <Input value={cat.name} onChange={(e) => setCat({ ...cat, name: e.target.value })} required />
            </div>
            <div className="space-y-2">
              <Label>Ikon</Label>
              <div className="grid grid-cols-8 gap-2">
                {ICON_OPTIONS.map(iconName => {
                  const Icon = (LucideIcons as any)[iconName] || Info;
                  return (
                    <button
                      type="button"
                      key={iconName}
                      onClick={() => setCat({ ...cat, icon: iconName })}
                      className={`h-9 w-9 rounded-md flex items-center justify-center transition-colors ${
                        cat.icon === iconName
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted hover:bg-accent"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <DialogFooter>
            {showCancel && <Button type="button" variant="outline" onClick={onCancel}>Avbryt</Button>}
            <Button type="submit">{submitLabel}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
