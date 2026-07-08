import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, Store as StoreIcon } from "lucide-react";

interface StoreRow {
  id: string;
  name: string;
  slug: string;
  color_code: string;
}

export function StoreManager() {
  const { refreshStores, isSuperAdmin } = useStore();
  const [stores, setStores] = useState<StoreRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StoreRow | null>(null);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [colorCode, setColorCode] = useState("#3b82f6");

  useEffect(() => {
    fetchStores();
  }, []);

  const fetchStores = async () => {
    const { data, error } = await supabase
      .from("stores")
      .select("id, name, slug, color_code")
      .order("name");
    if (error) {
      toast.error("Kunne ikke hente butikker");
    } else {
      setStores(data || []);
    }
    setLoading(false);
  };

  const openCreate = () => {
    setEditing(null);
    setName("");
    setSlug("");
    setColorCode("#3b82f6");
    setDialogOpen(true);
  };

  const openEdit = (s: StoreRow) => {
    setEditing(s);
    setName(s.name);
    setSlug(s.slug);
    setColorCode(s.color_code);
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      toast.error("Navn og slug er påkrevd");
      return;
    }

    if (editing) {
      const { error } = await supabase
        .from("stores")
        .update({ name, slug, color_code: colorCode })
        .eq("id", editing.id);
      if (error) return toast.error("Kunne ikke oppdatere butikk");
      toast.success("Butikk oppdatert");
    } else {
      const { error } = await supabase
        .from("stores")
        .insert({ name, slug, color_code: colorCode });
      if (error) return toast.error("Kunne ikke opprette butikk");
      toast.success("Butikk opprettet");
    }

    setDialogOpen(false);
    await fetchStores();
    await refreshStores();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Slett butikk? All tilhørende data vil forsvinne.")) return;
    const { error } = await supabase.from("stores").delete().eq("id", id);
    if (error) return toast.error("Kunne ikke slette butikk");
    toast.success("Butikk slettet");
    await fetchStores();
    await refreshStores();
  };

  if (loading) return <p className="text-sm text-muted-foreground">Laster...</p>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Butikker</CardTitle>
            <CardDescription>Administrer alle butikker</CardDescription>
          </div>
          {isSuperAdmin && (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              Ny butikk
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {stores.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ingen butikker ennå</p>
          ) : (
            stores.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between p-3 rounded-md border-l-4 bg-muted/30"
                style={{ borderLeftColor: s.color_code }}
              >
                <div className="flex items-center gap-3">
                  <StoreIcon className="h-4 w-4" style={{ color: s.color_code }} />
                  <div>
                    <p className="text-sm font-medium">{s.name}</p>
                    <p className="text-xs text-muted-foreground">/{s.slug}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(s)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent>
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>{editing ? "Rediger butikk" : "Ny butikk"}</DialogTitle>
                <DialogDescription>Butikker holder data helt separert</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Navn</Label>
                  <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Trondheim" />
                </div>
                <div>
                  <Label>Slug</Label>
                  <Input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                    placeholder="trondheim"
                  />
                </div>
                <div>
                  <Label>Farge</Label>
                  <Input type="color" value={colorCode} onChange={(e) => setColorCode(e.target.value)} className="h-10" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Avbryt
                </Button>
                <Button type="submit">{editing ? "Lagre" : "Opprett"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
