import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { StoreBar } from "@/components/StoreBar";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { LogOut, Loader2, Bell, Calendar, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, Settings, RotateCcw, ClipboardList, Wrench, Search, Info } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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
import { BulletinBoard } from "@/components/BulletinBoard";
import { UnreadNotificationsBanner } from "@/components/UnreadNotificationsBanner";
import { Switch } from "@/components/ui/switch";
import { useWakeLock } from "@/hooks/use-wake-lock";
import { SearchDialog } from "@/components/SearchDialog";
import { highlightSearchTerm } from "@/lib/highlightText";
import logo from "@/assets/logo.png";
import { MultiImageDisplay } from "@/components/ImageUpload";
import { LogReadingDialog } from "@/components/LogReadingDialog";
// (Handleliste erstattet av verkstedloggbok)

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
  image_urls: string[] | null;
  section_id: string | null;
  task_type: string | null;
  measurement_point_id: string | null;
}

interface TaskCompletion {
  routine_id: string;
}

interface ShiftInfoItem {
  id: string;
  title: string;
  description: string | null;
  image_urls: string[] | null;
  order_index: number | null;
  category_id: string | null;
  section_id: string | null;
}

interface InfoCategory {
  id: string;
  name: string;
  icon: string;
  color_code: string;
  order_index: number;
}

interface InfoSection {
  id: string;
  name: string;
  order_index: number | null;
  info_category_id: string | null;
}

