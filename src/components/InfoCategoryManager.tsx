import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Edit, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InfoCategory {
  id: string;
  name: string;
  color_code: string;
  icon: string;
  order_index: number;
}

const iconOptions = [
  "Info", "CreditCard", "Shield", "Wrench", "Heart", "BookOpen",
  "Phone", "MapPin", "Clock", "Users", "Key", "FileText",
  "AlertTriangle", "Star", "Coffee", "Truck",
];

interface Props {
  onCategoryChange?: () => void;
}

export function InfoCategoryManager({ onCategoryChange }: Props) {
  const { activeStore } = useStore();
  const [categories, setCategories] = useState<InfoCategory[]>([]);
  const [name, setName] = useState("");
  const [colorCode, setColorCode] = useState("#D2593A");
  const [selectedIcon, setSelectedIcon] = useState("Info");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [iconsExpanded, setIconsExpanded] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string; sections: number; items: number } | null>(null);

  const notifyChange = () => onCategoryChange?.();

  useEffect(() => {
    if (activeStore) fetchCategories();
  }, [activeStore]);

  const fetchCategories = async () => {
    if (!activeStore) return;
    const { data, error } = await supabase
      .from("info_categories")
      .select("*")
      .eq("store_id", activeStore.id)
      .order("order_index");
    if (error) toast.error("Kunne ikke hente kategorier");
    else if (data) setCategories(data as InfoCategory[]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Vennligst fyll ut navn");
    setLoading(true);

    if (editingId) {
      const { error } = await supabase
        .from("info_categories")
        .update({ name, color_code: colorCode, icon: selectedIcon })
        .eq("id", editingId);
      if (error) toast.error("Kunne ikke oppdatere kategori");
      else {
        toast.success("Kategori oppdatert!");
        resetForm();
        fetchCategories();
        notifyChange();
      }
    } else {
      const maxOrderIndex = categories.length > 0
        ? Math.max(...categories.map(c => c.order_index)) + 1
        : 0;
      if (!activeStore) return;
      const { error } = await supabase
        .from("info_categories")
        .insert([{ name, color_code: colorCode, icon: selectedIcon, order_index: maxOrderIndex, store_id: activeStore.id }]);
      if (error) toast.error("Kunne ikke opprette kategori");
      else {
        toast.success("Kategori opprettet!");
        resetForm();
        fetchCategories();
        notifyChange();
      }
    }
    setLoading(false);
  };

  const handleMove = async (id: string, direction: "up" | "down") => {
    const currentIndex = categories.findIndex(c => c.id === id);
    if (currentIndex === -1) return;
    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;
    const current = categories[currentIndex];
    const target = categories[targetIndex];
    await supabase.from("info_categories").update({ order_index: target.order_index }).eq("id", current.id);
    await supabase.from("info_categories").update({ order_index: current.order_index }).eq("id", target.id);
    fetchCategories();
  };

  const handleEdit = (cat: InfoCategory) => {
    setEditingId(cat.id);
    setName(cat.name);
    setColorCode(cat.color_code);
    setSelectedIcon(cat.icon || "Info");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("info_categories").delete().eq("id", id);
    if (error) toast.error("Kunne ikke slette kategori");
    else {
      toast.success("Kategori slettet");
      fetchCategories();
      notifyChange();
    }
  };

  const resetForm = () => {
    setName("");
    setColorCode("#D2593A");
    setSelectedIcon("Info");
    setEditingId(null);
  };

  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className={className} /> : null;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium">{editingId ? "Rediger kategori" : "Opprett ny kategori"}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Navn</label>
            <Input placeholder="F.eks. Betaling" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Farge</label>
            <Input type="color" value={colorCode} onChange={(e) => setColorCode(e.target.value)} className="h-10" />
          </div>
          <Collapsible open={iconsExpanded} onOpenChange={setIconsExpanded}>
            <div className="flex items-center justify-between">
              <label className="text-sm text-muted-foreground">Ikon</label>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 px-2 gap-1">
                  <span className="flex items-center gap-1.5">
                    {renderIcon(selectedIcon, "h-4 w-4")}
                    <span className="text-xs">{selectedIcon}</span>
                  </span>
                  <ChevronRight className={`h-3 w-3 transition-transform ${iconsExpanded ? "rotate-90" : ""}`} />
                </Button>
              </CollapsibleTrigger>
            </div>
            <CollapsibleContent className="pt-2">
              <div className="flex flex-wrap gap-1">
                {iconOptions.map((icon) => (
                  <Button
                    key={icon}
                    type="button"
                    variant={selectedIcon === icon ? "default" : "ghost"}
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => { setSelectedIcon(icon); setIconsExpanded(false); }}
                  >
                    {renderIcon(icon, "h-4 w-4")}
                  </Button>
                ))}
              </div>
            </CollapsibleContent>
          </Collapsible>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading} size="sm">
              {loading ? "Lagrer..." : editingId ? "Oppdater" : "Opprett"}
            </Button>
            {editingId && (
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>Avbryt</Button>
            )}
          </div>
        </form>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Eksisterende kategorier</h3>
        <div className="space-y-1.5">
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen kategorier ennå</p>
          ) : (
            categories.map((cat, index) => (
              <div
                key={cat.id}
                className="flex items-center justify-between p-2 rounded-md border-l-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                style={{ borderLeftColor: cat.color_code }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleMove(cat.id, "up")} disabled={index === 0}>
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => handleMove(cat.id, "down")} disabled={index === categories.length - 1}>
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <div style={{ color: cat.color_code }}>{renderIcon(cat.icon, "h-4 w-4")}</div>
                  <span className="text-sm font-medium">{cat.name}</span>
                </div>
                <div className="flex gap-0.5">
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(cat)}>
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(cat.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
