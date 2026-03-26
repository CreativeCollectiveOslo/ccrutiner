
-- Create info_categories table
CREATE TABLE public.info_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text NOT NULL DEFAULT 'Info',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.info_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view info categories"
  ON public.info_categories FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Admins can insert info categories"
  ON public.info_categories FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update info categories"
  ON public.info_categories FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete info categories"
  ON public.info_categories FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Add category_id to shift_info
ALTER TABLE public.shift_info
  ADD COLUMN category_id uuid REFERENCES public.info_categories(id) ON DELETE SET NULL;
