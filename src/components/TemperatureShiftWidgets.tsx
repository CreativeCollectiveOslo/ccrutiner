import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "@/contexts/StoreContext";
import { TemperatureWidget } from "./TemperatureWidget";

interface Widget { id: string; title: string; order_index: number; }

export function TemperatureShiftWidgets({ shiftId }: { shiftId: string }) {
  const { activeStore } = useStore();
  const [widgets, setWidgets] = useState<Widget[]>([]);

  useEffect(() => {
    if (!activeStore) return;
    supabase
      .from("temperature_widgets")
      .select("id, title, order_index")
      .eq("store_id", activeStore.id)
      .eq("shift_id", shiftId)
      .order("order_index")
      .then(({ data }) => setWidgets((data || []) as Widget[]));
  }, [shiftId, activeStore?.id]);

  if (widgets.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground border-b pb-2">
        Temperaturer
      </h3>
      {widgets.map((w) => (
        <TemperatureWidget key={w.id} widgetId={w.id} title={w.title} />
      ))}
    </div>
  );
}
