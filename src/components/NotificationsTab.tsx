import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Check, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface Routine {
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
  type: "announcement";
}

interface RoutineNotification {
  id: string;
  routine_id: string;
  shift_id: string;
  message: string;
  created_at: string;
  routines: Routine | null;
  type: "routine";
}

type NotificationItem = (Announcement & { type: "announcement" }) | (RoutineNotification & { type: "routine" });

interface NotificationsTabProps {
  onMarkAsRead?: () => void;
}

export function NotificationsTab({ onMarkAsRead }: NotificationsTabProps) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState<Set<string>>(new Set());
  const [readRoutineNotificationIds, setReadRoutineNotificationIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchUserProfile();
    }
  }, [user]);

  useEffect(() => {
    if (user && userCreatedAt) {
      fetchAllNotifications();
    }
  }, [user, userCreatedAt]);

  const fetchUserProfile = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("created_at")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("Error fetching profile:", error);
      setLoading(false);
      return;
    }

    setUserCreatedAt(data.created_at);
  };

  const fetchAllNotifications = async () => {
    if (!user || !userCreatedAt) return;

    // Fetch announcements created after user joined
    const { data: announcements, error: annError } = await supabase
      .from("announcements")
      .select("*")
      .gte("created_at", userCreatedAt)
      .order("created_at", { ascending: false });

    if (annError) {
      console.error("Error fetching announcements:", annError);
    }

    // Fetch routine notifications with routine data, created after user joined
    const { data: routineNotifications, error: routineError } = await supabase
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
      .gte("created_at", userCreatedAt)
      .order("created_at", { ascending: false });

    if (routineError) {
      console.error("Error fetching routine notifications:", routineError);
    }

    // Fetch read status for announcements
    const { data: readAnnouncements } = await supabase
      .from("announcements_read")
      .select("announcement_id")
      .eq("user_id", user.id);

    // Fetch read status for routine notifications
    const { data: readRoutineNotifs } = await supabase
      .from("routine_notifications_read")
      .select("notification_id")
      .eq("user_id", user.id);

    setReadAnnouncementIds(new Set(readAnnouncements?.map((r) => r.announcement_id) || []));
    setReadRoutineNotificationIds(new Set(readRoutineNotifs?.map((r) => r.notification_id) || []));

    // Combine and sort all notifications
    const allNotifications: NotificationItem[] = [
      ...(announcements?.map((a) => ({ ...a, type: "announcement" as const })) || []),
      ...(routineNotifications?.map((r) => ({ ...r, type: "routine" as const })) || []),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setNotifications(allNotifications);
    setLoading(false);
  };

  const markAnnouncementAsRead = async (announcementId: string) => {
    if (!user) return;

    const { error } = await supabase
      .from("announcements_read")
      .insert([{ announcement_id: announcementId, user_id: user.id }]);

    if (error) {
      toast.error("Kunne ikke markere som læst");
      return;
    }

    setReadAnnouncementIds((prev) => new Set(prev).add(announcementId));
    onMarkAsRead?.();
    toast.success("Markeret som læst");
  };

  const markRoutineNotificationAsRead = async (notificationId: string) => {
    if (!user) return;

    const { error } = await supabase.from("routine_notifications_read").insert({
      notification_id: notificationId,
      user_id: user.id,
    });

    if (error) {
      toast.error("Kunne ikke markere som læst");
      return;
    }

    setReadRoutineNotificationIds((prev) => new Set(prev).add(notificationId));
    onMarkAsRead?.();
    toast.success("Markeret som læst");
  };

  const isRead = (notification: NotificationItem): boolean => {
    if (notification.type === "announcement") {
      return readAnnouncementIds.has(notification.id);
    }
    return readRoutineNotificationIds.has(notification.id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Ingen notifikationer endnu</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {notifications.map((notification) => {
        const read = isRead(notification);

        return (
          <Card
            key={`${notification.type}-${notification.id}`}
            className={`border-primary/50 transition-opacity ${read ? "opacity-60" : "bg-primary/5"}`}
          >
            <CardContent className="p-4">
              {/* Chips above header */}
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="outline" className="text-xs">
                  {notification.type === "announcement" ? "Opdatering" : "Rutine"}
                </Badge>
                {read && (
                  <Badge variant="secondary" className="text-xs">
                    Læst
                  </Badge>
                )}
              </div>

              <div className="flex items-start gap-3">
                <Bell className={`h-5 w-5 mt-0.5 flex-shrink-0 ${read ? "text-muted-foreground" : "text-primary"}`} />
                <div className="flex-1">
                  {notification.type === "announcement" ? (
                    <>
                      <h3 className="font-semibold mb-1">{notification.title}</h3>
                      <p className="text-sm text-muted-foreground">{notification.message}</p>
                    </>
                  ) : (
                    <>
                      <h3 className="font-semibold mb-1">{notification.message}</h3>

                      {notification.routines && (
                        <div className="mt-3 p-3 rounded-lg bg-background border">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{notification.routines.title}</span>
                              {notification.routines.priority > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  Prioritet: {notification.routines.priority}
                                </Badge>
                              )}
                            </div>
                            {notification.routines.description && (
                              <p className="text-sm text-muted-foreground">
                                {notification.routines.description}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <p className="text-xs text-muted-foreground mt-3">
                    {new Date(notification.created_at).toLocaleDateString("da-DK", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {!read && (
                <div className="flex justify-end mt-4">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() =>
                      notification.type === "announcement"
                        ? markAnnouncementAsRead(notification.id)
                        : markRoutineNotificationAsRead(notification.id)
                    }
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Læst
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
