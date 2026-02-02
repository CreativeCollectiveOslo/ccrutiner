import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Loader2, Bell, Calendar, ChevronDown, ChevronUp, Settings, Smartphone, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import * as LucideIcons from "lucide-react";
import { TaskCompletionAnimation } from "@/components/TaskCompletionAnimation";
import { NotificationsTab } from "@/components/NotificationsTab";
import { UnreadNotificationsBanner } from "@/components/UnreadNotificationsBanner";
import { Switch } from "@/components/ui/switch";
import { useWakeLock } from "@/hooks/use-wake-lock";
import logo from "@/assets/logo.png";

interface RoutineInfo {
  id: string;
  title: string;
  description: string | null;
  priority: number;
}

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  created_by: string;
  type: "announcement";
}

interface RoutineNotification {
  id: string;
  routine_id: string;
  shift_id: string;
  message: string;
  created_at: string;
  created_by: string | null;
  routines: RoutineInfo | null;
  type: "routine";
}

type NotificationItem = (Announcement & { type: "announcement" }) | (RoutineNotification & { type: "routine" });

interface UserProfile {
  id: string;
  name: string;
}

interface Shift {
  id: string;
  name: string;
  color_code: string;
  icon: string;
  order_index: number;
}

interface Section {
  id: string;
  name: string;
  order_index: number;
}

interface Routine {
  id: string;
  title: string;
  description: string | null;
  priority: number;
  order_index: number;
  multimedia_url: string | null;
  section_id: string | null;
}

interface TaskCompletion {
  routine_id: string;
}

