import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
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
  Loader2, Plus, Trash2, ChevronRight, CalendarIcon, Thermometer, Download, ArrowLeft, Check,
} from "lucide-react";
import { format } from "date-fns";
import { nb } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Point { id: string; name: string; order_index: number; }
interface Reading {
  id: string; value_celsius: number; note: string | null; created_at: string;
  unit_id: string; user_id: string; routine_id: string | null;
}

const READINGS_PER_PAGE = 25;
const formatTemp = (n: number) =>
  n.toLocaleString("nb-NO", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export function TemperatureManager() {
  const { activeStore } = useStore();
  const [openPointId, setOpenPointId] = useState<string | null>(null);

  if (!activeStore) {
    return <p className="text-sm text-muted-foreground">Velg en butikk først.</p>;
  }

  return openPointId ? (
    <PointDetail
      storeId={activeStore.id}
      pointId={openPointId}
      onBack={() => setOpenPointId(null)}
    />
  ) : (
    <PointsList storeId={activeStore.id} onOpen={setOpenPointId} />
  );
}

/* ================= LIST ================= */
function PointsList({ storeId, onOpen }: { storeId: string; onOpen: (id: string) => void }) {
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("temperature_units")
      .select("*")
      .eq("store_id", storeId)
      .order("order_index");
    setPoints((data || []) as Point[]);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [storeId]);

  const add = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("temperature_units").insert({
      store_id: storeId, name: newName.trim(), order_index: points.length,
    });
    if (error) return toast.error("Kunne ikke opprette målepunkt");
    setNewName("");
    load();
  };

  if (loading) return <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-sm">Nytt målepunkt</Label>
          <div className="flex gap-2">
            <Input
              placeholder="F.eks. Kjøleskapet under kaffemaskinen"
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

      {points.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">
          Ingen målepunkter ennå.
        </p>
      ) : (
        <div className="space-y-2">
          {points.map((p) => (
            <Card key={p.id} className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onOpen(p.id)}>
              <CardContent className="p-3 flex items-center gap-2">
                <Thermometer className="h-4 w-4 text-primary shrink-0" />
                <span className="flex-1 text-sm">{p.name}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ================= DETAIL ================= */
function PointDetail({
  storeId, pointId, onBack,
}: { storeId: string; pointId: string; onBack: () => void }) {
  const [point, setPoint] = useState<Point | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [routineTitles, setRoutineTitles] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fromDate, setFromDate] = useState<Date | undefined>();
  const [toDate, setToDate] = useState<Date | undefined>();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const loadPoint = async () => {
    const { data } = await supabase.from("temperature_units")
      .select("*").eq("id", pointId).maybeSingle();
    if (data) { setPoint(data as Point); setEditingName((data as Point).name); }
  };

  const loadReadings = async () => {
    setLoading(true);
    let q = supabase.from("temperature_readings")
      .select("*", { count: "exact" })
      .eq("store_id", storeId)
      .eq("unit_id", pointId)
      .order("created_at", { ascending: false });
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

    const rids = Array.from(new Set(list.map((r) => r.routine_id).filter(Boolean))) as string[];
    if (rids.length) {
      const { data: rs } = await supabase.from("routines").select("id, title").in("id", rids);
      setRoutineTitles(new Map((rs || []).map((r: any) => [r.id, r.title])));
    } else {
      setRoutineTitles(new Map());
    }
    setLoading(false);
  };

  useEffect(() => { loadPoint(); /* eslint-disable-next-line */ }, [pointId]);
  useEffect(() => { loadReadings(); /* eslint-disable-next-line */ },
    [pointId, page, fromDate?.getTime(), toDate?.getTime()]);
  useEffect(() => { setPage(1); }, [fromDate?.getTime(), toDate?.getTime()]);

  const saveName = async () => {
    if (!point || !editingName.trim() || editingName === point.name) return;
    setSavingName(true);
    const { error } = await supabase.from("temperature_units")
      .update({ name: editingName.trim() }).eq("id", point.id);
    setSavingName(false);
    if (error) return toast.error("Kunne ikke lagre navn");
    toast.success("Navn lagret");
    loadPoint();
  };

  const del = async () => {
    const { error } = await supabase.from("temperature_units").delete().eq("id", pointId);
    if (error) return toast.error("Kunne ikke slette");
    toast.success("Målepunkt slettet");
    setDeleteOpen(false);
    onBack();
  };

  const exportCsv = async () => {
    let q = supabase.from("temperature_readings")
      .select("*")
      .eq("store_id", storeId)
      .eq("unit_id", pointId)
      .order("created_at", { ascending: false });
    if (fromDate) q = q.gte("created_at", fromDate.toISOString());
    if (toDate) {
      const end = new Date(toDate); end.setHours(23, 59, 59, 999);
      q = q.lte("created_at", end.toISOString());
    }
    const { data, error } = await q;
    if (error || !data) return toast.error("Kunne ikke eksportere");
    const rows = data as Reading[];

    const uids = Array.from(new Set(rows.map((r) => r.user_id)));
    const rids = Array.from(new Set(rows.map((r) => r.routine_id).filter(Boolean))) as string[];
    const [{ data: profs }, { data: rs }] = await Promise.all([
      uids.length ? supabase.from("profiles").select("id, name").in("id", uids) : Promise.resolve({ data: [] } as any),
      rids.length ? supabase.from("routines").select("id, title").in("id", rids) : Promise.resolve({ data: [] } as any),
    ]);
    const nameMap = new Map((profs || []).map((p: any) => [p.id, p.name || "Ukjent"]));
    const routineMap = new Map((rs || []).map((r: any) => [r.id, r.title]));

    const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
    const header = ["dato", "temperatur_c", "målepunkt", "bruker", "rutine", "notat"];
    const lines = [header.join(";")];
    for (const r of rows) {
      lines.push([
        format(new Date(r.created_at), "yyyy-MM-dd HH:mm"),
        formatTemp(Number(r.value_celsius)),
        esc(point?.name || ""),
        esc(nameMap.get(r.user_id) || "Ukjent"),
        esc(r.routine_id ? (routineMap.get(r.routine_id) || "") : ""),
        esc(r.note || ""),
      ].join(";"));
    }
    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `loggforing_${point?.name || "malepunkt"}_${format(new Date(), "yyyy-MM-dd")}.csv`;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const totalPages = Math.max(1, Math.ceil(total / READINGS_PER_PAGE));

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
      >
        <ArrowLeft className="h-4 w-4" /> Tilbake
      </button>

      <Card>
        <CardContent className="p-4 space-y-3">
          <Label className="text-xs">Navn på målepunkt</Label>
          <div className="flex gap-2">
            <Input
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
            />
            <Button
              onClick={saveName}
              disabled={savingName || !editingName.trim() || editingName === point?.name}
            >
              {savingName ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
            </Button>
          </div>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={exportCsv} disabled={total === 0}>
              <Download className="h-4 w-4 mr-2" /> Eksporter CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDeleteOpen(true)}
              className="text-destructive hover:text-destructive">
              <Trash2 className="h-4 w-4 mr-2" /> Slett målepunkt
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
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
                    <div className="text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "d. MMM yyyy 'kl.' HH:mm", { locale: nb })}
                      {" · "}{names.get(r.user_id) || "Ukjent"}
                    </div>
                    {r.routine_id && routineTitles.get(r.routine_id) && (
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Rutine: {routineTitles.get(r.routine_id)}
                      </div>
                    )}
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

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slette målepunkt?</AlertDialogTitle>
            <AlertDialogDescription>
              Målepunktet fjernes fra valglisten i rutiner. Målinger beholdes i historikken,
              men mister koblingen til navnet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Avbryt</AlertDialogCancel>
            <AlertDialogAction onClick={del}
              className="bg-destructive hover:bg-destructive/90">Slett</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
