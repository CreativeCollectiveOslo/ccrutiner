import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Users, ChevronDown, ChevronUp, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

interface RoutineNotification {
  id: string;
  message: string;
  created_at: string;
  routine_id: string;
  shift_id: string;
  routine?: {
    title: string;
  };
  shift?: {
    name: string;
  };
}

interface ReadStatus {
  user_id: string;
  read_at: string;
  profile?: {
    name: string;
    email: string;
  };
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

export function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [routineNotifications, setRoutineNotifications] = useState<RoutineNotification[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'announcement' | 'routine'; id: string; title: string; createdAt: string } | null>(null);
  const [readStatuses, setReadStatuses] = useState<ReadStatus[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingReadStatus, setLoadingReadStatus] = useState(false);
  const [showRoutineNotifications, setShowRoutineNotifications] = useState(false);

  useEffect(() => {
    fetchAnnouncements();
    fetchRoutineNotifications();
    fetchAllUsers();
  }, []);

  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, name, email, created_at");

    if (error) {
      console.error("Error fetching users:", error);
    } else if (data) {
      setAllUsers(data);
    }
  };

  const fetchAnnouncements = async () => {
    const { data, error } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Kunne ikke hente opdateringer");
    } else if (data) {
      setAnnouncements(data);
    }
  };

  const fetchRoutineNotifications = async () => {
    const { data, error } = await supabase
      .from("routine_notifications")
      .select(`
        *,
        routine:routines(title),
        shift:shifts(name)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching routine notifications:", error);
    } else if (data) {
      setRoutineNotifications(data.map(n => ({
        ...n,
        routine: n.routine as { title: string } | undefined,
        shift: n.shift as { name: string } | undefined
      })));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim()) {
      toast.error("Udfyld venligst alle felter");
      return;
    }

    setLoading(true);

    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast.error("Du skal være logget ind");
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from("announcements")
      .insert([{ title, message, created_by: user.id }]);

    if (error) {
      toast.error("Kunne ikke oprette opdatering");
      console.error(error);
    } else {
      toast.success("Opdatering oprettet!");
      setTitle("");
      setMessage("");
      fetchAnnouncements();
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from("announcements")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Kunne ikke slette opdatering");
    } else {
      toast.success("Opdatering slettet");
      fetchAnnouncements();
    }
  };

  const handleDeleteRoutineNotification = async (id: string) => {
    const { error } = await supabase
      .from("routine_notifications")
      .delete()
      .eq("id", id);

    if (error) {
      toast.error("Kunne ikke slette rutineopdatering");
    } else {
      toast.success("Rutineopdatering slettet");
      fetchRoutineNotifications();
    }
  };

  const openReadStatusDialog = async (type: 'announcement' | 'routine', id: string, itemTitle: string, createdAt: string) => {
    setSelectedItem({ type, id, title: itemTitle, createdAt });
    setLoadingReadStatus(true);
    
    try {
      if (type === 'announcement') {
        const { data, error } = await supabase
          .from("announcements_read")
          .select("user_id, read_at")
          .eq("announcement_id", id);

        if (error) throw error;
        
        const statusesWithProfiles = (data || []).map(status => {
          const profile = allUsers.find(u => u.id === status.user_id);
          return {
            ...status,
            profile: profile ? { name: profile.name, email: profile.email } : undefined
          };
        });
        
        setReadStatuses(statusesWithProfiles);
      } else {
        const { data, error } = await supabase
          .from("routine_notifications_read")
          .select("user_id, read_at")
          .eq("notification_id", id);

        if (error) throw error;
        
        const statusesWithProfiles = (data || []).map(status => {
          const profile = allUsers.find(u => u.id === status.user_id);
          return {
            ...status,
            profile: profile ? { name: profile.name, email: profile.email } : undefined
          };
        });
        
        setReadStatuses(statusesWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching read statuses:", error);
      toast.error("Kunne ikke hente læsestatus");
    } finally {
      setLoadingReadStatus(false);
    }
  };

  const getEligibleUsers = () => {
    if (!selectedItem) return [];
    const notificationDate = new Date(selectedItem.createdAt);
    return allUsers.filter(user => new Date(user.created_at) <= notificationDate);
  };

  const getUnreadUsers = () => {
    const eligibleUsers = getEligibleUsers();
    const readUserIds = readStatuses.map(s => s.user_id);
    return eligibleUsers.filter(user => !readUserIds.includes(user.id));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Opret ny opdatering</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                placeholder="Titel"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <Textarea
                placeholder="Besked"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
              />
            </div>
            <Button type="submit" disabled={loading}>
              {loading ? "Opretter..." : "Opret opdatering"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nyheder</CardTitle>
          <CardDescription>Generelle opdateringer til alle brugere</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {announcements.length === 0 ? (
              <p className="text-muted-foreground">Ingen opdateringer endnu</p>
            ) : (
              announcements.map((announcement) => (
                <Card key={announcement.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold mb-2">{announcement.title}</h3>
                        <p className="text-muted-foreground text-sm">{announcement.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(announcement.created_at).toLocaleString("da-DK")}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openReadStatusDialog('announcement', announcement.id, announcement.title, announcement.created_at)}
                          title="Se hvem der har læst"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(announcement.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rutineopdateringer</CardTitle>
              <CardDescription>Opdateringer knyttet til specifikke rutiner</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRoutineNotifications(!showRoutineNotifications)}
            >
              {showRoutineNotifications ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Skjul
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Vis ({routineNotifications.length})
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {showRoutineNotifications && (
          <CardContent>
            <div className="space-y-4">
              {routineNotifications.length === 0 ? (
                <p className="text-muted-foreground">Ingen rutineopdateringer endnu</p>
              ) : (
                routineNotifications.map((notification) => (
                  <Card key={notification.id}>
                    <CardContent className="pt-6">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-2 mb-2">
                            {notification.shift && (
                              <Badge variant="secondary">{notification.shift.name}</Badge>
                            )}
                            {notification.routine && (
                              <Badge variant="outline">{notification.routine.title}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mb-1">
                            <RefreshCw className="h-3 w-3 text-muted-foreground" />
                            <span className="text-xs text-muted-foreground">Rutineopdatering</span>
                          </div>
                          <p className="text-muted-foreground text-sm">{notification.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(notification.created_at).toLocaleString("da-DK")}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openReadStatusDialog(
                              'routine', 
                              notification.id, 
                              notification.routine?.title || 'Rutineopdatering',
                              notification.created_at
                            )}
                            title="Se hvem der har læst"
                          >
                            <Users className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteRoutineNotification(notification.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Læsestatus</DialogTitle>
            <DialogDescription>
              {selectedItem?.title}
            </DialogDescription>
          </DialogHeader>
          
          {loadingReadStatus ? (
            <div className="text-center py-4 text-muted-foreground">Indlæser...</div>
          ) : (
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Læst ({readStatuses.length})
                </h4>
                {readStatuses.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Ingen har læst denne endnu</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {readStatuses.map((status) => (
                      <div key={status.user_id} className="text-sm p-2 bg-muted/50 rounded">
                        <div className="font-medium">{status.profile?.name || 'Ukendt bruger'}</div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(status.read_at).toLocaleString("da-DK")}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div>
                <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-orange-500"></span>
                  Ikke læst ({getUnreadUsers().length})
                </h4>
                {getUnreadUsers().length === 0 ? (
                  <p className="text-sm text-muted-foreground">Alle har læst denne opdatering</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {getUnreadUsers().map((user) => (
                      <div key={user.id} className="text-sm p-2 bg-muted/50 rounded">
                        <div className="font-medium">{user.name}</div>
                        <div className="text-xs text-muted-foreground">{user.email}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
