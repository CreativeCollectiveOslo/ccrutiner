import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Bell, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Announcement {
  id: string;
  title: string;
  created_at: string;
}

interface RoutineNotification {
  id: string;
  message: string;
  created_at: string;
  routine: {
    title: string;
  } | null;
}

interface ReadAnnouncement {
  announcement_id: string;
  read_at: string;
  announcement: Announcement | null;
}

interface ReadRoutineNotification {
  notification_id: string;
  read_at: string;
  notification: RoutineNotification | null;
}

interface UserNotificationsViewProps {
  userId: string;
  userName: string;
}

export function UserNotificationsView({ userId, userName }: UserNotificationsViewProps) {
  const [loading, setLoading] = useState(true);
  const [readAnnouncements, setReadAnnouncements] = useState<ReadAnnouncement[]>([]);
  const [readRoutineNotifications, setReadRoutineNotifications] = useState<ReadRoutineNotification[]>([]);
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);
  const [allRoutineNotifications, setAllRoutineNotifications] = useState<RoutineNotification[]>([]);

  useEffect(() => {
    fetchNotificationData();
  }, [userId]);

  const fetchNotificationData = async () => {
    setLoading(true);

    // Fetch all announcements
    const { data: announcements } = await supabase
      .from("announcements")
      .select("id, title, created_at")
      .order("created_at", { ascending: false });

    // Fetch all routine notifications with routine title
    const { data: routineNotifications } = await supabase
      .from("routine_notifications")
      .select(`
        id,
        message,
        created_at,
        routine:routines(title)
      `)
      .order("created_at", { ascending: false });

    // Fetch user's read announcements
    const { data: userReadAnnouncements } = await supabase
      .from("announcements_read")
      .select("announcement_id, read_at")
      .eq("user_id", userId);

    // Fetch user's read routine notifications
    const { data: userReadRoutineNotifications } = await supabase
      .from("routine_notifications_read")
      .select("notification_id, read_at")
      .eq("user_id", userId);

    setAllAnnouncements(announcements || []);
    setAllRoutineNotifications(
      (routineNotifications || []).map((n) => ({
        ...n,
        routine: Array.isArray(n.routine) ? n.routine[0] : n.routine,
      }))
    );

    // Map read announcements with their details
    const readAnnouncementsWithDetails: ReadAnnouncement[] = (userReadAnnouncements || []).map((read) => ({
      announcement_id: read.announcement_id,
      read_at: read.read_at,
      announcement: announcements?.find((a) => a.id === read.announcement_id) || null,
    }));

    // Map read routine notifications with their details
    const readRoutineNotificationsWithDetails: ReadRoutineNotification[] = (userReadRoutineNotifications || []).map((read) => {
      const notification = routineNotifications?.find((n) => n.id === read.notification_id);
      return {
        notification_id: read.notification_id,
        read_at: read.read_at,
        notification: notification
          ? {
              ...notification,
              routine: Array.isArray(notification.routine) ? notification.routine[0] : notification.routine,
            }
          : null,
      };
    });

    setReadAnnouncements(readAnnouncementsWithDetails);
    setReadRoutineNotifications(readRoutineNotificationsWithDetails);
    setLoading(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("no-NO", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const readAnnouncementIds = new Set(readAnnouncements.map((r) => r.announcement_id));
  const readRoutineNotificationIds = new Set(readRoutineNotifications.map((r) => r.notification_id));

  const unreadAnnouncements = allAnnouncements.filter((a) => !readAnnouncementIds.has(a.id));
  const unreadRoutineNotifications = allRoutineNotifications.filter((n) => !readRoutineNotificationIds.has(n.id));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="font-semibold text-lg">{userName}</h3>
        <p className="text-sm text-muted-foreground">Notifikasjonsstatus</p>
      </div>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-6">
          {/* Announcements Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Megaphone className="h-4 w-4 text-primary" />
              <h4 className="font-medium">Nyheder</h4>
              <Badge variant="secondary" className="text-xs">
                {readAnnouncements.length} / {allAnnouncements.length} læst
              </Badge>
            </div>

            {allAnnouncements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen nyheder</p>
            ) : (
              <div className="space-y-2">
                {allAnnouncements.map((announcement) => {
                  const readRecord = readAnnouncements.find(
                    (r) => r.announcement_id === announcement.id
                  );
                  const isRead = !!readRecord;

                  return (
                    <div
                      key={announcement.id}
                      className={`p-3 rounded-lg border text-sm ${
                        isRead ? "bg-muted/50" : "bg-yellow-500/10 border-yellow-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{announcement.title}</p>
                          <p className="text-xs text-muted-foreground">
                            Oprettet: {formatDate(announcement.created_at)}
                          </p>
                        </div>
                        {isRead ? (
                          <Badge variant="outline" className="shrink-0 text-xs text-green-600 border-green-600">
                            Læst {formatDate(readRecord.read_at)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0 text-xs text-yellow-600 border-yellow-600">
                            Ulæst
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Routine Notifications Section */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Bell className="h-4 w-4 text-primary" />
              <h4 className="font-medium">Rutine-opdateringer</h4>
              <Badge variant="secondary" className="text-xs">
                {readRoutineNotifications.length} / {allRoutineNotifications.length} læst
              </Badge>
            </div>

            {allRoutineNotifications.length === 0 ? (
              <p className="text-sm text-muted-foreground">Ingen rutine-opdateringer</p>
            ) : (
              <div className="space-y-2">
                {allRoutineNotifications.map((notification) => {
                  const readRecord = readRoutineNotifications.find(
                    (r) => r.notification_id === notification.id
                  );
                  const isRead = !!readRecord;

                  return (
                    <div
                      key={notification.id}
                      className={`p-3 rounded-lg border text-sm ${
                        isRead ? "bg-muted/50" : "bg-yellow-500/10 border-yellow-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">
                            {notification.routine?.title || "Ukendt rutine"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Oprettet: {formatDate(notification.created_at)}
                          </p>
                        </div>
                        {isRead ? (
                          <Badge variant="outline" className="shrink-0 text-xs text-green-600 border-green-600">
                            Læst {formatDate(readRecord.read_at)}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0 text-xs text-yellow-600 border-yellow-600">
                            Ulæst
                          </Badge>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      {/* Summary */}
      <div className="pt-4 border-t">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-green-600">
              {readAnnouncements.length + readRoutineNotifications.length}
            </p>
            <p className="text-xs text-muted-foreground">Læste</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-yellow-600">
              {unreadAnnouncements.length + unreadRoutineNotifications.length}
            </p>
            <p className="text-xs text-muted-foreground">Ulæste</p>
          </div>
        </div>
      </div>
    </div>
  );
}
