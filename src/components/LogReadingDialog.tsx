import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routineId: string;
  routineTitle: string;
  measurementPointId: string;
  storeId: string;
  userId: string;
  onSaved: () => void;
}

export function LogReadingDialog({
  open, onOpenChange, routineId, routineTitle, measurementPointId, storeId, userId, onSaved,
}: Props) {
  const [value, setValue] = useState("");
  const [note, setNote] = useState("");
  const [pointName, setPointName] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const [existingAuthor, setExistingAuthor] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue(""); setNote(""); setExistingId(null); setExistingAuthor(null);

    supabase.from("temperature_units").select("name")
      .eq("id", measurementPointId).maybeSingle()
      .then(({ data }) => setPointName((data as any)?.name || ""));

    // Look for an existing reading for this routine on today's shift
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(); end.setHours(23, 59, 59, 999);
    supabase.from("temperature_readings")
      .select("id, value_celsius, note, user_id")
      .eq("routine_id", routineId)
      .gte("created_at", start.toISOString())
      .lte("created_at", end.toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) return;
        setExistingId(data.id);
        setValue(String(data.value_celsius).replace(".", ","));
        setNote(data.note || "");
        if (data.user_id) {
          const { data: prof } = await supabase.from("profiles")
            .select("name").eq("id", data.user_id).maybeSingle();
          setExistingAuthor((prof as any)?.name || null);
        }
      });
  }, [open, measurementPointId, routineId]);

  const save = async () => {
    const num = parseFloat(value.replace(",", "."));
    if (Number.isNaN(num)) return toast.error("Ugyldig temperatur");
    setSaving(true);

    let rErr;
    if (existingId) {
      ({ error: rErr } = await supabase.from("temperature_readings")
        .update({
          value_celsius: num,
          note: note.trim() || null,
          user_id: userId,
        })
        .eq("id", existingId));
    } else {
      ({ error: rErr } = await supabase.from("temperature_readings").insert({
        store_id: storeId,
        unit_id: measurementPointId,
        routine_id: routineId,
        user_id: userId,
        value_celsius: num,
        note: note.trim() || null,
      }));
    }
    if (rErr) { setSaving(false); return toast.error("Kunne ikke lagre måling"); }

    const today = new Date().toISOString().split("T")[0];
    const { error: cErr } = await supabase.from("task_completions").upsert(
      { routine_id: routineId, user_id: userId, shift_date: today, store_id: storeId },
      { onConflict: "routine_id" },
    );
    setSaving(false);
    if (cErr) return toast.error("Måling lagret, men rutinen kunne ikke krysses av");
    toast.success(existingId ? "Måling oppdatert" : "Måling lagret", {
      description: `${num.toLocaleString("nb-NO")} °C`,
    });
    onOpenChange(false);
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{routineTitle}</DialogTitle>
          <DialogDescription>
            Målepunkt: {pointName || "…"}
            {existingId && (
              <span className="block mt-1 text-xs">
                Oppdaterer eksisterende måling{existingAuthor ? ` fra ${existingAuthor}` : ""} i dag.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="temp-value">Temperatur (°C) *</Label>
            <Input
              id="temp-value"
              type="text"
              inputMode="decimal"
              placeholder="F.eks. 4,5"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="temp-note">Notat (valgfritt)</Label>
            <Textarea
              id="temp-note"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Avbryt
          </Button>
          <Button onClick={save} disabled={saving || !value.trim()}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {existingId ? "Oppdater" : "Lagre"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
