import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Search, FileText, Bell, ClipboardList, Loader2, X } from "lucide-react";
import { format } from "date-fns";
import { da } from "date-fns/locale";

interface SearchResult {
  id: string;
  type: "routine" | "notification" | "bulletin";
  title: string;
  description?: string;
  context?: string;
  shiftId?: string;
  routineId?: string;
  createdAt?: string;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToShift: (shiftId: string, routineId?: string, searchTerm?: string) => void;
  onNavigateToNotifications: (searchTerm?: string) => void;
  onNavigateToBulletin: (searchTerm?: string) => void;
}

export function SearchDialog({
  open,
  onOpenChange,
  onNavigateToShift,
  onNavigateToNotifications,
  onNavigateToBulletin,
}: SearchDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setSearchQuery("");
      setResults([]);
    }
  }, [open]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
    }
  }, [debouncedQuery]);

  const performSearch = async (query: string) => {
    setIsSearching(true);
    const allResults: SearchResult[] = [];

    try {
      // Search routines with shift info
      const { data: routinesData } = await supabase
        .from("routines")
        .select("id, title, description, shift_id, shifts(name)")
        .or(`title.ilike.%${query}%,description.ilike.%${query}%`);

      if (routinesData) {
        routinesData.forEach((routine: any) => {
          allResults.push({
            id: routine.id,
            type: "routine",
            title: routine.title,
            description: routine.description || undefined,
            context: routine.shifts?.name || "Ukendt vagt",
            shiftId: routine.shift_id,
            routineId: routine.id,
          });
        });
      }

      // Search announcements
      const { data: announcementsData } = await supabase
        .from("announcements")
        .select("id, title, message, created_at")
        .or(`title.ilike.%${query}%,message.ilike.%${query}%`);

      if (announcementsData) {
        announcementsData.forEach((announcement) => {
          allResults.push({
            id: announcement.id,
            type: "notification",
            title: announcement.title,
            description: announcement.message,
            createdAt: announcement.created_at,
          });
        });
      }

      // Search routine notifications
      const { data: routineNotifsData } = await supabase
        .from("routine_notifications")
        .select("id, message, created_at, routines(title)")
        .ilike("message", `%${query}%`);

      if (routineNotifsData) {
        routineNotifsData.forEach((notif: any) => {
          allResults.push({
            id: notif.id,
            type: "notification",
            title: notif.routines?.title || "Rutine notifikation",
            description: notif.message,
            createdAt: notif.created_at,
          });
        });
      }

      // Search bulletin posts (including title)
      const { data: bulletinData } = await supabase
        .from("bulletin_posts")
        .select("id, title, message, created_at")
        .or(`title.ilike.%${query}%,message.ilike.%${query}%`);

      if (bulletinData) {
        bulletinData.forEach((post: any) => {
          allResults.push({
            id: post.id,
            type: "bulletin",
            title: post.title || truncateText(post.message, 50),
            description: post.message,
            createdAt: post.created_at,
          });
        });
      }

      setResults(allResults);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setIsSearching(false);
    }
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query || !text) return text;
    try {
      const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`(${escapedQuery})`, "gi");
      const parts = text.split(regex);
      return parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <mark key={i} className="bg-yellow-300 text-yellow-900 rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      );
    } catch {
      return text;
    }
  };

  const handleResultClick = (result: SearchResult) => {
    onOpenChange(false);
    
    if (result.type === "routine" && result.shiftId) {
      onNavigateToShift(result.shiftId, result.routineId, debouncedQuery);
    } else if (result.type === "notification") {
      onNavigateToNotifications(debouncedQuery);
    } else if (result.type === "bulletin") {
      onNavigateToBulletin(debouncedQuery);
    }
  };

  const routineResults = results.filter((r) => r.type === "routine");
  const notificationResults = results.filter((r) => r.type === "notification");
  const bulletinResults = results.filter((r) => r.type === "bulletin");

  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "routine":
        return <FileText className="h-4 w-4 text-muted-foreground" />;
      case "notification":
        return <Bell className="h-4 w-4 text-muted-foreground" />;
      case "bulletin":
        return <ClipboardList className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md w-[calc(100%-2rem)] mx-auto sm:w-full sm:mx-0 p-0 gap-0 [&>button:last-child]:hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="sr-only">Søg</DialogTitle>
          <div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-background">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Søg efter rutiner, notifikationer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="border-0 p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            {isSearching && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <DialogClose asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                <X className="h-4 w-4" />
                <span className="sr-only">Luk</span>
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          {searchQuery.length < 2 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Skriv mindst 2 tegn for at søge</p>
            </div>
          ) : results.length === 0 && !isSearching ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Ingen resultater fundet</p>
              <p className="text-xs mt-1">Prøv et andet søgeord</p>
            </div>
          ) : (
            <div className="p-2 space-y-4">
              {routineResults.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2 py-1">
                    Rutiner
                  </h3>
                  <div className="space-y-1">
                    {routineResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left px-2 py-2 rounded-md hover:bg-accent transition-colors flex items-start gap-3"
                      >
                        {getResultIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {highlightMatch(result.title, debouncedQuery)}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {result.context}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {notificationResults.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2 py-1">
                    Notifikationer
                  </h3>
                  <div className="space-y-1">
                    {notificationResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left px-2 py-2 rounded-md hover:bg-accent transition-colors flex items-start gap-3"
                      >
                        {getResultIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {highlightMatch(result.title, debouncedQuery)}
                          </p>
                          {result.description && (
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {highlightMatch(result.description, debouncedQuery)}
                            </p>
                          )}
                          {result.createdAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(result.createdAt), "d. MMMM yyyy", { locale: da })}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {bulletinResults.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2 py-1">
                    Logbog
                  </h3>
                  <div className="space-y-1">
                    {bulletinResults.map((result) => (
                      <button
                        key={result.id}
                        onClick={() => handleResultClick(result)}
                        className="w-full text-left px-2 py-2 rounded-md hover:bg-accent transition-colors flex items-start gap-3"
                      >
                        {getResultIcon(result.type)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm line-clamp-2">
                            {highlightMatch(result.description || result.title, debouncedQuery)}
                          </p>
                          {result.createdAt && (
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {format(new Date(result.createdAt), "d. MMMM yyyy", { locale: da })}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
