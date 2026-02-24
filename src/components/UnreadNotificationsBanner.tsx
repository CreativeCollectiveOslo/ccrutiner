import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, Check, ChevronDown, ChevronUp } from "lucide-react";
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
  routines: Routine | null;
  type: "routine";
}

type NotificationItem = (Announcement & { type: "announcement" }) | (RoutineNotification & { type: "routine" });

interface UserProfile {
  id: string;
  name: string;
}

interface UnreadNotificationsBannerProps {
  notifications: NotificationItem[];
  profiles: UserProfile[];
  onMarkAsRead: (notification: NotificationItem) => void;
}

export function UnreadNotificationsBanner({ notifications, profiles, onMarkAsRead }: UnreadNotificationsBannerProps) {
  const { user } = useAuth();
  const [expandedNotifications, setExpandedNotifications] = useState<Set<string>>(new Set());
  const [markingAsRead, setMarkingAsRead] = useState<Set<string>>(new Set());

  const getCreatorName = (createdBy: string | null) => {
    if (!createdBy) return null;
    const creator = profiles.find(p => p.id === createdBy);
    return creator?.name || null;
  };

  const toggleExpanded = (id: string) => {
    setExpandedNotifications((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const getNotificationText = (notification: NotificationItem): string => {
    if (notification.type === "announcement") {
      return notification.message;
    }
    return notification.message;
  };

  const isLongText = (text: string): boolean => {
    return text.length > 150;
  };

  const handleMarkAsRead = async (notification: NotificationItem) => {
    if (!user) return;

    const notificationKey = `${notification.type}-${notification.id}`;
    setMarkingAsRead((prev) => new Set(prev).add(notificationKey));

    try {
      if (notification.type === "announcement") {
        const { error } = await supabase
          .from("announcements_read")
          .insert([{ announcement_id: notification.id, user_id: user.id }]);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("routine_notifications_read")
          .insert({ notification_id: notification.id, user_id: user.id });

        if (error) throw error;
      }

      onMarkAsRead(notification);
      toast.success("Markert som lest");
    } catch (error) {
      console.error("Error marking as read:", error);
      toast.error("Kunne ikke markere som lest");
    } finally {
      setMarkingAsRead((prev) => {
        const newSet = new Set(prev);
        newSet.delete(notificationKey);
        return newSet;
      });
    }
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 mb-6">
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Bell className="h-4 w-4" />
        <span>Uleste varsler ({notifications.length})</span>
      </div>

      {notifications.map((notification) => {
        const notificationKey = `${notification.type}-${notification.id}`;
        const isExpanded = expandedNotifications.has(notificationKey);
        const text = getNotificationText(notification);
        const needsExpansion = isLongText(text);
        const isMarking = markingAsRead.has(notificationKey);

        return (
          <Card key={notificationKey} className="border-primary/50 bg-primary/5">
            <CardContent className="p-4">
              {/* Chips above header */}
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className="text-xs">
                  {notification.type === "announcement" ? "Nyhet" : "Oppdatering"}
                </Badge>
              </div>

              <div className="flex items-start gap-3">
                <Bell className="h-4 w-4 mt-0.5 flex-shrink-0 text-primary" />
                <div className="flex-1 min-w-0">
                  {notification.type === "announcement" ? (
                    <>
                      <h3 className="text-sm font-medium mb-1">{notification.title}</h3>
                      <div className="relative">
                        <p
                          className={`text-sm text-muted-foreground whitespace-pre-wrap ${
                            !isExpanded && needsExpansion ? "line-clamp-3" : ""
                          }`}
                        >
                          {notification.message}
                        </p>
                        {needsExpansion && (
                          <button
                            onClick={() => toggleExpanded(notificationKey)}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3" />
                                Vis mindre
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                Vis mer
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative">
                        <p
                          className={`text-sm font-medium whitespace-pre-wrap ${
                            !isExpanded && needsExpansion ? "line-clamp-3" : ""
                          }`}
                        >
                          {notification.message}
                        </p>
                        {needsExpansion && (
                          <button
                            onClick={() => toggleExpanded(notificationKey)}
                            className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 mt-1"
                          >
                            {isExpanded ? (
                              <>
                                <ChevronUp className="h-3 w-3" />
                                Vis mindre
                              </>
                            ) : (
                              <>
                                <ChevronDown className="h-3 w-3" />
                                Vis mer
                              </>
                            )}
                          </button>
                        )}
                      </div>

                      {notification.routines && isExpanded && (
                        <div className="mt-3 p-3 rounded-lg bg-background border">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">{notification.routines.title}</span>
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

                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(notification.created_at).toLocaleDateString("nb-NO", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                    {notification.type === "announcement" && notification.created_by && getCreatorName(notification.created_by) && (
                      <> · Av {getCreatorName(notification.created_by)}</>
                    )}
                    {notification.type === "routine" && notification.created_by && getCreatorName(notification.created_by) && (
                      <> · Av {getCreatorName(notification.created_by)}</>
                    )}
                  </p>
                </div>
              </div>

              <div className="flex justify-end mt-3">
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => handleMarkAsRead(notification)}
                  disabled={isMarking}
                >
                  <Check className="h-4 w-4 mr-1" />
                  Lest
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
