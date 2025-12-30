import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Trash2, Users, ChevronDown, ChevronUp, RefreshCw, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
  created_by: string;
}

interface RoutineNotification {
  id: string;
  message: string;
  created_at: string;
  created_by: string | null;
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

const ITEMS_PER_PAGE = 15;

// Component for collapsible text
function CollapsibleText({ text, maxLines = 3 }: { text: string; maxLines?: number }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const lines = text.split('\n');
  const needsCollapse = lines.length > maxLines || text.length > 200;
  
  if (!needsCollapse) {
    return <p className="text-muted-foreground text-sm whitespace-pre-wrap">{text}</p>;
  }

  return (
    <div>
      <p className={`text-muted-foreground text-sm whitespace-pre-wrap ${!isExpanded ? 'line-clamp-3' : ''}`}>
        {text}
      </p>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="text-xs text-primary hover:underline mt-1"
      >
        {isExpanded ? 'Vis mindre' : 'Vis mere'}
      </button>
    </div>
  );
}

export function AnnouncementManager() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [routineNotifications, setRoutineNotifications] = useState<RoutineNotification[]>([]);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<{ type: 'announcement' | 'routine'; id: string; title: string; createdAt: string } | null>(null);
  const [readStatuses, setReadStatuses] = useState<ReadStatus[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [loadingReadStatus, setLoadingReadStatus] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(true);
  const [showRoutineNotifications, setShowRoutineNotifications] = useState(false);
  const [announcementPage, setAnnouncementPage] = useState(1);
  const [routineNotificationPage, setRoutineNotificationPage] = useState(1);

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

    if (!user) {
      toast.error("Du skal være logget ind");
      return;
    }

    setLoading(true);

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

  const getCreatorName = (createdBy: string) => {
    const creator = allUsers.find(u => u.id === createdBy);
    return creator?.name || 'Ukendt';
  };

  // Pagination helpers
  const getAnnouncementsTotalPages = () => Math.ceil(announcements.length / ITEMS_PER_PAGE);
  const getRoutineNotificationsTotalPages = () => Math.ceil(routineNotifications.length / ITEMS_PER_PAGE);
  
  const getPaginatedAnnouncements = () => {
    const start = (announcementPage - 1) * ITEMS_PER_PAGE;
    return announcements.slice(start, start + ITEMS_PER_PAGE);
  };
  
  const getPaginatedRoutineNotifications = () => {
    const start = (routineNotificationPage - 1) * ITEMS_PER_PAGE;
    return routineNotifications.slice(start, start + ITEMS_PER_PAGE);
  };

  const Pagination = ({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) => {
    if (totalPages <= 1) return null;
    
    return (
      <div className="flex items-center justify-center gap-2 mt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <span className="text-sm text-muted-foreground">
          Side {currentPage} af {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    );
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Nyheder</CardTitle>
              <CardDescription>Generelle opdateringer til alle brugere</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAnnouncements(!showAnnouncements)}
            >
              {showAnnouncements ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-1" />
                  Skjul
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-1" />
                  Vis ({announcements.length})
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {showAnnouncements && (
          <CardContent>
            <div className="space-y-4">
              {announcements.length === 0 ? (
                <p className="text-muted-foreground">Ingen opdateringer endnu</p>
              ) : (
                <>
                  {getPaginatedAnnouncements().map((announcement) => (
                    <Card key={announcement.id}>
                      <CardContent className="pt-6">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold mb-2">{announcement.title}</h3>
                            <CollapsibleText text={announcement.message} />
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(announcement.created_at).toLocaleString("da-DK")} · Af {getCreatorName(announcement.created_by)}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
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
                              title="Slet"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Pagination
                    currentPage={announcementPage}
                    totalPages={getAnnouncementsTotalPages()}
                    onPageChange={setAnnouncementPage}
                  />
                </>
              )}
            </div>
          </CardContent>
        )}
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
                <>
                  {getPaginatedRoutineNotifications().map((notification) => (
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
                            <CollapsibleText text={notification.message} />
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(notification.created_at).toLocaleString("da-DK")}
                              {notification.created_by && ` · Af ${getCreatorName(notification.created_by)}`}
                            </p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
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
                              title="Slet"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  <Pagination
                    currentPage={routineNotificationPage}
                    totalPages={getRoutineNotificationsTotalPages()}
                    onPageChange={setRoutineNotificationPage}
                  />
                </>
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
