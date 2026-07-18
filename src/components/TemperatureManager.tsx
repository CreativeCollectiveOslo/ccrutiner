import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { Calendar } from "@/components/ui/calendar";
import { getPaginationRange } from "@/lib/pagination";
import { toast } from "sonner";
import {
  Loader2, Plus, Trash2, Pencil, Check, X, CalendarIcon, Thermometer,
} from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Unit { id: string; name: string; order_index: number; }
interface Shift { id: string; name: string; }
interface Widget {
  id: string; title: string; shift_id: string; section_id: string | null; order_index: number;
  unit_ids: string[];
}
interface Reading {
  id: string; value_celsius: number; note: string | null; created_at: string;
  unit_id: string; user_id: string;
}

const READINGS_PER_PAGE = 25;
const formatTemp = (n: number) =>
  n.toLocaleString("nb-NO", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export function TemperatureManager() {
  const { activeStore } = useStore();
  const [tab, setTab] = useState<"units" | "widgets" | "log">("units");

  return (
    <div className="space-y-6">
      <div className="flex border-b border-border">
        {(["units", "widgets", "log"] as const).map((t) => {
          const label = t === "units" ? "Enheter" : t === "widgets" ? "Skjemaer" : "Logg";
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 px-2 py-3 text-xs sm:text-sm font-medium transition-colors relative ${
                tab === t ? "text-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          );
        })}
      </div>

      {!activeStore ? (
        <p className="text-sm text-muted-foreground">Velg en butikk først.</p>
      ) : tab === "units" ? (
        <UnitsPanel storeId={activeStore.id} />
      ) : tab === "widgets" ? (
        <WidgetsPanel storeId={activeStore.id} />
      ) : (
        <LogPanel storeId={activeStore.id} />
      )}
    </div>
  );
}

/* ================= UNITS ================= */
function UnitsPanel({ storeId }: { storeId: string }) {
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("temperature_units")
      .select("*")
      .eq("store_id", storeId)
      .order("order_index");
    setUnits((data || []) as Unit[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [storeId]);

  const add = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("temperature_units").insert({
      store_id: storeId,
      name: newName.trim(),
      order_index: units.length,
    });
    if (error) return toast.error("Kunne ikke opprette enhet");
    setNewName("");
    load();
  };

  const save = async (id: string) => {
    if (!editName.trim()) return;
    const { error } = await supabase.from("temperature_units")
      .update({ name: editName.trim() }).eq("id", id);
    if (error) return toast.error("Kunne ikke lagre");
    setEditingId(null);
    load();
  };

  const del = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("temperature_units").delete().eq("id", deleteId);
    if (error) return toast.error("Kunne ikke slette");
    setDeleteId(null);
    load();
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm">Legg til enhet</Label>
          <div className="flex gap-2">
            <Input
              placeholder="F.eks. Kjøleskap kaffedisk"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
            />
            <Button onClick={add} disabled={!newName.trim()}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {units.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Ingen enheter ennå.</p>
      ) : (
        <div className="space-y-2">
          {units.map((u) => (
            <Card key={u.id}>
              <CardContent className="p-3 flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-primary shrink-0" />
                {editingId === u.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="h-8"
                      autoFocus
                    />
                    <Button size="sm" variant="ghost" onClick={() => save(u.id)}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <span className="flex-1 text-sm">{u.name}</span>
                    <Button size="sm" variant="ghost"
                      onClick={() => { setEditingId(u.id); setEditName(u.name); }}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeleteId(u.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slette enhet?</AlertDialogTitle>
            <AlertDialogDescription>
              Enheten fjernes fra alle skjemaer. Tidligere målinger beholdes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={del}>Slett</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ================= WIDGETS ================= */
function WidgetsPanel({ storeId }: { storeId: string }) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editWidget, setEditWidget] = useState<Widget | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [fTitle, setFTitle] = useState("");
  const [fShiftId, setFShiftId] = useState<string>("");
  const [fUnits, setFUnits] = useState<string[]>([]);

  const load = async () => {
    setLoading(true);
    const [wRes, uRes, sRes, wuRes] = await Promise.all([
      supabase.from("temperature_widgets").select("*").eq("store_id", storeId).order("order_index"),
      supabase.from("temperature_units").select("*").eq("store_id", storeId).order("order_index"),
      supabase.from("shifts").select("id, name").eq("store_id", storeId).order("order_index"),
      supabase.from("temperature_widget_units").select("widget_id, unit_id"),
    ]);
    const byWidget = new Map<string, string[]>();
    for (const r of (wuRes.data || []) as any[]) {
      if (!byWidget.has(r.widget_id)) byWidget.set(r.widget_id, []);
      byWidget.get(r.widget_id)!.push(r.unit_id);
    }
    setWidgets(((wRes.data || []) as any[]).map((w) => ({
      ...w, unit_ids: byWidget.get(w.id) || [],
    })));
    setUnits((uRes.data || []) as Unit[]);
    setShifts((sRes.data || []) as Shift[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [storeId]);

  const openNew = () => {
    setEditWidget(null);
    setFTitle("");
    setFShiftId(shifts[0]?.id || "");
    setFUnits([]);
    setDialogOpen(true);
  };
  const openEdit = (w: Widget) => {
    setEditWidget(w);
    setFTitle(w.title);
    setFShiftId(w.shift_id);
    setFUnits(w.unit_ids);
    setDialogOpen(true);
  };

  const save = async () => {
    if (!fTitle.trim() || !fShiftId) {
      toast.error("Tittel og vakt er påkrevd");
      return;
    }
    if (editWidget) {
      const { error } = await supabase.from("temperature_widgets").update({
        title: fTitle.trim(), shift_id: fShiftId,
      }).eq("id", editWidget.id);
      if (error) return toast.error("Kunne ikke lagre");
      await supabase.from("temperature_widget_units").delete().eq("widget_id", editWidget.id);
      if (fUnits.length) {
        await supabase.from("temperature_widget_units").insert(
          fUnits.map((uid, i) => ({ widget_id: editWidget.id, unit_id: uid, order_index: i })),
        );
      }
    } else {
      const { data, error } = await supabase.from("temperature_widgets").insert({
        store_id: storeId, shift_id: fShiftId,
        title: fTitle.trim(), order_index: widgets.length,
      }).select().single();
      if (error || !data) return toast.error("Kunne ikke opprette");
      if (fUnits.length) {
        await supabase.from("temperature_widget_units").insert(
          fUnits.map((uid, i) => ({ widget_id: data.id, unit_id: uid, order_index: i })),
        );
      }
    }
    setDialogOpen(false);
    load();
  };

  const del = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("temperature_widgets").delete().eq("id", deleteId);
    if (error) return toast.error("Kunne ikke slette");
    setDeleteId(null);
    load();
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew} disabled={shifts.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> Nytt skjema
        </Button>
      </div>
      {shifts.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Opprett en vakt først under «Rutiner».
        </p>
      )}

      {widgets.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Ingen skjemaer ennå.</p>
      ) : (
        <div className="space-y-2">
          {widgets.map((w) => {
            const shift = shifts.find((s) => s.id === w.shift_id);
            return (
              <Card key={w.id}>
                <CardContent className="p-3 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{w.title}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {shift?.name || "—"} · {w.unit_ids.length} enhet{w.unit_ids.length === 1 ? "" : "er"}
                    </div>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(w)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteId(w.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editWidget ? "Rediger skjema" : "Nytt skjema"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="w-title">Tittel</Label>
              <Input
                id="w-title" value={fTitle}
                onChange={(e) => setFTitle(e.target.value)}
                placeholder="F.eks. Morgentemperaturer"
              />
            </div>
            <div>
              <Label>Vakt</Label>
              <Select value={fShiftId} onValueChange={setFShiftId}>
                <SelectTrigger><SelectValue placeholder="Velg vakt" /></SelectTrigger>
                <SelectContent>
                  {shifts.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Enheter</Label>
              <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                {units.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Opprett enheter først.</p>
                ) : units.map((u) => (
                  <label key={u.id} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={fUnits.includes(u.id)}
                      onCheckedChange={(v) => {
                        setFUnits((prev) =>
                          v ? [...prev, u.id] : prev.filter((x) => x !== u.id));
                      }}
                    />
                    <span className="text-sm">{u.name}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Avbryt</Button>
            <Button onClick={save}>Lagre</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slette skjema?</AlertDialogTitle>
            <AlertDialogDescription>
              Skjemaet fjernes fra vakten. Tidligere målinger beholdes.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={del}>Slett</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ================= LOG ================= */
function LogPanel({ storeId }: { storeId: string }) {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [unitFilter, setUnitFilter] = useState<string>("all");
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();

  const load = async () => {
    setLoading(true);
    const { data: uData } = await supabase
      .from("temperature_units").select("*").eq("store_id", storeId).order("order_index");
    setUnits((uData || []) as Unit[]);

    let q = supabase.from("temperature_readings")
      .select("*", { count: "exact" })
      .eq("store_id", storeId)
      .order("created_at", { ascending: false });
    if (unitFilter !== "all") q = q.eq("unit_id", unitFilter);
    if (fromDate) q = q.gte("created_at", fromDate.toISOString());
    if (toDate) {
      const end = new Date(toDate); end.setHours(23, 59, 59, 999);
      q = q.lte("created_at", end.toISOString());
    }
    const from = (page - 1) * READINGS_PER_PAGE;
    q = q.range(from, from + READINGS_PER_PAGE - 1);
    const { data, count } = await q;
    const list = (data || []) as Reading[];
    setReadings(list);
    setTotal(count || 0);

    const uids = Array.from(new Set(list.map((r) => r.user_id)));
    if (uids.length) {
      const { data: profs } = await supabase.from("profiles").select("id, name").in("id", uids);
      setNames(new Map((profs || []).map((p: any) => [p.id, p.name || "Ukjent"])));
    } else {
      setNames(new Map());
    }
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ },
    [storeId, page, unitFilter, fromDate?.getTime(), toDate?.getTime()]);

  useEffect(() => { setPage(1); }, [unitFilter, fromDate?.getTime(), toDate?.getTime()]);

  const unitName = (id: string) => units.find((u) => u.id === id)?.name || "—";
  const totalPages = Math.max(1, Math.ceil(total / READINGS_PER_PAGE));

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-xs">Enhet</Label>
              <Select value={unitFilter} onValueChange={setUnitFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle</SelectItem>
                  {units.map((u) => (
                    <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Fra dato</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline"
                    className={cn("w-full justify-start text-left font-normal",
                      !fromDate && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {fromDate ? format(fromDate, "d. MMM yyyy", { locale: nb }) : "Alle"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar mode="single" selected={fromDate} onSelect={setFromDate}
                    initialFocus className={cn("p-3 pointer-events-auto")} />
                  {fromDate && (
                    <div className="p-2 border-t">
                      <Button variant="ghost" size="sm" className="w-full"
                        onClick={() => setFromDate(undefined)}>Fjern</Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label className="text-xs">Til dato</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline"
                    className={cn("w-full justify-start text-left font-normal",
                      !toDate && "text-muted-foreground")}>
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {toDate ? format(toDate, "d. MMM yyyy", { locale: nb }) : "Alle"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
                  <Calendar mode="single" selected={toDate} onSelect={setToDate}
                    initialFocus className={cn("p-3 pointer-events-auto")} />
                  {toDate && (
                    <div className="p-2 border-t">
                      <Button variant="ghost" size="sm" className="w-full"
                        onClick={() => setToDate(undefined)}>Fjern</Button>
                    </div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {total} måling{total === 1 ? "" : "er"} totalt
          </p>
        </CardContent>
      </Card>

      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
      ) : readings.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Ingen målinger.</p>
      ) : (
        <div className="space-y-2">
          {readings.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">{unitName(r.unit_id)}</div>
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "d. MMM yyyy 'kl.' HH:mm", { locale: nb })}
                      {" · "}{names.get(r.user_id) || "Ukjent"}
                    </div>
                    {r.note && (
                      <div className="text-xs mt-1 italic text-muted-foreground">{r.note}</div>
                    )}
                  </div>
                  <div className="text-lg font-semibold shrink-0">
                    {formatTemp(Number(r.value_celsius))} °C
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious href="#" onClick={(e) => {
                e.preventDefault(); if (page > 1) setPage(page - 1);
              }} className={page === 1 ? "pointer-events-none opacity-50" : ""} />
            </PaginationItem>
            {getPaginationRange(page, totalPages, 1).map((it, i) =>
              it === "ellipsis" ? (
                <PaginationItem key={`e${i}`}><PaginationEllipsis /></PaginationItem>
              ) : (
                <PaginationItem key={it}>
                  <PaginationLink href="#" onClick={(e) => { e.preventDefault(); setPage(it); }}
                    isActive={it === page}>{it}</PaginationLink>
                </PaginationItem>
              ),
            )}
            <PaginationItem>
              <PaginationNext href="#" onClick={(e) => {
                e.preventDefault(); if (page < totalPages) setPage(page + 1);
              }} className={page === totalPages ? "pointer-events-none opacity-50" : ""} />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  );
}
