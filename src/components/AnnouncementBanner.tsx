import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell } from "lucide-react";
import { toast } from "sonner";

interface Announcement {
  id: string;
  title: string;
  message: string;
  created_at: string;
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [readAnnouncements, setReadAnnouncements] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: announcementsData, error: announcementsError } = await supabase
      .from("announcements")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(5);

    if (announcementsError) {
      console.error(announcementsError);
      return;
    }

    const { data: readData, error: readError } = await supabase
      .from("announcements_read")
      .select("announcement_id")
      .eq("user_id", user.id);

    if (readError) {
      console.error(readError);
    } else if (readData) {
      setReadAnnouncements(new Set(readData.map(r => r.announcement_id)));
    }

    if (announcementsData) {
      setAnnouncements(announcementsData);
    }
  };

  const markAsRead = async (announcementId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("announcements_read")
      .insert([{ announcement_id: announcementId, user_id: user.id }]);

    if (error) {
      toast.error("Kunne ikke markere som læst");
    } else {
      setReadAnnouncements(prev => new Set(prev).add(announcementId));
      toast.success("Markeret som læst");
    }
  };

  const unreadAnnouncements = announcements.filter(
    a => !readAnnouncements.has(a.id)
  );

  if (unreadAnnouncements.length === 0) return null;

  return (
    <div className="space-y-4 mb-6">
      {unreadAnnouncements.map((announcement) => (
        <Card key={announcement.id} className="border-primary/50 bg-primary/5">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4 mb-4">
              <Bell className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold mb-1">{announcement.title}</h3>
                <p className="text-sm text-muted-foreground">{announcement.message}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {new Date(announcement.created_at).toLocaleDateString("da-DK")}
                </p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                variant="default"
                size="sm"
                onClick={() => markAsRead(announcement.id)}
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
