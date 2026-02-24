import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, ShoppingCart } from "lucide-react";

interface ShoppingItem {
  id: string;
  title: string;
  completed: boolean;
  completed_by: string | null;
  created_by: string;
  created_at: string;
}

interface UserProfile {
  id: string;
  name: string;
}

export function ShoppingList() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [profiles, setProfiles] = useState<Map<string, string>>(new Map());
  const [newItem, setNewItem] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchItems();
    fetchProfiles();

    // Realtime subscription
    const channel = supabase
      .channel("shopping_items")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shopping_items" },
        () => fetchItems()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProfiles = async () => {
    const { data } = await supabase.from("profiles").select("id, name");
    if (data) {
      const map = new Map<string, string>();
      data.forEach((p: UserProfile) => map.set(p.id, p.name));
      setProfiles(map);
    }
  };

  const fetchItems = async () => {
    const { data, error } = await supabase
      .from("shopping_items")
      .select("*")
      .order("completed")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
    } else {
      setItems((data as ShoppingItem[]) || []);
    }
    setLoading(false);
  };

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newItem.trim()) return;

    setSubmitting(true);
    const { error } = await supabase.from("shopping_items").insert({
      title: newItem.trim(),
      created_by: user.id,
    } as any);

    if (error) {
      toast.error("Kunne ikke legge til vare");
      console.error(error);
    } else {
      setNewItem("");
    }
    setSubmitting(false);
  };

  const toggleItem = async (item: ShoppingItem) => {
    const newCompleted = !item.completed;
    const { error } = await supabase
      .from("shopping_items")
      .update({
        completed: newCompleted,
        completed_by: newCompleted ? user?.id : null,
      } as any)
      .eq("id", item.id);

    if (error) {
      toast.error("Kunne ikke oppdatere vare");
      console.error(error);
    }
  };

  const removeCompleted = async () => {
    const completedIds = items.filter((i) => i.completed).map((i) => i.id);
    if (completedIds.length === 0) return;

    const { error } = await supabase
      .from("shopping_items")
      .delete()
      .in("id", completedIds);

    if (error) {
      toast.error("Kunne ikke fjerne varer");
      console.error(error);
    } else {
      toast.success("Avkryssede varer fjernet");
    }
  };

  const getName = (id: string) => profiles.get(id) || "Ukjent";
  const hasCompleted = items.some((i) => i.completed);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add item form */}
      <form onSubmit={addItem} className="flex gap-2">
        <Input
          placeholder="Legg til vare..."
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" size="icon" disabled={submitting || !newItem.trim()}>
          <Plus className="h-4 w-4" />
        </Button>
      </form>

      {/* Items */}
      {items.length === 0 ? (
        <Card>
          <CardContent className="py-12 px-4 text-center">
            <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Handlelisten er tom</h3>
            <p className="text-sm text-muted-foreground">
              Legg til varer ovenfor
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <Card key={item.id} className={item.completed ? "opacity-60" : ""}>
              <CardContent className="p-3 flex items-center gap-3">
                <Checkbox
                  checked={item.completed}
                  onCheckedChange={() => toggleItem(item)}
                />
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${item.completed ? "line-through text-muted-foreground" : ""}`}>
                    {item.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.completed
                      ? `Kjøpt av ${getName(item.completed_by!)}`
                      : `Lagt til av ${getName(item.created_by)}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Remove completed button */}
      {hasCompleted && (
        <Button variant="outline" size="sm" onClick={removeCompleted} className="w-full">
          <Trash2 className="h-4 w-4 mr-2" />
          Fjern avkryssede
        </Button>
      )}
    </div>
  );
}
