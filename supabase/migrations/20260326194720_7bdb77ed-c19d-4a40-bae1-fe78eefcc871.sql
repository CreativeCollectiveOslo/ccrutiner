
CREATE TABLE public.shift_info (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_urls TEXT[] DEFAULT '{}'::text[],
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.shift_info ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view shift info"
  ON public.shift_info FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert shift info"
  ON public.shift_info FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update shift info"
  ON public.shift_info FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete shift info"
  ON public.shift_info FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