export default function EmployeeDashboard() {
  const { user, signOut, loading: authLoading } = useAuth();
  const { activeStore, canSwitchStore, loading: storeLoading, storeSwitchKey } = useStore();
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [completions, setCompletions] = useState<Set<string>>(new Set());
  const [recentlyCompleted, setRecentlyCompleted] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentDate, setCurrentDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [mainTab, setMainTab] = useState<"shifts" | "info" | "notifications" | "bulletin" | "workshop">("shifts");
  const [unreadCount, setUnreadCount] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState<NotificationItem[]>([]);
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [shiftInfoItems, setShiftInfoItems] = useState<ShiftInfoItem[]>([]);
  const [infoCategories, setInfoCategories] = useState<InfoCategory[]>([]);
  const [infoSections, setInfoSections] = useState<InfoSection[]>([]);
  const [selectedInfoCategory, setSelectedInfoCategory] = useState<string | null>(null);
  const [shiftProgress, setShiftProgress] = useState<Record<string, { completed: number; total: number }>>({});
  const [searchOpen, setSearchOpen] = useState(false);
  const [highlightedRoutineId, setHighlightedRoutineId] = useState<string | null>(null);
  const [searchHighlightTerm, setSearchHighlightTerm] = useState<string | null>(null);
  const { isSupported: wakeLockSupported, isActive: wakeLockActive, toggleWakeLock } = useWakeLock();
  const [logRoutine, setLogRoutine] = useState<Routine | null>(null);
  const navigate = useNavigate();

  // Reset UI state when the user explicitly switches store
  useEffect(() => {
    if (storeSwitchKey === 0) return;
    setSelectedShift(null);
    setSelectedInfoCategory(null);
    setExpandedDescriptions(new Set());
    setHighlightedRoutineId(null);
    setSearchHighlightTerm(null);
    setLogRoutine(null);
  }, [storeSwitchKey]);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (user && activeStore) {
      fetchShifts();
      checkAdminStatus();
      fetchUnreadCount();
      fetchAllShiftProgress();
      fetchProfiles();
      fetchShiftInfo();
    } else if (user && !storeLoading && !activeStore) {
      setLoading(false);
    }

  }, [user, authLoading, navigate, activeStore, storeLoading]);

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

  // Realtime: watch task_completions for this store so all users stay in sync
  useEffect(() => {
    if (!activeStore) return;

    const channel = supabase
      .channel(`task_completions_${activeStore.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "task_completions",
          filter: `store_id=eq.${activeStore.id}`,
        },
        () => {
          fetchAllShiftProgress();
          if (selectedShift) fetchCompletions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeStore?.id, selectedShift?.id]);

  // Refetch when app becomes visible again (defense against missed realtime events)
  useEffect(() => {
    if (!activeStore) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        fetchAllShiftProgress();
        if (selectedShift) fetchCompletions();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [activeStore?.id, selectedShift?.id]);


  // fetchShiftInfo triggered from main effect when activeStore changes

  const fetchShiftInfo = async () => {
    if (!activeStore) return;
    const [infoRes, catRes, secRes] = await Promise.all([
      supabase.from("shift_info").select("*").eq("store_id", activeStore.id).is("shift_id", null).order("order_index"),
      supabase.from("info_categories").select("*").eq("store_id", activeStore.id).order("order_index"),
      supabase.from("sections").select("*").eq("store_id", activeStore.id).not("info_category_id", "is", null).order("order_index"),
    ]);

    if (!infoRes.error && infoRes.data) {
      setShiftInfoItems(infoRes.data as any);
    }
    if (!catRes.error && catRes.data) {
      setInfoCategories(catRes.data as any);
    }
    if (!secRes.error && secRes.data) {
      setInfoSections(secRes.data as any);
    }
  };

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
    if (!user || !activeStore) return;

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
      .eq("store_id", activeStore.id)
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
      .eq("store_id", activeStore.id)
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
    }
    setLoading(false);
  };

  const fetchAllShiftProgress = async () => {
    if (!activeStore) return;
    // Fetch all routines grouped by shift
    const { data: allRoutines, error: routinesError } = await supabase
      .from("routines")
      .select("id, shift_id")
      .eq("store_id", activeStore.id);

    if (routinesError) {
      console.error(routinesError);
      return;
    }

    // Fetch ALL completions (from all users, no date filter)
    const { data: allCompletions, error: completionsError } = await supabase
      .from("task_completions")
      .select("routine_id")
      .eq("store_id", activeStore.id);

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
      toast.error("Kunne ikke fjerne avkrysninger");
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
      toast.success("Alle avkrysninger fjernet");
    }
  };

  const toggleTaskCompletion = async (routineId: string) => {
    if (!user || !selectedShift) return;

    const isCompleted = completions.has(routineId);
    const routine = routines.find((r) => r.id === routineId);
    const today = new Date().toISOString().split("T")[0];

    if (!isCompleted && routine?.task_type === "loggforing" && routine.measurement_point_id) {
      setLogRoutine(routine);
      return;
    }


    if (isCompleted) {
      if (!activeStore) return;
      // Delete all completions for this routine (shared state across users/dates)
      const { error } = await supabase
        .from("task_completions")
        .delete()
        .eq("routine_id", routineId)
        .eq("store_id", activeStore.id);

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
      if (!activeStore) return;
      const { error } = await supabase.from("task_completions").upsert(
        {
          routine_id: routineId,
          user_id: user.id,
          shift_date: today,
          store_id: activeStore.id,
        },
        { onConflict: "routine_id" }
      );


      if (error) {
        toast.error("Kunne ikke oppdatere oppgave");
        console.error(error);
      } else {
        const newCompletions = new Set(completions);
        newCompletions.add(routineId);
        setCompletions(newCompletions);
        
        // Track recently completed for animation
        setRecentlyCompleted(prev => new Set(prev).add(routineId));
        // Clear from recently completed after animation
        setTimeout(() => {
          setRecentlyCompleted(prev => {
            const updated = new Set(prev);
            updated.delete(routineId);
            return updated;
          });
        }, 1000);
        
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

  // Search navigation handlers
  const handleSearchNavigateToShift = async (shiftId: string, routineId?: string, searchTerm?: string) => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (shift) {
      setSelectedShift(shift);
      if (routineId) {
        setHighlightedRoutineId(routineId);
        // Clear highlight after animation
        setTimeout(() => setHighlightedRoutineId(null), 2000);
        // Scroll to routine after shift loads
        setTimeout(() => {
          const element = document.getElementById(`routine-${routineId}`);
          if (element) {
            element.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 100);
      }
      if (searchTerm) {
        setSearchHighlightTerm(searchTerm);
        setTimeout(() => setSearchHighlightTerm(null), 5000);
      }
    }
  };

  const handleSearchNavigateToNotifications = (searchTerm?: string) => {
    setSelectedShift(null);
    setMainTab("notifications");
    if (searchTerm) {
      setSearchHighlightTerm(searchTerm);
      setTimeout(() => setSearchHighlightTerm(null), 5000);
    }
  };

  const handleSearchNavigateToBulletin = (searchTerm?: string) => {
    setSelectedShift(null);
    setMainTab("bulletin");
    if (searchTerm) {
      setSearchHighlightTerm(searchTerm);
      setTimeout(() => setSearchHighlightTerm(null), 5000);
    }
  };


  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className={className} /> : <LucideIcons.Sun className={className} />;
  };

  if (loading || authLoading || storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!activeStore) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-accent">
        <header className="border-b bg-card/50 backdrop-blur">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Creative Collective" className="h-8 w-auto" />
              <h1 className="text-xl">Mine Rutiner</h1>
            </div>
            <Button variant="ghost" size="icon" onClick={signOut} title="Logg ut">
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Logg ut</span>
            </Button>
          </div>
        </header>
        <main className="container mx-auto px-4 py-10 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>Ingen butikktilgang</CardTitle>
              <CardDescription>
                Brukeren din er ikke koblet til Oslo eller Trondheim ennå. Kontakt en admin for tilgang.
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
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
              <h1 className="text-xl">Mine Rutiner</h1>
              {activeStore && !canSwitchStore && (
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground -mt-0.5">
                  {activeStore.name}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setSearchOpen(true)}>
              <Search className="h-5 w-5" />
              <span className="sr-only">Søk</span>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setSelectedShift(null); setMainTab("notifications"); }}
              title="Notifikasjoner"
              className={`relative ${mainTab === "notifications" ? "bg-accent text-accent-foreground" : ""}`}
            >
              <Bell className={`h-4 w-4 ${mainTab === "notifications" ? "text-primary" : ""}`} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[10px] flex items-center justify-center font-medium">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
              <span className="sr-only">Notifikasjoner</span>
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut} title="Logg ut">
              <LogOut className="h-4 w-4" />
              <span className="sr-only">Logg ut</span>
            </Button>
          </div>
        </div>
      </header>

      <StoreBar />


      <SearchDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        onNavigateToShift={handleSearchNavigateToShift}
        onNavigateToNotifications={handleSearchNavigateToNotifications}
        onNavigateToBulletin={handleSearchNavigateToBulletin}
      />

      <main className="container mx-auto px-4 py-6 max-w-4xl pb-20">
        {!selectedShift ? (
          <>
            {/* Main tabs - only visible on front page */}
            {mainTab === "notifications" ? (
              <div className="space-y-6 mb-6">
                <button
                  onClick={() => setMainTab("shifts")}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                >
                  ← Tilbake
                </button>
                <h2 className="text-2xl font-semibold">Notifikasjoner</h2>
              </div>
            ) : (
              <div className="flex border-b border-border mb-6">
                <button
                  onClick={() => setMainTab("shifts")}
                  className={`flex-1 px-2 py-3 text-xs sm:text-sm font-medium transition-colors relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                    mainTab === "shifts"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Calendar className="h-5 w-5 sm:h-4 sm:w-4" />
                  <span>Vakter</span>
                  {mainTab === "shifts" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  onClick={() => setMainTab("info")}
                  className={`flex-1 px-2 py-3 text-xs sm:text-sm font-medium transition-colors relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                    mainTab === "info"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Info className="h-5 w-5 sm:h-4 sm:w-4" />
                  <span className="text-center leading-tight">Info</span>
                  {mainTab === "info" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  onClick={() => setMainTab("bulletin")}
                  className={`flex-1 px-2 py-3 text-xs sm:text-sm font-medium transition-colors relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                    mainTab === "bulletin"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <ClipboardList className="h-5 w-5 sm:h-4 sm:w-4" />
                  <span>Kafé</span>
                  {mainTab === "bulletin" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
                <button
                  onClick={() => setMainTab("workshop")}
                  className={`flex-1 px-2 py-3 text-xs sm:text-sm font-medium transition-colors relative flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 ${
                    mainTab === "workshop"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Wrench className="h-5 w-5 sm:h-4 sm:w-4" />
                  <span>Verksted</span>
                  {mainTab === "workshop" && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                  )}
                </button>
              </div>
            )}

            {mainTab === "notifications" ? (
              <NotificationsTab searchHighlightTerm={searchHighlightTerm} />
            ) : mainTab === "info" ? (
              <div className="space-y-6">
                {selectedInfoCategory ? (
                  (() => {
                    const category = infoCategories.find(c => c.id === selectedInfoCategory);
                    if (!category) return null;
                    const IconComponent = (LucideIcons as any)[category.icon] || Info;
                    const categoryItems = shiftInfoItems.filter(i => i.category_id === category.id);
                    const categorySections = infoSections.filter(s => s.info_category_id === category.id);
                    const unsortedItems = categoryItems.filter(i => !i.section_id);

                    const renderInfoCard = (info: ShiftInfoItem) => (
                      <Card key={info.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <Info className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                            <div className="flex-1 min-w-0 space-y-1">
                              <p className="text-sm font-medium">{info.title}</p>
                              {info.description && (
                                <p className="text-sm text-muted-foreground whitespace-pre-line">{info.description}</p>
                              )}
                              {info.image_urls && info.image_urls.length > 0 && (
                                <MultiImageDisplay urls={info.image_urls} className="mt-2" />
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );

                    return (
                      <div className="space-y-6">
                        <button
                          onClick={() => setSelectedInfoCategory(null)}
                          className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                        >
                          ← Tilbake
                        </button>

                        <div className="flex items-center gap-3">
                          <div
                            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                            style={{ backgroundColor: category.color_code }}
                          >
                            <IconComponent className="h-5 w-5 text-white" />
                          </div>
                          <h2 className="text-2xl font-semibold [overflow-wrap:anywhere]">{category.name}</h2>
                        </div>

                        {categoryItems.length === 0 ? (
                          <Card>
                            <CardContent className="p-6 text-center">
                              <p className="text-sm text-muted-foreground">Ingen info i denne kategorien ennå</p>
                            </CardContent>
                          </Card>
                        ) : (
                          <div className="space-y-6">
                            {unsortedItems.length > 0 && (
                              <div className="space-y-3">
                                {unsortedItems.map(renderInfoCard)}
                              </div>
                            )}
                            {categorySections.map((section) => {
                              const sectionItems = categoryItems.filter(i => i.section_id === section.id);
                              if (sectionItems.length === 0) return null;
                              return (
                                <div key={section.id} className="space-y-3">
                                  <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
                                    {section.name}
                                  </h3>
                                  {sectionItems.map(renderInfoCard)}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })()
                ) : (
                  <>
                    <div className="text-center space-y-2">
                      <h2 className="text-xl">Velg kategori</h2>
                      <p className="text-sm text-muted-foreground">
                        Bla i info-banken for viktig informasjon
                      </p>
                    </div>

                    {infoCategories.length === 0 ? (
                      <div className="text-center py-8">
                        <Info className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
                        <p className="text-sm text-muted-foreground">Ingen kategorier ennå</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-3">
                        {infoCategories.map((cat) => {
                          const IconComponent = (LucideIcons as any)[cat.icon] || Info;
                          const itemCount = shiftInfoItems.filter(i => i.category_id === cat.id).length;
                          return (
                            <Card
                              key={cat.id}
                              className="cursor-pointer hover:shadow-lg transition-all hover:scale-105"
                              onClick={() => setSelectedInfoCategory(cat.id)}
                            >
                              <CardHeader className="text-center">
                                <div
                                  className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4"
                                  style={{ backgroundColor: cat.color_code }}
                                >
                                  <IconComponent className="h-8 w-8 text-white" />
                                </div>
                                <CardTitle className="[overflow-wrap:anywhere]">{cat.name}</CardTitle>
                                <CardDescription className="mt-2">
                                  {itemCount} {itemCount === 1 ? 'element' : 'elementer'}
                                </CardDescription>
                              </CardHeader>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : mainTab === "bulletin" ? (
              <BulletinBoard key="cafe" searchHighlightTerm={searchHighlightTerm} />
            ) : mainTab === "workshop" ? (
              <BulletinBoard key="workshop" variant="workshop" searchHighlightTerm={searchHighlightTerm} />
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
                  <h2 className="text-xl">Velg din vakt</h2>
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
                          <CardTitle className="[overflow-wrap:anywhere]">{shift.name}</CardTitle>
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

            <div className="space-y-4">
              {/* Title and progress */}
              <div>
                <h2 className="text-2xl font-semibold">{selectedShift.name}</h2>
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${routines.length > 0 ? (completions.size / routines.length) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground whitespace-nowrap">
                    {completions.size} / {routines.length}
                  </span>
                </div>
              </div>

              {/* Tools row - subtle, grouped together */}
              <div className="flex items-center gap-4 py-2 px-3 bg-muted/50 rounded-lg">
                {wakeLockSupported && (
                  <>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="wake-lock"
                        checked={wakeLockActive}
                        onCheckedChange={toggleWakeLock}
                      />
                      <label htmlFor="wake-lock" className="text-sm text-muted-foreground cursor-pointer">
                        Skærm vågen
                      </label>
                    </div>
                    
                    <Separator orientation="vertical" className="h-6" />
                  </>
                )}
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive">
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Nulstil
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Fjern alle avkrysninger?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Dette vil fjerne alle avkrysninger for denne vakten. Handlingen kan ikke angres.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Avbryt</AlertDialogCancel>
                      <AlertDialogAction onClick={clearAllCompletions} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Fjern alle
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
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
                        const wasJustCompleted = recentlyCompleted.has(routine.id);
                        const isExpanded = expandedDescriptions.has(routine.id);
                        const isHighlighted = highlightedRoutineId === routine.id;
                        return (
                          <Card
                            key={routine.id}
                            id={`routine-${routine.id}`}
                            className={`relative transition-all ${
                              isCompleted ? "opacity-60" : ""
                            } ${wasJustCompleted ? "animate-celebrate" : ""} ${
                              isHighlighted ? "ring-2 ring-primary ring-offset-2 animate-pulse" : ""
                            }`}
                          >
                            <TaskCompletionAnimation isCompleted={wasJustCompleted} />
                            <CardContent className="p-4">
                              <div className="flex items-start gap-3">
                                <div className={wasJustCompleted ? "animate-check-bounce" : ""}>
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
                                      {highlightSearchTerm(routine.title, searchHighlightTerm)}
                                    </label>
                                  {routine.description && (
                                    <div>
                                      <p
                                        className={`text-sm text-muted-foreground ${
                                          !isExpanded ? "line-clamp-3" : ""
                                        }`}
                                      >
                                        {highlightSearchTerm(routine.description, searchHighlightTerm)}
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
                                  {(() => {
                                    const urls = routine.image_urls?.length ? routine.image_urls : routine.multimedia_url ? [routine.multimedia_url] : [];
                                    return urls.length > 0 && <MultiImageDisplay urls={urls} className="mt-2" />;
                                  })()}
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
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
                          {section.name}
                        </h3>
                        {sectionRoutines.map((routine) => {
                          const isCompleted = completions.has(routine.id);
                          const wasJustCompleted = recentlyCompleted.has(routine.id);
                          const isExpanded = expandedDescriptions.has(routine.id);
                          const isHighlighted = highlightedRoutineId === routine.id;
                          return (
                            <Card
                              key={routine.id}
                              id={`routine-${routine.id}`}
                              className={`relative transition-all ${
                                isCompleted ? "opacity-60" : ""
                              } ${wasJustCompleted ? "animate-celebrate" : ""} ${
                                isHighlighted ? "ring-2 ring-primary ring-offset-2 animate-pulse" : ""
                              }`}
                            >
                              <TaskCompletionAnimation isCompleted={wasJustCompleted} />
                              <CardContent className="p-4">
                                <div className="flex items-start gap-3">
                                  <div className={wasJustCompleted ? "animate-check-bounce" : ""}>
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
                                      {highlightSearchTerm(routine.title, searchHighlightTerm)}
                                    </label>
                                  {routine.description && (
                                    <div>
                                      <p
                                        className={`text-sm text-muted-foreground ${
                                          !isExpanded ? "line-clamp-3" : ""
                                        }`}
                                      >
                                        {highlightSearchTerm(routine.description, searchHighlightTerm)}
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
                                    {(() => {
                                      const urls = routine.image_urls?.length ? routine.image_urls : routine.multimedia_url ? [routine.multimedia_url] : [];
                                      return urls.length > 0 && <MultiImageDisplay urls={urls} className="mt-2" />;
                                    })()}
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

      {logRoutine && activeStore && user && (
        <LogReadingDialog
          open={!!logRoutine}
          onOpenChange={(o) => !o && setLogRoutine(null)}
          routineId={logRoutine.id}
          routineTitle={logRoutine.title}
          measurementPointId={logRoutine.measurement_point_id!}
          storeId={activeStore.id}
          userId={user.id}
          onSaved={() => {
            const newCompletions = new Set(completions);
            newCompletions.add(logRoutine.id);
            setCompletions(newCompletions);
            setRecentlyCompleted((prev) => new Set(prev).add(logRoutine.id));
            setTimeout(() => {
              setRecentlyCompleted((prev) => {
                const u = new Set(prev); u.delete(logRoutine.id); return u;
              });
            }, 1000);
            if (selectedShift) {
              setShiftProgress((prev) => ({
                ...prev,
                [selectedShift.id]: {
                  ...prev[selectedShift.id],
                  completed: (prev[selectedShift.id]?.completed || 0) + 1,
                },
              }));
            }
            setLogRoutine(null);
          }}
        />
      )}


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
