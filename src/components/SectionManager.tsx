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
  title: string;
  description: string | null;
  shift_id: string;
  priority: number;
  order_index: number;
  multimedia_url: string | null;
  image_urls: string[] | null;
  section_id: string | null;
}

interface Shift {
  id: string;
  name: string;
  color_code: string;
  order_index: number;
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

  // Section state
  const [sectionDialogOpen, setSectionDialogOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [editSectionDialogOpen, setEditSectionDialogOpen] = useState(false);
  const [editSectionName, setEditSectionName] = useState("");
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [deleteSectionDialogOpen, setDeleteSectionDialogOpen] = useState(false);
  const [deletingSectionId, setDeletingSectionId] = useState<string | null>(null);
  const [deleteWithRoutines, setDeleteWithRoutines] = useState(false);

  // Routine state
  const [routineDialogOpen, setRoutineDialogOpen] = useState(false);
  const [currentSectionForNewRoutine, setCurrentSectionForNewRoutine] = useState<string | null>(null);
  const [newRoutine, setNewRoutine] = useState({
    title: "",
    description: "",
    priority: 0,
    sendNotification: false,
    imageUrls: [] as string[],
  });

  // Edit routine state
  const [editRoutineDialogOpen, setEditRoutineDialogOpen] = useState(false);
  const [editingRoutineId, setEditingRoutineId] = useState<string | null>(null);
  const [editRoutine, setEditRoutine] = useState({
    title: "",
    description: "",
    priority: 0,
    sendNotification: false,
    imageUrls: [] as string[],
  });

  // Move routine state
  const [moveRoutineDialogOpen, setMoveRoutineDialogOpen] = useState(false);
  const [routineToMove, setRoutineToMove] = useState<Routine | null>(null);
  const [targetSectionId, setTargetSectionId] = useState<string>("unsorted");

  const shiftName = shifts.find((s) => s.id === shiftId)?.name || "";

  useEffect(() => {
    fetchSections();
    fetchRoutines();
  }, [shiftId]);

  const fetchSections = async () => {
    const { data, error } = await supabase
      .from("sections")
      .select("*")
      .eq("shift_id", shiftId)
      .order("order_index");

    if (error) {
      console.error(error);
    } else {
      setSections(data || []);
    }
  };

  const fetchRoutines = async () => {
    const { data, error } = await supabase
      .from("routines")
      .select("*")
      .eq("shift_id", shiftId)
      .order("order_index");

    if (error) {
      console.error(error);
    } else {
      setRoutines(data || []);
    }
    setLoading(false);
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const { error } = await supabase.from("sections").insert({
      shift_id: shiftId,
      name: newSectionName,
      order_index: sections.length,
    });

    if (error) {
      toast.error("Kunne ikke opprette avsnitt");
      console.error(error);
    } else {
      toast.success("Avsnitt opprettet!");
      setSectionDialogOpen(false);
      setNewSectionName("");
      fetchSections();
    }
  };

  const handleUpdateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSectionId) return;

    const { error } = await supabase
      .from("sections")
      .update({ name: editSectionName })
      .eq("id", editingSectionId);

