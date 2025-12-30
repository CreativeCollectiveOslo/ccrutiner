import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Loader2, Plus, Trash2, Settings, Bell, Calendar } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TaskCompletionAnimation } from "@/components/TaskCompletionAnimation";
import { NotificationsTab } from "@/components/NotificationsTab";
import logo from "@/assets/logo.png";

interface Shift {
  id: string;
  name: string;
  color_code: string;
  icon: string;
  order_index: number;
}

interface Routine {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  order_index: number;
  multimedia_url: string | null;
}

interface TaskCompletion {
  routine_id: string;
}

export default function EmployeeDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [mainTab, setMainTab] = useState<"shifts" | "notifications">("shifts");
  const [activeTab, setActiveTab] = useState<"tasks" | "admin">("tasks");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [newRoutine, setNewRoutine] = useState({
    title: "",
    description: "",
    priority: 0,
  });
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user) {
      fetchShifts();
      checkAdminStatus();
      fetchUnreadCount();
    }
  }, [user, authLoading, navigate]);

  const checkAdminStatus = async () => {
    if (!user) {
      console.log("checkAdminStatus: No user found");
      return;
    }

    console.log("checkAdminStatus: Checking for user", user.id);

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    console.log("checkAdminStatus result:", { data, error });

    if (!error && data) {
      console.log("Setting isAdmin to true");
      setIsAdmin(true);
    } else {
      console.log("User is not admin or error occurred");
    }
  };

  useEffect(() => {
    if (selectedShift) {
      fetchRoutines();
      fetchTodayCompletions();
    }
  }, [selectedShift]);

  // Check for date change every minute and reset tasks at midnight
  useEffect(() => {
    const checkDateChange = () => {
      const today = new Date().toISOString().split("T")[0];
      if (today !== currentDate) {
        setCurrentDate(today);
        setCompletions(new Set());
        if (selectedShift) {
          fetchTodayCompletions();
        }
        toast.success("Ny dag startet! Oppgaver er nullstilt 🌅");
      }
    };

    const interval = setInterval(checkDateChange, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [currentDate, selectedShift]);

  const fetchUnreadCount = async () => {
    if (!user) return;

    // Get user's profile created_at
    const { data: profile } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("id", user.id)
      .single();

    if (!profile) return;

    // Count unread announcements
    const { data: announcements } = await supabase
      .from("announcements")
      .select("id")
      .gte("created_at", profile.created_at);

    const { data: readAnnouncements } = await supabase
      .from("announcements_read")
      .select("announcement_id")
      .eq("user_id", user.id);

    const readAnnouncementIds = new Set(readAnnouncements?.map((r) => r.announcement_id) || []);
    const unreadAnnouncementCount = announcements?.filter((a) => !readAnnouncementIds.has(a.id)).length || 0;

    // Count unread routine notifications
    const { data: routineNotifications } = await supabase
      .from("routine_notifications")
      .select("id")
      .gte("created_at", profile.created_at);

    const { data: readRoutineNotifs } = await supabase
      .from("routine_notifications_read")
      .select("notification_id")
      .eq("user_id", user.id);

    const readRoutineIds = new Set(readRoutineNotifs?.map((r) => r.notification_id) || []);
    const unreadRoutineCount = routineNotifications?.filter((n) => !readRoutineIds.has(n.id)).length || 0;

    setUnreadCount(unreadAnnouncementCount + unreadRoutineCount);
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
    }
    setLoading(false);
  };

  const fetchRoutines = async () => {
    if (!selectedShift) return;

    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .eq("shift_id", selectedShift.id)
      .order("priority", { ascending: false })
      .order("order_index");

    if (error) {
      toast.error("Kunne ikke hente rutiner");
      console.error(error);
    } else if (data) {
      setRoutines(data);
    }
  };

  const fetchTodayCompletions = async () => {
    if (!user || !selectedShift) return;

    const today = new Date().toISOString().split("T")[0];

    const { data, error } = await supabase
      .from("task_completions")
      .select("routine_id")
      .eq("user_id", user.id)
      .eq("shift_date", today);

    if (error) {
      console.error(error);
    } else if (data) {
      setCompletions(new Set(data.map((c: TaskCompletion) => c.routine_id)));
    }
  };

  const toggleTaskCompletion = async (routineId: string) => {
    if (!user) return;

    const isCompleted = completions.has(routineId);
    const today = new Date().toISOString().split("T")[0];

    if (isCompleted) {
      const { error } = await supabase
        .from("task_completions")
        .delete()
        .eq("routine_id", routineId)
        .eq("user_id", user.id)
        .eq("shift_date", today);

      if (error) {
        toast.error("Kunne ikke oppdatere oppgave");
        console.error(error);
      } else {
        const newCompletions = new Set(completions);
        newCompletions.delete(routineId);
        setCompletions(newCompletions);
      }
    } else {
      const { error } = await supabase.from("task_completions").insert({
        routine_id: routineId,
        user_id: user.id,
        shift_date: today,
      });

      if (error) {
        toast.error("Kunne ikke oppdatere oppgave");
        console.error(error);
      } else {
        const newCompletions = new Set(completions);
        newCompletions.add(routineId);
        setCompletions(newCompletions);
        
        // Show celebration toast
        toast.success("Bra jobba! 🎉", {
          description: "Oppgave fullført",
        });
      }
    }
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedShift) {
      toast.error("Velg en vakt først");
      return;
    }

    const { error } = await supabase.from("routines").insert({
      shift_id: selectedShift.id,
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

  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className={className} /> : <LucideIcons.Sun className={className} />;
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
            <h1 className="text-xl">Mine Rutiner</h1>
          </div>
          <Button variant="ghost" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Logg ut
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl pb-20">
        {!selectedShift ? (
          <>
            {/* Main tabs - only visible on front page */}
            <div className="flex border-b border-border mb-6">
              <button
                onClick={() => setMainTab("shifts")}
                className={`px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-2 ${
                  mainTab === "shifts"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Calendar className="h-4 w-4" />
                Vakter
                {mainTab === "shifts" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
              <button
                onClick={() => setMainTab("notifications")}
                className={`px-4 py-2 text-sm font-medium transition-colors relative flex items-center gap-2 ${
                  mainTab === "notifications"
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Bell className="h-4 w-4" />
                Notifikationer
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full" />
                )}
                {mainTab === "notifications" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>

            {mainTab === "notifications" ? (
              <NotificationsTab onMarkAsRead={() => setUnreadCount((prev) => Math.max(0, prev - 1))} />
            ) : (
              <div className="space-y-8">
                <div className="text-center space-y-2">
                  <h2 className="text-2xl">Velg din vakt</h2>
                  <p className="text-sm text-muted-foreground">
                    Velg hvilken vakt du har i dag
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {shifts.map((shift) => {
                    return (
                      <Card
                        key={shift.id}
                        className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                        onClick={() => setSelectedShift(shift)}
                      >
                        <CardHeader className="text-center">
                          <div
                            className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
                            style={{ backgroundColor: shift.color_code }}
                          >
                            {renderIcon(shift.icon || "Sun", "h-8 w-8 text-white")}
                          </div>
                          <CardTitle>{shift.name}</CardTitle>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-6">
            {/* Back button above title */}
            <button
              onClick={() => setSelectedShift(null)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              ← Tilbake
            </button>

            <div>
              <h2 className="text-2xl">{selectedShift.name}</h2>
              <p className="text-sm text-muted-foreground">
                {completions.size} av {routines.length} oppgaver fullført
              </p>
            </div>

            {isAdmin && (
              <div className="flex border-b border-border">
                <button
                  onClick={() => setActiveTab("tasks")}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    activeTab === "tasks"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Mine oppgaver
                  {activeTab === "tasks" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  onClick={() => setActiveTab("admin")}
                  className={`px-4 py-2 text-sm font-medium transition-colors relative ${
                    activeTab === "admin"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Administrer rutiner
                  {activeTab === "admin" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              </div>
            )}

            {activeTab === "tasks" ? (
              <div className="space-y-4">
                {routines.length === 0 ? (
                  <Card>
                    <CardContent className="p-6 text-center">
                      <p className="text-sm text-muted-foreground">
                        Ingen rutiner for denne vakten ennå
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  routines.map((routine) => {
                    const isCompleted = completions.has(routine.id);
                    return (
                      <Card
                        key={routine.id}
                        className={`relative transition-all ${
                          isCompleted ? "opacity-60 animate-celebrate" : ""
                        }`}
                      >
                        <TaskCompletionAnimation isCompleted={isCompleted} />
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={isCompleted ? "animate-check-bounce" : ""}>
                              <Checkbox
                                id={routine.id}
                                checked={isCompleted}
                                onCheckedChange={() => toggleTaskCompletion(routine.id)}
                                className="mt-0.5"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <label
                                htmlFor={routine.id}
                                className={`text-sm font-medium cursor-pointer ${
                                  isCompleted ? "line-through" : ""
                                }`}
                              >
                                {routine.title}
                              </label>
                              {routine.description && (
                                <p className="text-sm text-muted-foreground">
                                  {routine.description}
                                </p>
                              )}
                              {routine.priority > 0 && (
                                <Badge variant="secondary">
                                  Prioritet: {routine.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-medium">Administrer rutiner</h3>
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
                            Legg til en ny rutine til {selectedShift.name}
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
            )}
          </div>
        )}
      </main>

      {isAdmin && (
        <footer className="fixed bottom-0 left-0 right-0 border-t bg-card/95 backdrop-blur">
          <div className="container mx-auto px-4 py-3 flex justify-center">
            <Button variant="outline" onClick={() => navigate("/admin")}>
              <Settings className="h-4 w-4 mr-2" />
              Admin Dashboard
            </Button>
          </div>
        </footer>
      )}
    </div>
  );
}
