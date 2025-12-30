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
import { LogOut, Plus, Trash2, Edit2, Loader2, ArrowLeft, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.png";
import { ShiftManager } from "@/components/ShiftManager";
import { AnnouncementManager } from "@/components/AnnouncementManager";

interface Shift {
  id: string;
  name: string;
  color_code: string;
  order_index: number;
}

interface Routine {
  id: string;
  shift_id: string;
  title: string;
  description: string | null;
  priority: number;
  order_index: number;
}

interface UserWithRole {
  id: string;
  name: string;
  email: string;
  roles: string[];
}

export default function AdminDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [activeTab, setActiveTab] = useState<"routines" | "users" | "shifts" | "announcements">("routines");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "employee">("employee");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const navigate = useNavigate();

  const [newRoutine, setNewRoutine] = useState({
    title: "",
    description: "",
    priority: 0,
  });

  const [editRoutine, setEditRoutine] = useState({
    title: "",
    description: "",
    priority: 0,
  });

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchShifts();
      fetchUsers();
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (selectedShift) {
      fetchRoutines();
    }
  }, [selectedShift]);

  const fetchUsers = async () => {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, email");

    if (profileError) {
      toast.error("Kunne ikke hente brukere");
      console.error(profileError);
      return;
    }

    const { data: roles, error: roleError } = await supabase
      .from("user_roles")
      .select("user_id, role");

    if (roleError) {
      console.error(roleError);
    }

    const usersWithRoles: UserWithRole[] = profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      roles: roles?.filter((r) => r.user_id === profile.id).map((r) => r.role) || [],
    }));

    setUsers(usersWithRoles);
  };

  const fetchShifts = async () => {
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .order("order_index");

    if (error) {
      toast.error("Kunne ikke hente vakter");
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
      toast.error("Velg en vakt først");
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
      toast.error("Kunne ikke opprette rutine");
      console.error(error);
    } else {
      toast.success("Rutine opprettet!");
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

  const handleOpenEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine);
    setEditRoutine({
      title: routine.title,
      description: routine.description || "",
      priority: routine.priority,
    });
    setEditDialogOpen(true);
  };

  const handleUpdateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingRoutine) return;

    const { error } = await supabase
      .from("routines")
      .update({
        title: editRoutine.title,
        description: editRoutine.description || null,
        priority: editRoutine.priority,
      })
      .eq("id", editingRoutine.id);

    if (error) {
      toast.error("Kunne ikke opdatere rutine");
      console.error(error);
    } else {
      toast.success("Rutine opdateret!");
      setEditDialogOpen(false);
      setEditingRoutine(null);
      fetchRoutines();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Er du sikker på at du vil slette denne brukeren?")) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Du skal være logget ind");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ userId }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Kunne ikke slette bruker");
      }

      toast.success("Bruker slettet!");
      fetchUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Kunne ikke slette bruker");
    }
  };

  const handleInviteUser = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail.trim()) {
      toast.error("Email er påkrævet");
      return;
    }

    setInviteLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Du skal være logget ind");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email: inviteEmail,
            name: inviteName,
            role: inviteRole,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Kunne ikke invitere bruker");
      }

      toast.success("Bruker inviteret! Standardpassword er: Creative1");
      setInviteEmail("");
      setInviteName("");
      setInviteRole("employee");
      setInviteDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast.error(error.message || "Kunne ikke invitere bruker");
    } finally {
      setInviteLoading(false);
    }
  };

  if (loading || authLoading) {
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
            Logg ut
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-6xl pb-20">
        <div className="mb-6">
          <div className="flex gap-2 flex-wrap">
            <Button
              variant={activeTab === "routines" ? "default" : "outline"}
              onClick={() => setActiveTab("routines")}
            >
              Rutiner
            </Button>
            <Button
              variant={activeTab === "shifts" ? "default" : "outline"}
              onClick={() => setActiveTab("shifts")}
            >
              Vakter
            </Button>
            <Button
              variant={activeTab === "announcements" ? "default" : "outline"}
              onClick={() => setActiveTab("announcements")}
            >
              Opdateringer
            </Button>
            <Button
              variant={activeTab === "users" ? "default" : "outline"}
              onClick={() => setActiveTab("users")}
            >
              Brukere & Roller
            </Button>
          </div>
        </div>

        {activeTab === "routines" ? (
          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            <Card>
              <CardHeader>
                <CardTitle>Vakter</CardTitle>
                <CardDescription>Velg en vakt å administrere</CardDescription>
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
                  {routines.length} rutiner totalt
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
                      <DialogTitle>Opprett ny rutine</DialogTitle>
                      <DialogDescription>
                        Legg til en ny rutine til{" "}
                        {shifts.find((s) => s.id === selectedShift)?.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Tittel *</Label>
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
                      <Button type="submit">Opprett rutine</Button>
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
                      Ingen rutiner ennå. Opprett den første!
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
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenEditRoutine(routine)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRoutine(routine.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Edit Routine Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
              <DialogContent>
                <form onSubmit={handleUpdateRoutine}>
                  <DialogHeader>
                    <DialogTitle>Rediger rutine</DialogTitle>
                    <DialogDescription>
                      Opdater rutinens detaljer
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-title">Tittel *</Label>
                      <Input
                        id="edit-title"
                        value={editRoutine.title}
                        onChange={(e) =>
                          setEditRoutine({ ...editRoutine, title: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-description">Beskrivelse</Label>
                      <Textarea
                        id="edit-description"
                        value={editRoutine.description}
                        onChange={(e) =>
                          setEditRoutine({
                            ...editRoutine,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="edit-priority">Prioritet</Label>
                      <Input
                        id="edit-priority"
                        type="number"
                        value={editRoutine.priority}
                        onChange={(e) =>
                          setEditRoutine({
                            ...editRoutine,
                            priority: parseInt(e.target.value) || 0,
                          })
                        }
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                      Annuller
                    </Button>
                    <Button type="submit">Gem ændringer</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        ) : activeTab === "shifts" ? (
          <ShiftManager />
        ) : activeTab === "announcements" ? (
          <AnnouncementManager />
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Brukeroversikt</CardTitle>
              <CardDescription>
                Se hvilke brukere som har admin-rettigheter
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users
                  .sort((a, b) => {
                    const aIsAdmin = a.roles.includes("admin");
                    const bIsAdmin = b.roles.includes("admin");
                    if (aIsAdmin && !bIsAdmin) return -1;
                    if (!aIsAdmin && bIsAdmin) return 1;
                    return a.name.localeCompare(b.name);
                  })
                  .map((user) => {
                    const isAdmin = user.roles.includes("admin");
                    return (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between p-4 rounded-lg border ${
                          isAdmin ? "bg-primary/5 border-primary" : ""
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium">{user.name}</h3>
                            {isAdmin && (
                              <Badge variant="default">Admin</Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteUser(user.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
              </div>
              <div className="mt-6 flex justify-center">
                <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Inviter Bruker
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Inviter ny bruker</DialogTitle>
                      <DialogDescription>
                        Angiv kun brukerens email. Standardpassword bliver "Creative1".
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleInviteUser} className="space-y-4">
                      <div>
                        <Label htmlFor="invite-email">Email *</Label>
                        <Input
                          id="invite-email"
                          type="email"
                          placeholder="bruker@eksempel.no"
                          value={inviteEmail}
                          onChange={(e) => setInviteEmail(e.target.value)}
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="invite-name">Navn (valgfrit)</Label>
                        <Input
                          id="invite-name"
                          placeholder="Navn på bruker"
                          value={inviteName}
                          onChange={(e) => setInviteName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="invite-role">Rolle</Label>
                        <Select
                          value={inviteRole}
                          onValueChange={(value: "admin" | "employee") => setInviteRole(value)}
                        >
                          <SelectTrigger id="invite-role">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="employee">Medarbejder</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setInviteDialogOpen(false)}
                        >
                          Annuller
                        </Button>
                        <Button type="submit" disabled={inviteLoading}>
                          {inviteLoading ? "Inviterer..." : "Inviter"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex justify-center">
          <Button variant="outline" onClick={() => navigate("/employee")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Til Medarbejder Visning
          </Button>
        </div>
      </footer>
    </div>
  );
}
