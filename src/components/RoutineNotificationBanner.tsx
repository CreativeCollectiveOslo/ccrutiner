import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Routine {
  id: string;
  title: string;
  description: string | null;
  priority: number;
}

interface RoutineNotification {
  id: string;
  routine_id: string;
  shift_id: string;
  message: string;
  created_at: string;
  routines: Routine | null;
}

export function RoutineNotificationBanner() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<RoutineNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchUnreadNotifications();
    }
  }, [user]);

  const fetchUnreadNotifications = async () => {
    if (!user) return;

    // Get all notifications with routine data
    const { data: allNotifications, error: notifError } = await supabase
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
      .order("created_at", { ascending: false });

    if (notifError) {
      console.error("Error fetching notifications:", notifError);
      setLoading(false);
      return;
    }

    // Get read notifications for this user
    const { data: readNotifications, error: readError } = await supabase
      .from("routine_notifications_read")
      .select("notification_id")
      .eq("user_id", user.id);

    if (readError) {
      console.error("Error fetching read status:", readError);
      setLoading(false);
      return;
    }

    const readIds = new Set(readNotifications?.map((r) => r.notification_id) || []);
    const unread = allNotifications?.filter((n) => !readIds.has(n.id)) || [];

    setNotifications(unread as RoutineNotification[]);
    setLoading(false);
  };

  const markAsRead = async (notificationId: string) => {
    if (!user) return;

    const { error } = await supabase.from("routine_notifications_read").insert({
      notification_id: notificationId,
      user_id: user.id,
    });

    if (error) {
      console.error("Error marking notification as read:", error);
      return;
    }

    setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
  };

  if (loading || notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 mb-6">
      {notifications.map((notification) => (
        <Card key={notification.id} className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4 mb-4">
              <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
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
                
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(notification.created_at).toLocaleDateString("da-DK")}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="default"
                size="sm"
                onClick={() => markAsRead(notification.id)}
              >
                Læst
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
