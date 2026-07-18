
-- 1. temperature_units
CREATE TABLE public.temperature_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.temperature_units TO authenticated;
GRANT ALL ON public.temperature_units TO service_role;
ALTER TABLE public.temperature_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View temp units" ON public.temperature_units FOR SELECT TO authenticated USING (public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admin insert temp units" ON public.temperature_units FOR INSERT TO authenticated WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admin update temp units" ON public.temperature_units FOR UPDATE TO authenticated USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id)) WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admin delete temp units" ON public.temperature_units FOR DELETE TO authenticated USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE TRIGGER trg_temp_units_updated BEFORE UPDATE ON public.temperature_units FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. temperature_widgets
CREATE TABLE public.temperature_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.temperature_widgets TO authenticated;
GRANT ALL ON public.temperature_widgets TO service_role;
ALTER TABLE public.temperature_widgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View temp widgets" ON public.temperature_widgets FOR SELECT TO authenticated USING (public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admin insert temp widgets" ON public.temperature_widgets FOR INSERT TO authenticated WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admin update temp widgets" ON public.temperature_widgets FOR UPDATE TO authenticated USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id)) WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admin delete temp widgets" ON public.temperature_widgets FOR DELETE TO authenticated USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE TRIGGER trg_temp_widgets_updated BEFORE UPDATE ON public.temperature_widgets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. temperature_widget_units (join)
CREATE TABLE public.temperature_widget_units (
  widget_id UUID NOT NULL REFERENCES public.temperature_widgets(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES public.temperature_units(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (widget_id, unit_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.temperature_widget_units TO authenticated;
GRANT ALL ON public.temperature_widget_units TO service_role;
ALTER TABLE public.temperature_widget_units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View widget units" ON public.temperature_widget_units FOR SELECT TO authenticated USING (EXISTS (SELECT 1 FROM public.temperature_widgets w WHERE w.id = widget_id AND public.has_store_access(auth.uid(), w.store_id)));
CREATE POLICY "Admin manage widget units" ON public.temperature_widget_units FOR ALL TO authenticated USING (EXISTS (SELECT 1 FROM public.temperature_widgets w WHERE w.id = widget_id AND public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), w.store_id))) WITH CHECK (EXISTS (SELECT 1 FROM public.temperature_widgets w WHERE w.id = widget_id AND public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), w.store_id)));

-- 4. temperature_readings
CREATE TABLE public.temperature_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  widget_id UUID REFERENCES public.temperature_widgets(id) ON DELETE SET NULL,
  unit_id UUID NOT NULL REFERENCES public.temperature_units(id) ON DELETE RESTRICT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET DEFAULT DEFAULT '00000000-0000-0000-0000-000000000000',
  value_celsius NUMERIC(5,2) NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.temperature_readings TO authenticated;
GRANT ALL ON public.temperature_readings TO service_role;
ALTER TABLE public.temperature_readings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View temp readings" ON public.temperature_readings FOR SELECT TO authenticated USING (public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Insert temp readings" ON public.temperature_readings FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND public.has_store_access(auth.uid(), store_id));
CREATE INDEX idx_temp_readings_store_created ON public.temperature_readings(store_id, created_at DESC);
CREATE INDEX idx_temp_readings_unit_created ON public.temperature_readings(unit_id, created_at DESC);
