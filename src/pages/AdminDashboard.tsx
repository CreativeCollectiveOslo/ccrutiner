import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogOut, Plus, Trash2, Edit2, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.png";

interface Shift {
  id: string;
  name: string;
  color_code: string;
}

interface Routine {
  id: string;
  shift_id: string;
  title: string;
  description: string | null;
  priority: number;
  order_index: number;
}

export default function AdminDashboard() {
  const { user, signOut } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();

  const [newRoutine, setNewRoutine] = useState({
    title: "",
    description: "",
    priority: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchShifts();
  }, [user, navigate]);

  useEffect(() => {
    if (selectedShift) {
      fetchRoutines();
    }
  }, [selectedShift]);

  const fetchShifts = async () => {
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .order("name");

    if (error) {
      toast.error("Kunne ikke hente vagter");
      console.error(error);
    } else if (data) {
      setShifts(data);
      if (data.length > 0) {
        setSelectedShift(data[0].id);
      }
    }
    setLoading(false);
  };

  const fetchRoutines = async () => {
    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .eq("shift_id", selectedShift)
      .order("priority", { ascending: false })
      .order("order_index");

    if (error) {
      toast.error("Kunne ikke hente rutiner");
      console.error(error);
    } else if (data) {
      setRoutines(data);
    }
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedShift) {
      toast.error("Vælg en vagt først");
      return;
    }

    const { error } = await supabase.from("routines").insert({
      shift_id: selectedShift,
      title: newRoutine.title,
      description: newRoutine.description || null,
      priority: newRoutine.priority,
      order_index: routines.length,
    });

    if (error) {
      toast.error("Kunne ikke oprette rutine");
      console.error(error);
    } else {
      toast.success("Rutine oprettet!");
      setDialogOpen(false);
      setNewRoutine({ title: "", description: "", priority: 0 });
      fetchRoutines();
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    const { error } = await supabase
      .from("routines")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Kunne ikke slette rutine");
      console.error(error);
    } else {
      toast.success("Rutine slettet");
      fetchRoutines();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-accent">
      <header className="border-b bg-card/50 backdrop-blur">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Creative Collective" className="h-8 w-auto" />
            <h1 className="text-xl">Admin Dashboard</h1>
          </div>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Log ud
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="grid gap-6 md:grid-cols-[300px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Vagter</CardTitle>
              <CardDescription>Vælg en vagt at administrere</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {shifts.map((shift) => (
                <Button
                  key={shift.id}
                  variant={selectedShift === shift.id ? "default" : "outline"}
                  className="w-full justify-start"
                  onClick={() => setSelectedShift(shift.id)}
                >
                  {shift.name}
                </Button>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl">
                  {shifts.find((s) => s.id === selectedShift)?.name} Rutiner
                </h2>
                <p className="text-sm text-muted-foreground">
                  {routines.length} rutiner i alt
                </p>
              </div>

              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Ny Rutine
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleCreateRoutine}>
                    <DialogHeader>
                      <DialogTitle>Opret ny rutine</DialogTitle>
                      <DialogDescription>
                        Tilføj en ny rutine til{" "}
                        {shifts.find((s) => s.id === selectedShift)?.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Titel *</Label>
                        <Input
                          id="title"
                          value={newRoutine.title}
                          onChange={(e) =>
                            setNewRoutine({ ...newRoutine, title: e.target.value })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Beskrivelse</Label>
                        <Textarea
                          id="description"
                          value={newRoutine.description}
                          onChange={(e) =>
                            setNewRoutine({
                              ...newRoutine,
                              description: e.target.value,
                            })
                          }
                          rows={3}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="priority">Prioritet</Label>
                        <Input
                          id="priority"
                          type="number"
                          value={newRoutine.priority}
                          onChange={(e) =>
                            setNewRoutine({
                              ...newRoutine,
                              priority: parseInt(e.target.value) || 0,
                            })
                          }
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Opret rutine</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {routines.length === 0 ? (
                <Card>
                  <CardContent className="pt-6 text-center">
                    <p className="text-muted-foreground">
                      Ingen rutiner endnu. Opret den første!
                    </p>
                  </CardContent>
                </Card>
              ) : (
                routines.map((routine) => (
                  <Card key={routine.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{routine.title}</h3>
                            {routine.priority > 0 && (
                              <Badge variant="secondary">
                                Prioritet: {routine.priority}
                              </Badge>
                            )}
                          </div>
                          {routine.description && (
                            <p className="text-sm text-muted-foreground">
                              {routine.description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRoutine(routine.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
