import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Edit, ChevronUp, ChevronDown, ChevronRight } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Shift {
  id: string;
  name: string;
  color_code: string;
  icon: string;
  order_index: number;
}

const iconOptions = [
  "Sun", "Moon", "Cloud", "Sunrise", "Sunset", "Coffee", "Pizza", 
  "Home", "Briefcase", "Heart", "Star", "Clock", "Calendar"
];

interface ShiftManagerProps {
  onShiftChange?: () => void;
}

export function ShiftManager({ onShiftChange }: ShiftManagerProps) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [name, setName] = useState("");
  const [colorCode, setColorCode] = useState("#3b82f6");
  const [selectedIcon, setSelectedIcon] = useState("Sun");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [iconsExpanded, setIconsExpanded] = useState(false);

  const notifyChange = () => {
    if (onShiftChange) onShiftChange();
  };

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .order("order_index");

    if (error) {
      toast.error("Kunne ikke hente vakter");
    } else if (data) {
      setShifts(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Vennligst fyll ut navn");
      return;
    }

    setLoading(true);

    if (editingId) {
      const { error } = await supabase
        .from("shifts")
        .update({ name, color_code: colorCode, icon: selectedIcon })
        .eq("id", editingId);

      if (error) {
        toast.error("Kunne ikke oppdatere vakt");
      } else {
        toast.success("Vakt oppdatert!");
        resetForm();
        fetchShifts();
        notifyChange();
      }
    } else {
      const maxOrderIndex = shifts.length > 0 
        ? Math.max(...shifts.map(s => s.order_index)) + 1 
        : 0;
        
      const { error } = await supabase
        .from("shifts")
        .insert([{ name, color_code: colorCode, icon: selectedIcon, order_index: maxOrderIndex }]);

      if (error) {
        toast.error("Kunne ikke opprette vakt");
      } else {
        toast.success("Vakt opprettet!");
        resetForm();
        fetchShifts();
        notifyChange();
      }
    }

    setLoading(false);
  };

  const handleMoveShift = async (shiftId: string, direction: "up" | "down") => {
    const currentIndex = shifts.findIndex(s => s.id === shiftId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= shifts.length) return;

    const currentShift = shifts[currentIndex];
    const targetShift = shifts[targetIndex];

    const { error: error1 } = await supabase
      .from("shifts")
      .update({ order_index: targetShift.order_index })
      .eq("id", currentShift.id);

    const { error: error2 } = await supabase
      .from("shifts")
      .update({ order_index: currentShift.order_index })
      .eq("id", targetShift.id);

    if (error1 || error2) {
      toast.error("Kunne ikke flytte vakt");
    } else {
      fetchShifts();
    }
  };

  const handleEdit = (shift: Shift) => {
    setEditingId(shift.id);
    setName(shift.name);
    setColorCode(shift.color_code);
    setSelectedIcon(shift.icon || "Sun");
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("shifts")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Kunne ikke slette vakt");
    } else {
      toast.success("Vakt slettet");
      fetchShifts();
      notifyChange();
    }
  };

  const resetForm = () => {
    setName("");
    setColorCode("#3b82f6");
    setSelectedIcon("Sun");
    setEditingId(null);
  };

  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className={className} /> : null;
  };

  return (
    <div className="space-y-6">
      {/* Create/Edit Form */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium">{editingId ? "Rediger vakt" : "Opprett ny vakt"}</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Navn</label>
            <Input
              placeholder="F.eks. Morgen"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm text-muted-foreground mb-1.5 block">Farge</label>
            <Input
              type="color"
              value={colorCode}
              onChange={(e) => setColorCode(e.target.value)}
              className="h-10"
            />
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
                    onClick={() => {
                      setSelectedIcon(icon);
                      setIconsExpanded(false);
                    }}
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
              <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                Avbryt
              </Button>
            )}
          </div>
        </form>
      </div>

      {/* Existing Shifts */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">Eksisterende vakter</h3>
        <div className="space-y-1.5">
          {shifts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen vakter ennå</p>
          ) : (
            shifts.map((shift, index) => (
              <div
                key={shift.id}
                className="flex items-center justify-between p-2 rounded-md border-l-4 bg-muted/30 hover:bg-muted/50 transition-colors"
                style={{ borderLeftColor: shift.color_code }}
              >
                <div className="flex items-center gap-2">
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => handleMoveShift(shift.id, "up")}
                      disabled={index === 0}
                    >
                      <ChevronUp className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => handleMoveShift(shift.id, "down")}
                      disabled={index === shifts.length - 1}
                    >
                      <ChevronDown className="h-3 w-3" />
                    </Button>
                  </div>
                  <div style={{ color: shift.color_code }}>
                    {renderIcon(shift.icon, "h-4 w-4")}
                  </div>
                  <span className="text-sm font-medium">{shift.name}</span>
                </div>
                <div className="flex gap-0.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleEdit(shift)}
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => handleDelete(shift.id)}
                  >
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
