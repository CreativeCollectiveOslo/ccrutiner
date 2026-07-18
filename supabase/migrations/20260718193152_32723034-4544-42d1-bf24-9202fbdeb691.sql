
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS task_type text NOT NULL DEFAULT 'vanlig' CHECK (task_type IN ('vanlig','loggforing'));
ALTER TABLE public.routines ADD COLUMN IF NOT EXISTS measurement_point_id uuid REFERENCES public.temperature_units(id) ON DELETE SET NULL;
ALTER TABLE public.temperature_readings ADD COLUMN IF NOT EXISTS routine_id uuid REFERENCES public.routines(id) ON DELETE SET NULL;
DROP TABLE IF EXISTS public.temperature_widget_units CASCADE;
DROP TABLE IF EXISTS public.temperature_widgets CASCADE;
