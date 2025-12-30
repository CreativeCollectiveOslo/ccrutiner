import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Trash2, Edit, ChevronUp, ChevronDown } from "lucide-react";
import * as LucideIcons from "lucide-react";

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
      toast.error("Udfyld venligst navn");
      return;
    }

    setLoading(true);

    if (editingId) {
      const { error } = await supabase
        .from("shifts")
        .update({ name, color_code: colorCode, icon: selectedIcon })
        .eq("id", editingId);

      if (error) {
        toast.error("Kunne ikke opdatere vagt");
      } else {
        toast.success("Vagt opdateret!");
        resetForm();
        fetchShifts();
        notifyChange();
      }
    } else {
      // Get the highest order_index and add 1
      const maxOrderIndex = shifts.length > 0 
        ? Math.max(...shifts.map(s => s.order_index)) + 1 
        : 0;
        
      const { error } = await supabase
        .from("shifts")
        .insert([{ name, color_code: colorCode, icon: selectedIcon, order_index: maxOrderIndex }]);

      if (error) {
        toast.error("Kunne ikke oprette vagt");
      } else {
        toast.success("Vagt oprettet!");
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

    // Swap order_index values
    const { error: error1 } = await supabase
      .from("shifts")
      .update({ order_index: targetShift.order_index })
      .eq("id", currentShift.id);

    const { error: error2 } = await supabase
      .from("shifts")
      .update({ order_index: currentShift.order_index })
      .eq("id", targetShift.id);

    if (error1 || error2) {
      toast.error("Kunne ikke flytte vagt");
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
      toast.error("Kunne ikke slette vagt");
    } else {
      toast.success("Vagt slettet");
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
      <Card>
        <CardHeader>
          <CardTitle>{editingId ? "Rediger vagt" : "Opret ny vagt"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Navn</label>
              <Input
                placeholder="F.eks. Morgen"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Farve</label>
              <Input
                type="color"
                value={colorCode}
                onChange={(e) => setColorCode(e.target.value)}
                className="h-12"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Ikon</label>
              <div className="grid grid-cols-6 gap-2">
                {iconOptions.map((icon) => (
                  <Button
                    key={icon}
                    type="button"
                    variant={selectedIcon === icon ? "default" : "outline"}
                    onClick={() => setSelectedIcon(icon)}
                    className="h-12"
                  >
                    {renderIcon(icon, "h-5 w-5")}
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={loading}>
                {loading ? "Gemmer..." : editingId ? "Opdater vagt" : "Opret vagt"}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Annuller
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eksisterende vakter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {shifts.length === 0 ? (
              <p className="text-muted-foreground">Ingen vakter endnu</p>
            ) : (
              shifts.map((shift, index) => (
                <Card key={shift.id} style={{ borderLeftColor: shift.color_code, borderLeftWidth: 4 }}>
                  <CardContent className="pt-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveShift(shift.id, "up")}
                            disabled={index === 0}
                          >
                            <ChevronUp className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => handleMoveShift(shift.id, "down")}
                            disabled={index === shifts.length - 1}
                          >
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </div>
                        <div style={{ color: shift.color_code }}>
                          {renderIcon(shift.icon, "h-6 w-6")}
                        </div>
                        <span className="font-medium">{shift.name}</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(shift)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(shift.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
