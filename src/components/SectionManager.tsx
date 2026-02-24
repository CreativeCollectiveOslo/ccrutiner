import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, FolderOpen, MoveRight, MoreHorizontal, ChevronUp, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { MultiImageUpload, MultiImageDisplay } from "@/components/ImageUpload";

interface Section {
  id: string;
  shift_id: string;
  name: string;
  order_index: number;
}

interface Routine {
  id: string;
  shift_id: string;
  section_id: string | null;
  title: string;
  description: string | null;
  multimedia_url: string | null;
  image_urls: string[] | null;
  priority: number;
  order_index: number;
}

interface Shift {
  id: string;
  name: string;
}

interface SectionManagerProps {
  shiftId: string;
  shifts: Shift[];
}

export function SectionManager({ shiftId, shifts }: SectionManagerProps) {
  const { user } = useAuth();
  const [sections, setSections] = useState<Section[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isCreating, setIsCreating] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Section dialogs
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [editSectionDialogOpen, setEditSectionDialogOpen] = useState(false);
  const [deleteSectionDialogOpen, setDeleteSectionDialogOpen] = useState(false);
  const [sectionToDelete, setSectionToDelete] = useState<Section | null>(null);
  const [deleteWithRoutines, setDeleteWithRoutines] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [newSectionName, setNewSectionName] = useState("");
  const [editSectionName, setEditSectionName] = useState("");
  
  // Routine dialogs
  const [routineDialogOpen, setRoutineDialogOpen] = useState(false);
  const [editRoutineDialogOpen, setEditRoutineDialogOpen] = useState(false);
  const [moveRoutineDialogOpen, setMoveRoutineDialogOpen] = useState(false);
  const [routineToMove, setRoutineToMove] = useState<Routine | null>(null);
  const [targetSectionId, setTargetSectionId] = useState<string>("");
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null);
  const [currentSectionForNewRoutine, setCurrentSectionForNewRoutine] = useState<string | null>(null);
  
  const [newRoutine, setNewRoutine] = useState({
    title: "",
    description: "",
    priority: 0,
    sendNotification: false,
    imageUrls: [] as string[],
  });
  
  const [editRoutine, setEditRoutine] = useState({
    title: "",
    description: "",
    priority: 0,
    sendNotification: false,
    imageUrls: [] as string[],
  });

  useEffect(() => {
    if (shiftId) {
      fetchSections();
      fetchRoutines();
    }
  }, [shiftId]);

  const fetchSections = async () => {
    const { data, error } = await supabase
      .from("sections")
      .select("*")
      .eq("shift_id", shiftId)
      .order("order_index");

    if (error) {
      toast.error("Kunne ikke hente afsnit");
      console.error(error);
    } else {
      setSections(data || []);
    }
    setLoading(false);
  };

  const fetchRoutines = async () => {
    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .eq("shift_id", shiftId)
      .order("priority", { ascending: false })
      .order("order_index");

    if (error) {
      toast.error("Kunne ikke hente rutiner");
      console.error(error);
    } else {
      setRoutines(data || []);
    }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("sections").insert({
      shift_id: shiftId,
      name: newSectionName,
      order_index: sections.length,
    });

    if (error) {
      toast.error("Kunne ikke oprette afsnit");
      console.error(error);
    } else {
      toast.success("Afsnit oprettet!");
      setSectionDialogOpen(false);
      setNewSectionName("");
      fetchSections();
    }
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSection) return;

    const { error } = await supabase
      .from("sections")
      .update({ name: editSectionName })
      .eq("id", editingSection.id);

    if (error) {
      toast.error("Kunne ikke opdatere afsnit");
      console.error(error);
    } else {
      toast.success("Afsnit opdateret!");
      setEditSectionDialogOpen(false);
      setEditingSection(null);
      fetchSections();
    }
  };

  const handleDeleteSectionClick = (section: Section) => {
    const sectionRoutines = routines.filter((r) => r.section_id === section.id);
    setSectionToDelete(section);
    setDeleteWithRoutines(false);
    setDeleteSectionDialogOpen(true);
  };

  const handleDeleteSection = async () => {
    if (!sectionToDelete) return;

    const sectionRoutines = routines.filter((r) => r.section_id === sectionToDelete.id);

    if (sectionRoutines.length > 0 && !deleteWithRoutines) {
      const { error: moveError } = await supabase
        .from("routines")
        .update({ section_id: null })
        .eq("section_id", sectionToDelete.id);

      if (moveError) {
        toast.error("Kunne ikke flytte rutiner");
        console.error(moveError);
        return;
      }
    }

    if (deleteWithRoutines && sectionRoutines.length > 0) {
      const { error: deleteRoutinesError } = await supabase
        .from("routines")
        .delete()
        .eq("section_id", sectionToDelete.id);

      if (deleteRoutinesError) {
        toast.error("Kunne ikke slette rutiner");
        console.error(deleteRoutinesError);
        return;
      }
    }

    const { error } = await supabase
      .from("sections")
      .delete()
      .eq("id", sectionToDelete.id);

    if (error) {
      toast.error("Kunne ikke slette afsnit");
      console.error(error);
    } else {
      toast.success("Afsnit slettet!");
      setDeleteSectionDialogOpen(false);
      setSectionToDelete(null);
      fetchSections();
      fetchRoutines();
    }
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();

    const { data: routineData, error } = await supabase
      .from("routines")
      .insert({
        shift_id: shiftId,
        section_id: currentSectionForNewRoutine,
        title: newRoutine.title,
        description: newRoutine.description || null,
        image_urls: newRoutine.imageUrls.length > 0 ? newRoutine.imageUrls : null,
        multimedia_url: newRoutine.imageUrls[0] || null,
        priority: newRoutine.priority,
        order_index: routines.filter((r) => r.section_id === currentSectionForNewRoutine).length,
      } as any)
      .select()
      .single();

    if (error) {
      toast.error("Kunne ikke oprette rutine");
      console.error(error);
    } else {
      if (newRoutine.sendNotification && routineData) {
        const shiftName = shifts.find((s) => s.id === shiftId)?.name || "";
        await supabase.from("routine_notifications").insert({
          routine_id: routineData.id,
          shift_id: shiftId,
          message: `Ny rutine tilføjet til ${shiftName}: "${newRoutine.title}"`,
          created_by: user?.id,
        });
      }

      toast.success("Rutine oprettet!");
      setRoutineDialogOpen(false);
      setNewRoutine({ title: "", description: "", priority: 0, sendNotification: false, imageUrls: [] });
      setCurrentSectionForNewRoutine(null);
      fetchRoutines();
    }
  };

  const handleUpdateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoutine) return;

    const { error } = await supabase
      .from("routines")
      .update({
        title: editRoutine.title,
        description: editRoutine.description || null,
        image_urls: editRoutine.imageUrls.length > 0 ? editRoutine.imageUrls : null,
        multimedia_url: editRoutine.imageUrls[0] || null,
        priority: editRoutine.priority,
      } as any)
      .eq("id", editingRoutine.id);

    if (error) {
      toast.error("Kunne ikke opdatere rutine");
      console.error(error);
    } else {
      if (editRoutine.sendNotification) {
        const shiftName = shifts.find((s) => s.id === shiftId)?.name || "";
        await supabase.from("routine_notifications").insert({
          routine_id: editingRoutine.id,
          shift_id: shiftId,
          message: `Rutine opdateret i ${shiftName}: "${editRoutine.title}"`,
          created_by: user?.id,
        });
      }

      toast.success("Rutine opdateret!");
      setEditRoutineDialogOpen(false);
      setEditingRoutine(null);
      fetchRoutines();
    }
  };

  const handleDeleteRoutine = async (id: string) => {
    const { error } = await supabase.from("routines").delete().eq("id", id);

    if (error) {
      toast.error("Kunne ikke slette rutine");
      console.error(error);
    } else {
      toast.success("Rutine slettet");
      fetchRoutines();
    }
  };

  const handleMoveRoutine = async () => {
    if (!routineToMove) return;

    const newSectionId = targetSectionId === "unsorted" ? null : targetSectionId;

    const { error } = await supabase
      .from("routines")
      .update({ section_id: newSectionId })
      .eq("id", routineToMove.id);

    if (error) {
      toast.error("Kunne ikke flytte rutine");
      console.error(error);
    } else {
      toast.success("Rutine flyttet!");
      setMoveRoutineDialogOpen(false);
      setRoutineToMove(null);
      setTargetSectionId("");
      fetchRoutines();
    }
  };

  const openEditSection = (section: Section) => {
    setEditingSection(section);
    setEditSectionName(section.name);
    setEditSectionDialogOpen(true);
  };

  const openEditRoutine = (routine: Routine) => {
    setEditingRoutine(routine);
    setEditRoutine({
      title: routine.title,
      description: routine.description || "",
      priority: routine.priority,
      sendNotification: false,
      imageUrls: routine.image_urls?.length ? routine.image_urls : routine.multimedia_url ? [routine.multimedia_url] : [],
    });
    setEditRoutineDialogOpen(true);
  };

  const openMoveRoutine = (routine: Routine) => {
    setRoutineToMove(routine);
    setTargetSectionId(routine.section_id || "unsorted");
    setMoveRoutineDialogOpen(true);
  };

  const openNewRoutineDialog = (sectionId: string | null) => {
    setCurrentSectionForNewRoutine(sectionId);
    setRoutineDialogOpen(true);
  };

  const unsortedRoutines = routines.filter((r) => !r.section_id);

  const getSectionRoutineCount = (sectionId: string) => {
    return routines.filter((r) => r.section_id === sectionId).length;
  };

  const handleMoveSection = async (sectionId: string, direction: "up" | "down") => {
    const currentIndex = sections.findIndex((s) => s.id === sectionId);
    if (currentIndex === -1) return;

    const newIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= sections.length) return;

    const otherSection = sections[newIndex];
    const currentSection = sections[currentIndex];

    const { error: error1 } = await supabase
      .from("sections")
      .update({ order_index: newIndex })
      .eq("id", currentSection.id);

    const { error: error2 } = await supabase
      .from("sections")
      .update({ order_index: currentIndex })
      .eq("id", otherSection.id);

    if (error1 || error2) {
      toast.error("Kunne ikke flytte afsnit");
      console.error(error1 || error2);
    } else {
      fetchSections();
    }
  };

  const shiftName = shifts.find((s) => s.id === shiftId)?.name || "";

  // --- Routine card with dropdown menu ---
  const renderRoutineCard = (routine: Routine, index: number, arr: Routine[]) => (
    <div
      key={routine.id}
      className={`flex items-start justify-between gap-2 py-3 ${index < arr.length - 1 ? "border-b border-border/50" : ""}`}
    >
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="flex items-center gap-2 flex-wrap">
          <h4 className="text-sm font-medium break-words">{routine.title}</h4>
          {routine.priority > 0 && (
            <Badge variant="secondary" className="text-xs shrink-0">
              P:{routine.priority}
            </Badge>
          )}
        </div>
        {routine.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 break-words">
            {routine.description}
          </p>
        )}
        {(() => {
          const urls = routine.image_urls?.length ? routine.image_urls : routine.multimedia_url ? [routine.multimedia_url] : [];
          return urls.length > 0 && <MultiImageDisplay urls={urls} className="mt-2" />;
        })()}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openMoveRoutine(routine)}>
            <MoveRight className="h-4 w-4 mr-2" />
            Flyt
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openEditRoutine(routine)}>
            <Pencil className="h-4 w-4 mr-2" />
            Rediger
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleDeleteRoutine(routine.id)}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Slet
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  return (
    <div className="space-y-8 min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold truncate">{shiftName} Rutiner</h2>
          <p className="text-xs text-muted-foreground">
            {routines.length} rutiner, {sections.length} afsnit
          </p>
        </div>
        <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" className="shrink-0 w-full sm:w-auto">
              <FolderOpen className="h-4 w-4 mr-2" />
              Nyt Afsnit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateSection}>
              <DialogHeader>
                <DialogTitle>Opret nyt afsnit</DialogTitle>
                <DialogDescription>
                  Organiser dine rutiner i afsnit som f.eks. "Kafe", "Toilet" osv.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="section-name">Afsnit navn *</Label>
                <Input
                  id="section-name"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="F.eks. Kafe"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit">Opret afsnit</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Unsorted Routines */}
      <div className="bg-muted/30 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usorterede rutiner</span>
            <Badge variant="secondary" className="text-[10px] h-5">
              {unsortedRoutines.length}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => openNewRoutineDialog(null)}
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Ny Rutine
          </Button>
        </div>
        {unsortedRoutines.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">
            Ingen usorterede rutiner
          </p>
        ) : (
          <div>
            {unsortedRoutines.map((r, i, arr) => renderRoutineCard(r, i, arr))}
          </div>
        )}
      </div>

      {/* Sections */}
      {sections.map((section) => {
        const sectionRoutines = routines.filter((r) => r.section_id === section.id);
        const sectionIndex = sections.findIndex((s) => s.id === section.id);
        return (
          <div key={section.id} className="bg-muted/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                  {section.name}
                </span>
                <Badge variant="secondary" className="text-[10px] h-5 shrink-0">
                  {sectionRoutines.length}
                </Badge>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  onClick={() => openNewRoutineDialog(section.id)}
                >
                  <Plus className="h-3.5 w-3.5 sm:mr-1" />
                  <span className="hidden sm:inline">Ny Rutine</span>
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditSection(section)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Rediger
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleMoveSection(section.id, "up")}
                      disabled={sectionIndex === 0}
                    >
                      <ChevronUp className="h-4 w-4 mr-2" />
                      Flyt op
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleMoveSection(section.id, "down")}
                      disabled={sectionIndex === sections.length - 1}
                    >
                      <ChevronDown className="h-4 w-4 mr-2" />
                      Flyt ned
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleDeleteSectionClick(section)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Slet
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {sectionRoutines.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">
                Ingen rutiner i dette afsnit
              </p>
            ) : (
              <div>
                {sectionRoutines.map((r, i, arr) => renderRoutineCard(r, i, arr))}
              </div>
            )}
          </div>
        );
      })}

      {/* Edit Section Dialog */}
      <Dialog open={editSectionDialogOpen} onOpenChange={setEditSectionDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpdateSection}>
            <DialogHeader>
              <DialogTitle>Rediger afsnit</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="edit-section-name">Afsnit navn *</Label>
              <Input
                id="edit-section-name"
                value={editSectionName}
                onChange={(e) => setEditSectionName(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditSectionDialogOpen(false)}>
                Annuller
              </Button>
              <Button type="submit">Gem ændringer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Section Alert Dialog */}
      <AlertDialog open={deleteSectionDialogOpen} onOpenChange={setDeleteSectionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet afsnit</AlertDialogTitle>
            <AlertDialogDescription>
              {sectionToDelete && getSectionRoutineCount(sectionToDelete.id) > 0 ? (
                <>
                  Dette afsnit indeholder{" "}
                  <strong>{getSectionRoutineCount(sectionToDelete.id)} rutiner</strong>.
                  Hvad vil du gøre med dem?
                </>
              ) : (
                "Er du sikker på at du vil slette dette afsnit?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {sectionToDelete && getSectionRoutineCount(sectionToDelete.id) > 0 && (
            <div className="space-y-3 py-2">
              <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-accent">
                <input
                  type="radio"
                  name="deleteOption"
                  checked={!deleteWithRoutines}
                  onChange={() => setDeleteWithRoutines(false)}
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium text-sm">Flyt rutiner til usorterede</p>
                  <p className="text-xs text-muted-foreground">
                    Rutinerne flyttes og kan organiseres senere
                  </p>
                </div>
              </label>
              <label className="flex items-center gap-3 p-3 border border-destructive/50 rounded-lg cursor-pointer hover:bg-destructive/5">
                <input
                  type="radio"
                  name="deleteOption"
                  checked={deleteWithRoutines}
                  onChange={() => setDeleteWithRoutines(true)}
                  className="h-4 w-4"
                />
                <div>
                  <p className="font-medium text-sm text-destructive">Slet alle rutiner</p>
                  <p className="text-xs text-muted-foreground">
                    Alle rutiner i dette afsnit slettes permanent
                  </p>
                </div>
              </label>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Annuller</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSection}
              className={deleteWithRoutines ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {deleteWithRoutines ? "Slet afsnit og rutiner" : "Slet afsnit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Routine Dialog */}
      <Dialog open={routineDialogOpen} onOpenChange={setRoutineDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateRoutine}>
            <DialogHeader>
              <DialogTitle>Opret ny rutine</DialogTitle>
              <DialogDescription>
                Tilføj en ny rutine til {shiftName}
                {currentSectionForNewRoutine &&
                  ` - ${sections.find((s) => s.id === currentSectionForNewRoutine)?.name}`}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="new-title">Tittel *</Label>
                <Input
                  id="new-title"
                  value={newRoutine.title}
                  onChange={(e) => setNewRoutine({ ...newRoutine, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-description">Beskrivelse</Label>
                <Textarea
                  id="new-description"
                  value={newRoutine.description}
                  onChange={(e) => setNewRoutine({ ...newRoutine, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-priority">Prioritet</Label>
                <Input
                  id="new-priority"
                  type="number"
                  value={newRoutine.priority}
                  onChange={(e) =>
                    setNewRoutine({ ...newRoutine, priority: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Billede</Label>
                <MultiImageUpload
                  folder="routines"
                  currentUrls={newRoutine.imageUrls}
                  onImagesChanged={(urls) => setNewRoutine({ ...newRoutine, imageUrls: urls })}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="new-notification">Send notifikation</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificér medarbejdere om denne nye rutine
                  </p>
                </div>
                <Switch
                  id="new-notification"
                  checked={newRoutine.sendNotification}
                  onCheckedChange={(checked) =>
                    setNewRoutine({ ...newRoutine, sendNotification: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="submit">Opret rutine</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Routine Dialog */}
      <Dialog open={editRoutineDialogOpen} onOpenChange={setEditRoutineDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpdateRoutine}>
            <DialogHeader>
              <DialogTitle>Rediger rutine</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Tittel *</Label>
                <Input
                  id="edit-title"
                  value={editRoutine.title}
                  onChange={(e) => setEditRoutine({ ...editRoutine, title: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-description">Beskrivelse</Label>
                <Textarea
                  id="edit-description"
                  value={editRoutine.description}
                  onChange={(e) => setEditRoutine({ ...editRoutine, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Prioritet</Label>
                <Input
                  id="edit-priority"
                  type="number"
                  value={editRoutine.priority}
                  onChange={(e) =>
                    setEditRoutine({ ...editRoutine, priority: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Billede</Label>
                <MultiImageUpload
                  folder="routines"
                  currentUrls={editRoutine.imageUrls}
                  onImagesChanged={(urls) => setEditRoutine({ ...editRoutine, imageUrls: urls })}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-notification">Send notifikation</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificér medarbejdere om denne ændring
                  </p>
                </div>
                <Switch
                  id="edit-notification"
                  checked={editRoutine.sendNotification}
                  onCheckedChange={(checked) =>
                    setEditRoutine({ ...editRoutine, sendNotification: checked })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditRoutineDialogOpen(false)}>
                Annuller
              </Button>
              <Button type="submit">Gem ændringer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move Routine Dialog */}
      <Dialog open={moveRoutineDialogOpen} onOpenChange={setMoveRoutineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flyt rutine</DialogTitle>
            <DialogDescription>
              Vælg hvor du vil flytte "{routineToMove?.title}" til
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="target-section">Flyt til afsnit</Label>
            <Select value={targetSectionId} onValueChange={setTargetSectionId}>
              <SelectTrigger id="target-section">
                <SelectValue placeholder="Vælg afsnit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unsorted">Usorterede rutiner</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveRoutineDialogOpen(false)}>
              Annuller
            </Button>
            <Button onClick={handleMoveRoutine}>Flyt rutine</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
