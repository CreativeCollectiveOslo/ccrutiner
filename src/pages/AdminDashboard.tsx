import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { StoreBar } from "@/components/StoreBar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { LogOut, Plus, Trash2, Loader2, ArrowLeft, Settings2, KeyRound, Info, Store as StoreIcon, Users as UsersIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import logo from "@/assets/logo.png";
import { ShiftManager } from "@/components/ShiftManager";
import { AnnouncementManager } from "@/components/AnnouncementManager";
import { SectionManager } from "@/components/SectionManager";
import { ViktigInfoManager } from "@/components/ViktigInfoManager";
import { StoreManager } from "@/components/StoreManager";


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
  has_logged_in: boolean;
}

export default function AdminDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { activeStore, availableStores, isSuperAdmin } = useStore();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [userStoreMemberships, setUserStoreMemberships] = useState<Record<string, string[]>>({});
  const [activeTab, setActiveTab] = useState<"routines" | "users" | "announcements" | "info" | "stores">("routines");
  const [shiftManagerOpen, setShiftManagerOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "employee">("employee");
  const [inviteStoreIds, setInviteStoreIds] = useState<string[]>([]);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState<string | null>(null);
  const [storeEditorUserId, setStoreEditorUserId] = useState<string | null>(null);
  const [storeEditorSelection, setStoreEditorSelection] = useState<string[]>([]);
  const [storeEditorSaving, setStoreEditorSaving] = useState(false);
  
  
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const navigate = useNavigate();

  // Server-side admin role verification
  useEffect(() => {
    const verifyAdminRole = async () => {
      if (!user) return;
      
      const { data: roles, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      
      if (error || !roles) {
        // Not an admin, redirect to employee dashboard
        navigate("/employee");
        return;
      }
      
      setIsAdmin(true);
    };

    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      verifyAdminRole();
    }
  }, [user, authLoading, navigate]);

  // Only fetch data after admin verification
  useEffect(() => {
    if (isAdmin && activeStore) {
      fetchShifts();
      fetchUsers();
    }
  }, [isAdmin, activeStore]);

  const fetchUsers = async () => {
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, email, has_logged_in");

    if (profileError) {
      toast.error("Kunne ikke hente brukere");
      console.error(profileError);
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const { data: memberships } = await supabase
      .from("store_members")
      .select("user_id, store_id");

    const membershipMap: Record<string, string[]> = {};
    (memberships || []).forEach((m: any) => {
      if (!membershipMap[m.user_id]) membershipMap[m.user_id] = [];
      membershipMap[m.user_id].push(m.store_id);
    });
    setUserStoreMemberships(membershipMap);

    const usersWithRoles: UserWithRole[] = profiles.map((profile) => ({
      id: profile.id,
      name: profile.name,
      email: profile.email,
      roles: roles?.filter((r) => r.user_id === profile.id).map((r) => r.role) || [],
      has_logged_in: profile.has_logged_in || false,
    }));

    setUsers(usersWithRoles);
  };

  const fetchShifts = async () => {
    if (!activeStore) return;
    const { data, error } = await supabase
      .from("shifts")
      .select("*")
      .eq("store_id", activeStore.id)
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
        toast.error("Du må være logget inn");
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
      toast.error("E-post er påkrevd");
      return;
    }
    if (inviteRole === "employee" && inviteStoreIds.length === 0) {
      toast.error("Velg minst én butikk for medarbeideren");
      return;
    }

    setInviteLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        toast.error("Du må være logget inn");
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
            store_ids: inviteRole === "employee" ? inviteStoreIds : [],
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Kunne ikke invitere bruker");
      }

      toast.success(`Bruker invitert! Passord: ${result.generatedPassword}`, {
        duration: 10000,
      });
      setInviteEmail("");
      setInviteName("");
      setInviteRole("employee");
      setInviteStoreIds(activeStore ? [activeStore.id] : []);
      setInviteDialogOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error("Error inviting user:", error);
      toast.error(error.message || "Kunne ikke invitere bruker");
    } finally {
      setInviteLoading(false);
    }
  };

  const toggleInviteStore = (id: string) => {
    setInviteStoreIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const openStoreEditor = (userId: string) => {
    setStoreEditorUserId(userId);
    setStoreEditorSelection(userStoreMemberships[userId] || []);
  };

  const toggleStoreEditor = (id: string) => {
    setStoreEditorSelection((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const saveStoreEditor = async () => {
    if (!storeEditorUserId) return;
    setStoreEditorSaving(true);
    try {
      const current = new Set(userStoreMemberships[storeEditorUserId] || []);
      const next = new Set(storeEditorSelection);
      const toAdd = [...next].filter((id) => !current.has(id));
      const toRemove = [...current].filter((id) => !next.has(id));

      if (toRemove.length > 0) {
        const { error } = await supabase
          .from("store_members")
          .delete()
          .eq("user_id", storeEditorUserId)
          .in("store_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length > 0) {
        const { error } = await supabase
          .from("store_members")
          .insert(toAdd.map((store_id) => ({ store_id, user_id: storeEditorUserId })));
        if (error) throw error;
      }

      toast.success("Butikktilgang oppdatert");
      setStoreEditorUserId(null);
      fetchUsers();
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Kunne ikke oppdatere butikktilgang");
    } finally {
      setStoreEditorSaving(false);
    }
  };

  const handleResetPassword = async (userId: string) => {
    if (!confirm("Er du sikker på at du vil resette passordet for denne brukeren?")) {
      return;
    }

    setResetLoading(userId);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Du må være logget inn");
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/reset-password`,
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
        throw new Error(result.error || "Kunne ikke resette passord");
      }

      toast.success(`Nytt passord: ${result.newPassword}`, {
        duration: 10000,
      });
      fetchUsers();
    } catch (error: any) {
      console.error("Error resetting password:", error);
      toast.error(error.message || "Kunne ikke resette passord");
    } finally {
      setResetLoading(null);
    }
  };


  if (loading || authLoading || isAdmin === null) {
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
            <div className="leading-tight">
              <h1 className="text-xl">Admin Dashboard</h1>
              {activeStore && availableStores.length <= 1 && (
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground -mt-0.5">
                  {activeStore.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={signOut} title="Logg ut">
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Logg ut</span>
            </Button>
          </div>
        </div>
      </header>

      <StoreBar />

      <main className="container mx-auto px-4 py-6 max-w-6xl pb-20">
        {/* Global (cross-store) nav pills */}
        <div className="mb-4 flex justify-end gap-2">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wider uppercase transition-colors ${
              activeTab === "users"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
            }`}
          >
            <UsersIcon className="h-3 w-3" />
            Brukere
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab("stores")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-bold tracking-wider uppercase transition-colors ${
                activeTab === "stores"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-primary/10 text-primary border-primary/20 hover:bg-primary/15"
              }`}
            >
              <StoreIcon className="h-3 w-3" />
              Butikker
            </button>
          )}
        </div>

        {/* Scoped (per-store) tab bar */}
        <div className="mb-6">
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab("routines")}
              className={`flex-1 px-2 py-3 text-xs sm:text-sm font-medium transition-colors relative ${
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
              className={`flex-1 px-2 py-3 text-xs sm:text-sm font-medium transition-colors relative ${
                activeTab === "announcements"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Oppdateringer
              {activeTab === "announcements" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab("info")}
              className={`flex-1 px-2 py-3 text-xs sm:text-sm font-medium transition-colors relative ${
                activeTab === "info"
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Info
              {activeTab === "info" && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>
        </div>


        {activeTab === "routines" ? (
          <div className="space-y-6">
            {/* Horizontal shift carousel */}
            <div className="flex items-center gap-2">
              <div className="flex gap-2 overflow-x-auto pb-1 flex-1 min-w-0">
                {shifts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Ingen vakter ennå.
                  </p>
                ) : (
                  shifts.map((shift) => {
                    const isActive = selectedShift === shift.id;
                    return (
                      <button
                        key={shift.id}
                        onClick={() => setSelectedShift(shift.id)}
                        className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap ${
                          isActive
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                        style={isActive ? { backgroundColor: shift.color_code } : {}}
                      >
                        {shift.name}
                      </button>
                    );
                  })
                )}
              </div>
              <Sheet open={shiftManagerOpen} onOpenChange={setShiftManagerOpen}>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" title="Rediger vakter">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
                  <SheetHeader>
                   <SheetTitle>Administrer vakter</SheetTitle>
                   <SheetDescription>
                     Opprett, rediger og omorganiser vakter
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6">
                    <ShiftManager onShiftChange={fetchShifts} />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {selectedShift && (
              <SectionManager shiftId={selectedShift} shifts={shifts} />
            )}
          </div>
        ) : activeTab === "announcements" ? (
          <AnnouncementManager />
        ) : activeTab === "info" ? (
          <ViktigInfoManager />
        ) : activeTab === "stores" ? (
          <StoreManager />
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
                    const rank = (u: UserWithRole) =>
                      u.roles.includes("super_admin") ? 0 : u.roles.includes("admin") ? 1 : 2;
                    const rd = rank(a) - rank(b);
                    if (rd !== 0) return rd;
                    return a.name.localeCompare(b.name);
                  })
                  .map((userItem) => {
                    const isSuper = userItem.roles.includes("super_admin");
                    const isAdmin = userItem.roles.includes("admin") || isSuper;
                    const isEmployee = userItem.roles.includes("employee") && !isAdmin;
                    const memberships = userStoreMemberships[userItem.id] || [];
                    const memberStoreNames = memberships
                      .map((sid) => availableStores.find((s) => s.id === sid)?.name)
                      .filter(Boolean) as string[];
                    return (
                      <div
                        key={userItem.id}
                        className={`rounded-2xl border overflow-hidden flex flex-col ${
                          isSuper
                            ? "bg-primary/10 border-primary/40"
                            : isAdmin
                            ? "bg-primary/5 border-primary/25"
                            : "bg-card border-border"
                        }`}
                      >
                        {/* Identity block */}
                        <div className="p-5 pb-4">
                          <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0 flex-1">
                              <h3 className="text-2xl leading-none text-foreground font-light truncate">
                                {userItem.name || "Uten navn"}
                              </h3>
                              <p className="mt-1.5 text-xs text-muted-foreground truncate">
                                {userItem.email}
                              </p>
                            </div>
                            {isSuper ? (
                              <span className="shrink-0 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold tracking-wider uppercase">
                                Super-admin
                              </span>
                            ) : isAdmin ? (
                              <span className="shrink-0 px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-semibold tracking-wider uppercase">
                                Admin
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {/* Meta / status */}
                        {(userItem.has_logged_in || isSuper || memberStoreNames.length > 0) && (
                          <div className="px-5 pb-5 flex flex-wrap gap-2">
                            {userItem.has_logged_in && (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span className="text-[11px] font-medium">Har logget inn</span>
                              </div>
                            )}
                            {isSuper ? (
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 border border-primary/15 text-foreground/80">
                                <StoreIcon className="w-3 h-3 text-primary" />
                                <span className="text-[11px] font-medium">Alle butikker</span>
                              </div>
                            ) : (
                              memberStoreNames.map((n) => (
                                <div
                                  key={n}
                                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/60 border border-primary/15 text-foreground/80"
                                >
                                  <StoreIcon className="w-3 h-3 text-primary" />
                                  <span className="text-[11px] font-medium">{n}</span>
                                </div>
                              ))
                            )}
                          </div>
                        )}

                        {/* Action footer */}
                        <div className="mt-auto border-t border-primary/10 bg-background/40 p-3 flex items-center justify-between gap-2">
                          <div className="flex gap-2 flex-wrap">
                            {!isSuper && (
                              <button
                                onClick={() => openStoreEditor(userItem.id)}
                                className="flex items-center gap-2 px-3 py-2 bg-card border border-primary/20 rounded-lg text-foreground active:bg-primary/5 transition-colors"
                                title="Endre butikktilgang"
                              >
                                <StoreIcon className="w-4 h-4 text-primary" />
                                <span className="text-xs font-semibold uppercase tracking-tight">Butikker</span>
                              </button>
                            )}
                            <button
                              onClick={() => handleResetPassword(userItem.id)}
                              disabled={resetLoading === userItem.id}
                              className="flex items-center gap-2 px-3 py-2 bg-card border border-primary/20 rounded-lg text-foreground active:bg-primary/5 transition-colors disabled:opacity-60"
                            >
                              {resetLoading === userItem.id ? (
                                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                              ) : (
                                <KeyRound className="w-4 h-4 text-primary" />
                              )}
                              <span className="text-xs font-semibold uppercase tracking-tight">Reset</span>
                            </button>
                          </div>
                          <button
                            onClick={() => handleDeleteUser(userItem.id)}
                            className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                            title="Slett bruker"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
              <div className="mt-6 flex justify-center">
                <Dialog open={inviteDialogOpen} onOpenChange={(o) => {
                  setInviteDialogOpen(o);
                  if (o && inviteStoreIds.length === 0 && activeStore) {
                    setInviteStoreIds([activeStore.id]);
                  }
                }}>
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
                         Et unikt passord vil bli generert automatisk.
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
                        <Label htmlFor="invite-name">Navn (valgfritt)</Label>
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
                            <SelectItem value="employee">Medarbeider</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {inviteRole === "employee" && (
                        <div>
                          <Label>Butikker *</Label>
                          <div className="mt-2 space-y-2 rounded-md border p-3">
                            {availableStores.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Ingen butikker tilgjengelig</p>
                            ) : (
                              availableStores.map((s) => (
                                <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                                  <Checkbox
                                    checked={inviteStoreIds.includes(s.id)}
                                    onCheckedChange={() => toggleInviteStore(s.id)}
                                  />
                                  <span className="text-sm">{s.name}</span>
                                </label>
                              ))
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">Velg én eller flere butikker medarbeideren skal ha tilgang til</p>
                        </div>
                      )}
                       <DialogFooter>
                         <Button
                           type="button"
                           variant="outline"
                           onClick={() => setInviteDialogOpen(false)}
                         >
                           Avbryt
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

        <Dialog open={storeEditorUserId !== null} onOpenChange={(o) => !o && setStoreEditorUserId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Butikktilgang</DialogTitle>
              <DialogDescription>
                Velg hvilke butikker brukeren skal ha tilgang til. Admin har alltid tilgang til alle butikker uansett.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 rounded-md border p-3">
              {availableStores.length === 0 ? (
                <p className="text-xs text-muted-foreground">Ingen butikker tilgjengelig</p>
              ) : (
                availableStores.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={storeEditorSelection.includes(s.id)}
                      onCheckedChange={() => toggleStoreEditor(s.id)}
                    />
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: s.color_code }}
                    />
                    <span className="text-sm">{s.name}</span>
                  </label>
                ))
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStoreEditorUserId(null)}>
                Avbryt
              </Button>
              <Button onClick={saveStoreEditor} disabled={storeEditorSaving}>
                {storeEditorSaving ? "Lagrer..." : "Lagre"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>


      </main>

      <footer className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur">
        <div className="container mx-auto px-4 py-3 flex justify-center">
          <Button variant="outline" onClick={() => navigate("/employee")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Til Medarbeider-visning
          </Button>
        </div>
      </footer>
    </div>
  );
}
