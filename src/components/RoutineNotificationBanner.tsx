import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, X } from "lucide-react";

interface RoutineNotification {
  id: string;
  routine_id: string;
  shift_id: string;
  message: string;
  created_at: string;
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

    // Get all notifications
    const { data: allNotifications, error: notifError } = await supabase
      .from("routine_notifications")
      .select("*")
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

    setNotifications(unread);
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
    <div className="space-y-3 mb-6">
      {notifications.map((notification) => (
        <Card key={notification.id} className="border-primary/50 bg-primary/5">
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Bell className="h-4 w-4 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-sm">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(notification.created_at).toLocaleDateString("da-DK", {
                      day: "numeric",
                      month: "long",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => markAsRead(notification.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