export default function EmployeeDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [mainTab, setMainTab] = useState<"shifts" | "notifications">("shifts");
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState<NotificationItem[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [shiftProgress, setShiftProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const { isSupported: wakeLockSupported, isActive: wakeLockActive, toggleWakeLock } = useWakeLock();
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
      fetchAllShiftProgress();
      fetchProfiles();
    }
  }, [user, authLoading, navigate]);

  const checkAdminStatus = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!error && data) {
      setIsAdmin(true);
    }
  };

  const fetchProfiles = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name");

    if (!error && data) {
      setProfiles(data);
    }
  };

  useEffect(() => {
    if (selectedShift) {
      fetchSections();
      fetchRoutines();
      fetchCompletions();
    }
  }, [selectedShift]);

  const fetchSections = async () => {
    if (!selectedShift) return;

    const { data, error } = await supabase
      .from("sections")
      .select("*")
      .eq("shift_id", selectedShift.id)
      .order("order_index");

    if (error) {
      console.error(error);
    } else if (data) {
      setSections(data);
    }
  };

  // Removed midnight reset timer - tasks now persist until manually cleared

  const fetchUnreadCount = async () => {
    if (!user) return;

    // Get user's profile created_at
    const { data: profile } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("id", user.id)
      .single();

    if (!profile) return;

    // Fetch announcements
    const { data: announcements } = await supabase
      .from("announcements")
      .select("*")
      .gte("created_at", profile.created_at)
      .order("created_at", { ascending: false });

    // Fetch read announcements
    const { data: readAnnouncements } = await supabase
      .from("announcements_read")
      .select("announcement_id")
      .eq("user_id", user.id);

    const readAnnouncementIds = new Set(readAnnouncements?.map((r) => r.announcement_id) || []);

    // Fetch routine notifications with routine data
    const { data: routineNotifications } = await supabase
      .from("routine_notifications")
      .select(`
        *,
        routines (
          id,
          title,
          description,
          priority
        )
      `)
      .gte("created_at", profile.created_at)
      .order("created_at", { ascending: false });

    // Fetch read routine notifications
    const { data: readRoutineNotifs } = await supabase
      .from("routine_notifications_read")
      .select("notification_id")
      .eq("user_id", user.id);

    const readRoutineIds = new Set(readRoutineNotifs?.map((r) => r.notification_id) || []);

    // Filter unread notifications
    const unreadAnnouncements = announcements?.filter((a) => !readAnnouncementIds.has(a.id)) || [];
    const unreadRoutineNotifs = routineNotifications?.filter((n) => !readRoutineIds.has(n.id)) || [];

    // Combine unread notifications
    const allUnread: NotificationItem[] = [
      ...unreadAnnouncements.map((a) => ({ ...a, type: "announcement" as const })),
      ...unreadRoutineNotifs.map((r) => ({ ...r, type: "routine" as const })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setUnreadNotifications(allUnread);
    setUnreadCount(allUnread.length);
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

  const fetchAllShiftProgress = async () => {
    // Fetch all routines grouped by shift
    const { data: allRoutines, error: routinesError } = await supabase
      .from("routines")
      .select("id, shift_id");

    if (routinesError) {
      console.error(routinesError);
      return;
    }

    // Fetch ALL completions (from all users, no date filter)
    const { data: allCompletions, error: completionsError } = await supabase
      .from("task_completions")
      .select("routine_id");

    if (completionsError) {
      console.error(completionsError);
      return;
    }

    const completedRoutineIds = new Set(allCompletions?.map((c) => c.routine_id) || []);

    // Calculate progress per shift
    const progress: Record<string, { completed: number; total: number }> = {};
    
    allRoutines?.forEach((routine) => {
      if (!progress[routine.shift_id]) {
        progress[routine.shift_id] = { completed: 0, total: 0 };
      }
      progress[routine.shift_id].total += 1;
      if (completedRoutineIds.has(routine.id)) {
        progress[routine.shift_id].completed += 1;
      }
    });

    setShiftProgress(progress);
  };

  const fetchRoutines = async () => {
    if (!selectedShift) return;

    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .eq("shift_id", selectedShift.id)
      .order("order_index");

    if (error) {
      toast.error("Kunne ikke hente rutiner");
      console.error(error);
    } else if (data) {
      setRoutines(data);
    }
  };

  const toggleDescription = (routineId: string) => {
    setExpandedDescriptions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(routineId)) {
        newSet.delete(routineId);
      } else {
        newSet.add(routineId);
      }
      return newSet;
    });
  };

  const getRoutinesBySection = (sectionId: string | null) => {
    return routines.filter((r) => r.section_id === sectionId);
  };

  const fetchCompletions = async () => {
    if (!selectedShift) return;

    // Fetch ALL completions for the selected shift's routines (from all users, no date filter)
    const { data: shiftRoutines } = await supabase
      .from("routines")
      .select("id")
      .eq("shift_id", selectedShift.id);

    if (!shiftRoutines) return;

    const routineIds = shiftRoutines.map((r) => r.id);

    const { data, error } = await supabase
      .from("task_completions")
      .select("routine_id")
      .in("routine_id", routineIds);

    if (error) {
      console.error(error);
    } else if (data) {
      setCompletions(new Set(data.map((c: TaskCompletion) => c.routine_id)));
    }
  };

  const clearAllCompletions = async () => {
    if (!selectedShift) return;

    // Get all routine IDs for this shift
    const { data: shiftRoutines } = await supabase
      .from("routines")
      .select("id")
      .eq("shift_id", selectedShift.id);

    if (!shiftRoutines || shiftRoutines.length === 0) return;

    const routineIds = shiftRoutines.map((r) => r.id);

    // Delete all completions for these routines
    const { error } = await supabase
      .from("task_completions")
      .delete()
      .in("routine_id", routineIds);

    if (error) {
      toast.error("Kunne ikke fjerne afkrydsninger");
      console.error(error);
    } else {
      setCompletions(new Set());
      setShiftProgress((prev) => ({
        ...prev,
        [selectedShift.id]: {
          ...prev[selectedShift.id],
          completed: 0,
        },
      }));
      toast.success("Alle afkrydsninger fjernet");
    }
  };

  const toggleTaskCompletion = async (routineId: string) => {
    if (!user || !selectedShift) return;

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
        
        // Update shift progress
        setShiftProgress((prev) => ({
          ...prev,
          [selectedShift.id]: {
            ...prev[selectedShift.id],
            completed: Math.max(0, (prev[selectedShift.id]?.completed || 1) - 1),
          },
        }));
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
        
        // Update shift progress
        setShiftProgress((prev) => ({
          ...prev,
          [selectedShift.id]: {
            ...prev[selectedShift.id],
            completed: (prev[selectedShift.id]?.completed || 0) + 1,
          },
        }));
        
        // Show celebration toast
        toast.success("Bra jobba! 🎉", {
          description: "Oppgave fullført",
        });
      }
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
                Læste notifikationer
                {mainTab === "notifications" && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                )}
              </button>
            </div>

            {mainTab === "notifications" ? (
              <NotificationsTab />
            ) : (
              <div className="space-y-6">
                {/* Unread notifications banner above shifts */}
                <UnreadNotificationsBanner
                  notifications={unreadNotifications}
                  profiles={profiles}
                  onMarkAsRead={(notification) => {
                    setUnreadNotifications((prev) =>
                      prev.filter((n) => !(n.type === notification.type && n.id === notification.id))
                    );
                    setUnreadCount((prev) => Math.max(0, prev - 1));
                  }}
                />

                <div className="text-center space-y-2">
                  <h2 className="text-2xl">Velg din vakt</h2>
                  <p className="text-sm text-muted-foreground">
                    Velg hvilken vakt du har i dag
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {shifts.map((shift) => {
                    const progress = shiftProgress[shift.id];
                    const hasProgress = progress && progress.total > 0;
                    const isComplete = hasProgress && progress.completed === progress.total;
                    
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
                          {hasProgress && (
                            <CardDescription className="mt-2">
                              <span className={isComplete ? "text-green-600 font-medium" : ""}>
                                {progress.completed} / {progress.total} oppgaver
                              </span>
                            </CardDescription>
                          )}
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
              {wakeLockSupported && (
                <div className="flex items-center gap-2 mt-2">
                  <Smartphone className="h-4 w-4 text-muted-foreground" />
                  <label htmlFor="wake-lock" className="text-sm text-muted-foreground cursor-pointer">
                    Hold skjerm våken
                  </label>
                  <Switch
                    id="wake-lock"
                    checked={wakeLockActive}
                    onCheckedChange={toggleWakeLock}
                  />
                </div>
              )}
              
              {/* Clear all completions button */}
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="mt-3 text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Fjern alle afkrydsninger
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Fjern alle afkrydsninger?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Dette vil fjerne alle afkrydsninger for denne vagt. Handlingen kan ikke fortrydes.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuller</AlertDialogCancel>
                    <AlertDialogAction onClick={clearAllCompletions} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      Fjern alle
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>


            <div className="space-y-6">
              {routines.length === 0 ? (
                <Card>
                  <CardContent className="p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Ingen rutiner for denne vakten ennå
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Unsorted routines (no section) */}
                  {getRoutinesBySection(null).length > 0 && (
                    <div className="space-y-3">
                      {getRoutinesBySection(null).map((routine) => {
                        const isCompleted = completions.has(routine.id);
                        const isExpanded = expandedDescriptions.has(routine.id);
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
                                    <div>
                                      <p
                                        className={`text-sm text-muted-foreground ${
                                          !isExpanded ? "line-clamp-3" : ""
                                        }`}
                                      >
                                        {routine.description}
                                      </p>
                                      {routine.description.length > 150 && (
                                        <button
                                          type="button"
                                          onClick={() => toggleDescription(routine.id)}
                                          className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
                                        >
                                          {isExpanded ? (
                                            <>
                                              Vis mindre <ChevronUp className="h-3 w-3" />
                                            </>
                                          ) : (
                                            <>
                                              Vis mer <ChevronDown className="h-3 w-3" />
                                            </>
                                          )}
                                        </button>
                                      )}
                                    </div>
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
                      })}
                    </div>
                  )}

                  {/* Sections with their routines */}
                  {sections.map((section) => {
                    const sectionRoutines = getRoutinesBySection(section.id);
                    if (sectionRoutines.length === 0) return null;
                    
                    return (
                      <div key={section.id} className="space-y-3">
                        <h3 className="text-base font-medium text-foreground border-b pb-2">
                          {section.name}
                        </h3>
                        {sectionRoutines.map((routine) => {
                          const isCompleted = completions.has(routine.id);
                          const isExpanded = expandedDescriptions.has(routine.id);
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
                                      <div>
                                        <p
                                          className={`text-sm text-muted-foreground ${
                                            !isExpanded ? "line-clamp-3" : ""
                                          }`}
                                        >
                                          {routine.description}
                                        </p>
                                        {routine.description.length > 150 && (
                                          <button
                                            type="button"
                                            onClick={() => toggleDescription(routine.id)}
                                            className="text-xs text-primary hover:underline mt-1 flex items-center gap-1"
                                          >
                                            {isExpanded ? (
                                              <>
                                                Vis mindre <ChevronUp className="h-3 w-3" />
                                              </>
                                            ) : (
                                              <>
                                                Vis mer <ChevronDown className="h-3 w-3" />
                                              </>
                                            )}
                                          </button>
                                        )}
                                      </div>
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
                        })}
                      </div>
                    );
                  })}
                </>
              )}
            </div>
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
