import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { LogOut, Plus, Trash2, Loader2, ArrowLeft, Settings2 } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.png";
import { ShiftManager } from "@/components/ShiftManager";
import { AnnouncementManager } from "@/components/AnnouncementManager";
import { SectionManager } from "@/components/SectionManager";

interface Shift {
  id: string;
  name: string;
  color_code: string;
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
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [activeTab, setActiveTab] = useState<"routines" | "users" | "announcements">("routines");
  const [shiftManagerOpen, setShiftManagerOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "employee">("employee");
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const navigate = useNavigate();

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

      toast.success(`Bruker inviteret! Password: ${result.generatedPassword}`, {
        duration: 10000,
      });
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
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("routines")}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeTab === "routines"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Rutiner
              {activeTab === "routines" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("announcements")}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeTab === "announcements"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Opdateringer
              {activeTab === "announcements" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("users")}
              className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                activeTab === "users"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Brukere & Roller
              {activeTab === "users" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>

        {activeTab === "routines" ? (
          <div className="grid gap-6 md:grid-cols-[300px_1fr]">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div>
                  <CardTitle>Vakter</CardTitle>
                  <CardDescription>Velg en vakt å administrere</CardDescription>
                </div>
                <Sheet open={shiftManagerOpen} onOpenChange={setShiftManagerOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="Rediger vakter">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                    <SheetHeader>
                      <SheetTitle>Administrer vakter</SheetTitle>
                      <SheetDescription>
                        Opret, rediger og omarranger vakter
                      </SheetDescription>
                    </SheetHeader>
                    <div className="mt-6">
                      <ShiftManager onShiftChange={fetchShifts} />
                    </div>
                  </SheetContent>
                </Sheet>
              </CardHeader>
              <CardContent className="space-y-2">
                {shifts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ingen vakter endnu. Klik på tandhjulet for at oprette.
                  </p>
                ) : (
                  shifts.map((shift) => (
                    <Button
                      key={shift.id}
                      variant={selectedShift === shift.id ? "default" : "outline"}
                      className="w-full justify-start"
                      onClick={() => setSelectedShift(shift.id)}
                    >
                      {shift.name}
                    </Button>
                  ))
                )}
              </CardContent>
            </Card>

            {selectedShift && (
              <SectionManager shiftId={selectedShift} shifts={shifts} />
            )}
          </div>
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
                        Et unikt password vil blive genereret automatisk.
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
