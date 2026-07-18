import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useStore } from "@/contexts/StoreContext";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Thermometer } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { nb } from "date-fns/locale";

interface Unit {
  id: string;
  name: string;
  order_index: number;
}

interface LastReading {
  value_celsius: number;
  created_at: string;
  user_name: string;
}

interface Props {
  widgetId: string;
  title: string;
}

const parseNum = (v: string) => {
  const cleaned = v.trim().replace(",", ".");
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
};

const formatTemp = (n: number) =>
  n.toLocaleString("nb-NO", { minimumFractionDigits: 1, maximumFractionDigits: 2 });

export function TemperatureWidget({ widgetId, title }: Props) {
  const { user } = useAuth();
  const { activeStore } = useStore();
  const [units, setUnits] = useState<Unit[]>([]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [lastReadings, setLastReadings] = useState<Record<string, LastReading>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    setLoading(true);
    const { data: wu } = await supabase
      .from("temperature_widget_units")
      .select("order_index, temperature_units(id, name, order_index)")
      .eq("widget_id", widgetId)
      .order("order_index");
    const list: Unit[] = ((wu || []) as any[])
      .map((r) => r.temperature_units)
      .filter(Boolean);
    setUnits(list);

    if (list.length && activeStore) {
      const { data: readings } = await supabase
        .from("temperature_readings")
        .select("unit_id, value_celsius, created_at, user_id")
        .eq("store_id", activeStore.id)
        .in("unit_id", list.map((u) => u.id))
        .order("created_at", { ascending: false })
        .limit(200);

      const userIds = Array.from(new Set((readings || []).map((r: any) => r.user_id)));
      const { data: profs } = userIds.length
        ? await supabase.from("profiles").select("id, name").in("id", userIds)
        : { data: [] as any[] };
      const nameMap = new Map<string, string>((profs || []).map((p: any) => [p.id, p.name || "Ukjent"]));

      const latest: Record<string, LastReading> = {};
      for (const r of (readings || []) as any[]) {
        if (!latest[r.unit_id]) {
          latest[r.unit_id] = {
            value_celsius: Number(r.value_celsius),
            created_at: r.created_at,
            user_name: nameMap.get(r.user_id) || "Ukjent",
          };
        }
      }
      setLastReadings(latest);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeStore) loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [widgetId, activeStore?.id]);

  const handleSave = async () => {
    if (!user || !activeStore) return;
    const rows = units
      .map((u) => ({ unit: u, val: parseNum(values[u.id] || "") }))
      .filter((r) => r.val !== null);
    if (rows.length === 0) {
      toast.error("Fyll inn minst én temperatur");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("temperature_readings").insert(
      rows.map((r) => ({
        store_id: activeStore.id,
        widget_id: widgetId,
        unit_id: r.unit.id,
        user_id: user.id,
        value_celsius: r.val!,
        note: note.trim() || null,
      })),
    );
    setSaving(false);
    if (error) {
      toast.error("Kunne ikke lagre målinger");
      console.error(error);
      return;
    }
    toast.success(`${rows.length} måling${rows.length === 1 ? "" : "er"} lagret`);
    setValues({});
    setNote("");
    loadData();
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4 flex items-center justify-center">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (units.length === 0) return null;

  return (
    <Card className="border-primary/30">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Thermometer className="h-4 w-4 text-primary" />
          <h4 className="text-sm font-semibold">{title}</h4>
        </div>
        <div className="space-y-2">
          {units.map((u) => {
            const last = lastReadings[u.id];
            return (
              <div key={u.id} className="space-y-1">
                <Label htmlFor={`t-${u.id}`} className="text-xs font-medium">
                  {u.name}
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`t-${u.id}`}
                    inputMode="decimal"
                    placeholder="—"
                    value={values[u.id] || ""}
                    onChange={(e) =>
                      setValues((v) => ({ ...v, [u.id]: e.target.value }))
                    }
                    className="h-9"
                  />
                  <span className="text-sm text-muted-foreground shrink-0">°C</span>
                </div>
                {last && (
                  <p className="text-[11px] text-muted-foreground">
                    Sist: {formatTemp(last.value_celsius)} °C —{" "}
                    {format(new Date(last.created_at), "d. MMM 'kl.' HH:mm", { locale: nb })} av{" "}
                    {last.user_name}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        <Textarea
          placeholder="Kommentar (valgfri)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="min-h-[60px] text-sm"
        />
        <Button onClick={handleSave} disabled={saving} size="sm" className="w-full">
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Lagrer...
            </>
          ) : (
            "Lagre målinger"
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