    if (error) {
      toast.error("Kunne ikke oppdatere avsnitt");
      console.error(error);
    } else {
      toast.success("Avsnitt oppdatert!");
      setEditSectionDialogOpen(false);
      fetchSections();
    }
  };

  const handleDeleteSection = async () => {
    if (!deletingSectionId) return;

    if (deleteWithRoutines) {
      const { error: routineError } = await supabase
        .from("routines")
        .delete()
        .eq("section_id", deletingSectionId);

      if (routineError) {
        toast.error("Kunne ikke slette rutiner");
        console.error(routineError);
        return;
      }
    } else {
      const { error: moveError } = await supabase
        .from("routines")
        .update({ section_id: null })
        .eq("section_id", deletingSectionId);

      if (moveError) {
        toast.error("Kunne ikke flytte rutiner");
        console.error(moveError);
        return;
      }
    }

    const { error } = await supabase
      .from("sections")
      .delete()
      .eq("id", deletingSectionId);

    if (error) {
      toast.error("Kunne ikke slette avsnitt");
      console.error(error);
    } else {
      toast.success("Avsnitt slettet!");
      setDeleteSectionDialogOpen(false);
      setDeleteWithRoutines(false);
      fetchSections();
      fetchRoutines();
    }
  };

  const handleMoveSection = async (sectionId: string, direction: "up" | "down") => {
    const currentIndex = sections.findIndex((s) => s.id === sectionId);
    if (currentIndex === -1) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= sections.length) return;

    const current = sections[currentIndex];
    const target = sections[targetIndex];

    await supabase.from("sections").update({ order_index: target.order_index }).eq("id", current.id);
    await supabase.from("sections").update({ order_index: current.order_index }).eq("id", target.id);

    fetchSections();
  };

  const handleCreateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();

    const maxOrderIndex = routines.length > 0
      ? Math.max(...routines.map((r) => r.order_index ?? 0)) + 1
      : 0;

    const { data: routineData, error } = await supabase
      .from("routines")
      .insert({
        title: newRoutine.title,
        description: newRoutine.description || null,
        shift_id: shiftId,
        priority: newRoutine.priority,
        order_index: maxOrderIndex,
        section_id: currentSectionForNewRoutine,
        image_urls: newRoutine.imageUrls.length > 0 ? newRoutine.imageUrls : null,
      })
      .select()
      .single();

    if (error) {
      toast.error("Kunne ikke opprette rutine");
      console.error(error);
    } else {
      if (newRoutine.sendNotification && routineData) {
        const shiftName = shifts.find((s) => s.id === shiftId)?.name || "";
        await supabase.from("routine_notifications").insert({
          routine_id: routineData.id,
          shift_id: shiftId,
          message: `Ny rutine lagt til i ${shiftName}: "${newRoutine.title}"`,
          created_by: user?.id,
        });
      }

      toast.success("Rutine opprettet!");
      setRoutineDialogOpen(false);
      setNewRoutine({ title: "", description: "", priority: 0, sendNotification: false, imageUrls: [] });
      setCurrentSectionForNewRoutine(null);
      fetchRoutines();
    }
  };

  const handleUpdateRoutine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoutineId) return;

    const { error } = await supabase
      .from("routines")
      .update({
        title: editRoutine.title,
        description: editRoutine.description || null,
        priority: editRoutine.priority,
        image_urls: editRoutine.imageUrls.length > 0 ? editRoutine.imageUrls : null,
      })
      .eq("id", editingRoutineId);

    if (error) {
      toast.error("Kunne ikke oppdatere rutine");
      console.error(error);
    } else {
      if (editRoutine.sendNotification) {
        const routine = routines.find((r) => r.id === editingRoutineId);
        await supabase.from("routine_notifications").insert({
          routine_id: editingRoutineId,
          shift_id: shiftId,
          message: `Rutine oppdatert i ${shiftName}: "${editRoutine.title}"`,
          created_by: user?.id,
        });
      }

      toast.success("Rutine oppdatert!");
      setEditRoutineDialogOpen(false);
      fetchRoutines();
    }
  };

  const handleDeleteRoutine = async (routineId: string) => {
    const { error } = await supabase.from("routines").delete().eq("id", routineId);

    if (error) {
      toast.error("Kunne ikke slette rutine");
      console.error(error);
    } else {
      toast.success("Rutine slettet!");
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
      fetchRoutines();
    }
  };

  const openEditSection = (section: Section) => {
    setEditingSectionId(section.id);
    setEditSectionName(section.name);
    setEditSectionDialogOpen(true);
  };

  const openDeleteSection = (sectionId: string) => {
    setDeletingSectionId(sectionId);
    setDeleteWithRoutines(false);
    setDeleteSectionDialogOpen(true);
  };

  const openNewRoutine = (sectionId: string | null) => {
    setCurrentSectionForNewRoutine(sectionId);
    setNewRoutine({ title: "", description: "", priority: 0, sendNotification: false, imageUrls: [] });
    setRoutineDialogOpen(true);
  };

  const openEditRoutine = (routine: Routine) => {
    setEditingRoutineId(routine.id);
    setEditRoutine({
      title: routine.title,
      description: routine.description || "",
      priority: routine.priority,
      sendNotification: false,
      imageUrls: routine.image_urls || [],
    });
    setEditRoutineDialogOpen(true);
  };

  const openMoveRoutine = (routine: Routine) => {
    setRoutineToMove(routine);
    setTargetSectionId(routine.section_id || "unsorted");
    setMoveRoutineDialogOpen(true);
  };

  const renderRoutineCard = (routine: Routine) => (
    <div
      key={routine.id}
      className="flex items-start justify-between py-3 border-b last:border-b-0"
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium">{routine.title}</h4>
          {routine.priority > 0 && (
            <Badge variant="secondary" className="text-xs">
              P{routine.priority}
            </Badge>
          )}
        </div>
        {routine.description && (
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
            {routine.description}
          </p>
        )}
        {routine.image_urls && routine.image_urls.length > 0 && (
          <MultiImageDisplay urls={routine.image_urls} className="mt-2" />
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
            <MoreHorizontal className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => openMoveRoutine(routine)}>
            Flytt
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openEditRoutine(routine)}>
            Rediger
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => handleDeleteRoutine(routine.id)}
            className="text-destructive focus:text-destructive"
          >
            Slett
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );

  if (loading) {
    return <p className="text-sm text-muted-foreground">Laster...</p>;
  }

  const unsortedRoutines = routines.filter((r) => !r.section_id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">{shiftName}</h2>
        <Dialog open={sectionDialogOpen} onOpenChange={setSectionDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <FolderOpen className="h-4 w-4 mr-2" />
              Nytt avsnitt
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateSection}>
              <DialogHeader>
                <DialogTitle>Opprett nytt avsnitt</DialogTitle>
                <DialogDescription>
                  Organiser rutinene dine i avsnitt som f.eks. "Kafe", "Toalett" osv.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label htmlFor="section-name">Avsnittsnavn *</Label>
                <Input
                  id="section-name"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder="F.eks. Kafe"
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit">Opprett avsnitt</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Unsorted Routines */}
      <div className="bg-muted/60 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Usorterte rutiner</span>
            <Badge variant="secondary" className="text-xs">{unsortedRoutines.length}</Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={() => openNewRoutine(null)} className="h-7 text-xs">
            <Plus className="h-3 w-3 mr-1" />
            Ny rutine
          </Button>
        </div>
        {unsortedRoutines.length === 0 ? (
          <p className="text-sm text-muted-foreground py-2">Ingen usorterte rutiner</p>
        ) : (
          <div>{unsortedRoutines.map(renderRoutineCard)}</div>
        )}
      </div>

      {/* Named Sections */}
      {sections.map((section) => {
        const sectionRoutines = routines.filter((r) => r.section_id === section.id);
        const sectionIndex = sections.findIndex((s) => s.id === section.id);
        return (
          <div key={section.id} className="bg-muted/60 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border/50">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground truncate">
                  {section.name}
                </span>
                <Badge variant="secondary" className="text-xs shrink-0">{sectionRoutines.length}</Badge>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openNewRoutine(section.id)} className="h-7 text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Ny rutine
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7">
                      <MoreHorizontal className="h-3.5 w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => openEditSection(section)}>
                      Rediger
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleMoveSection(section.id, "up")}
                      disabled={sectionIndex === 0}
                    >
                      Flytt opp
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => handleMoveSection(section.id, "down")}
                      disabled={sectionIndex === sections.length - 1}
                    >
                      Flytt ned
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => openDeleteSection(section.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      Slett
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {sectionRoutines.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">Ingen rutiner i dette avsnittet</p>
            ) : (
              <div>{sectionRoutines.map(renderRoutineCard)}</div>
            )}
          </div>
        );
      })}

      {/* Edit Section Dialog */}
      <Dialog open={editSectionDialogOpen} onOpenChange={setEditSectionDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpdateSection}>
            <DialogHeader>
              <DialogTitle>Rediger avsnitt</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label htmlFor="edit-section-name">Avsnittsnavn *</Label>
              <Input
                id="edit-section-name"
                value={editSectionName}
                onChange={(e) => setEditSectionName(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditSectionDialogOpen(false)}>
                Avbryt
              </Button>
              <Button type="submit">Lagre endringer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Section Alert Dialog */}
      <AlertDialog open={deleteSectionDialogOpen} onOpenChange={setDeleteSectionDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slett avsnitt</AlertDialogTitle>
            <AlertDialogDescription>
              {(() => {
                const sectionRoutineCount = routines.filter(
                  (r) => r.section_id === deletingSectionId
                ).length;
                if (sectionRoutineCount === 0) {
                  return "Er du sikker på at du vil slette dette avsnittet?";
                }
                return `Dette avsnittet har ${sectionRoutineCount} rutine(r). Hva vil du gjøre med dem?`;
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {routines.filter((r) => r.section_id === deletingSectionId).length > 0 && (
            <div className="space-y-3">
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <input
                  type="radio"
                  name="deleteAction"
                  checked={!deleteWithRoutines}
                  onChange={() => setDeleteWithRoutines(false)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-sm">Flytt til usorterte</p>
                  <p className="text-xs text-muted-foreground">
                    Rutinene flyttes til usorterte rutiner
                  </p>
                </div>
              </label>
              <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-muted/50">
                <input
                  type="radio"
                  name="deleteAction"
                  checked={deleteWithRoutines}
                  onChange={() => setDeleteWithRoutines(true)}
                  className="mt-1"
                />
                <div>
                  <p className="font-medium text-sm text-destructive">Slett alt</p>
                  <p className="text-xs text-muted-foreground">
                    Alle rutiner i dette avsnittet slettes permanent
                  </p>
                </div>
              </label>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteSection}
              className={deleteWithRoutines ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {deleteWithRoutines ? "Slett avsnitt og rutiner" : "Slett avsnitt"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* New Routine Dialog */}
      <Dialog open={routineDialogOpen} onOpenChange={setRoutineDialogOpen}>
        <DialogContent>
          <form onSubmit={handleCreateRoutine}>
            <DialogHeader>
              <DialogTitle>Opprett ny rutine</DialogTitle>
              <DialogDescription>
                Legg til en ny rutine i {shiftName}
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
                <Label>Bilde</Label>
                <MultiImageUpload
                  folder="routines"
                  currentUrls={newRoutine.imageUrls}
                  onImagesChanged={(urls) => setNewRoutine({ ...newRoutine, imageUrls: urls })}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="new-notification">Send varsling</Label>
                  <p className="text-sm text-muted-foreground">
                    Varsle medarbeidere om denne nye rutinen
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
              <Button type="submit">Opprett rutine</Button>
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
                <Label>Bilde</Label>
                <MultiImageUpload
                  folder="routines"
                  currentUrls={editRoutine.imageUrls}
                  onImagesChanged={(urls) => setEditRoutine({ ...editRoutine, imageUrls: urls })}
                />
              </div>
              <div className="flex items-center justify-between py-2">
                <div className="space-y-0.5">
                  <Label htmlFor="edit-notification">Send varsling</Label>
                  <p className="text-sm text-muted-foreground">
                    Varsle medarbeidere om denne endringen
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
                Avbryt
              </Button>
              <Button type="submit">Lagre endringer</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move Routine Dialog */}
      <Dialog open={moveRoutineDialogOpen} onOpenChange={setMoveRoutineDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Flytt rutine</DialogTitle>
            <DialogDescription>
              Velg hvor du vil flytte "{routineToMove?.title}" til
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="target-section">Flytt til avsnitt</Label>
            <Select value={targetSectionId} onValueChange={setTargetSectionId}>
              <SelectTrigger id="target-section">
                <SelectValue placeholder="Velg avsnitt" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unsorted">Usorterte rutiner</SelectItem>
                {sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}</SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setMoveRoutineDialogOpen(false)}>
              Avbryt
            </Button>
            <Button onClick={handleMoveRoutine}>Flytt rutine</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
