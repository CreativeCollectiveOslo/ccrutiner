-- Create sections table for organizing routines
CREATE TABLE public.sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shift_id UUID NOT NULL REFERENCES public.shifts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add section_id to routines table (nullable to allow migration)
ALTER TABLE public.routines 
ADD COLUMN section_id UUID REFERENCES public.sections(id) ON DELETE SET NULL;

-- Enable RLS on sections
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;

-- RLS policies for sections
CREATE POLICY "Authenticated users can view sections"
ON public.sections
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert sections"
ON public.sections
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update sections"
ON public.sections
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete sections"
ON public.sections
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add trigger for updated_at
CREATE TRIGGER update_sections_updated_at
BEFORE UPDATE ON public.sections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();