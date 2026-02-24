
-- Feature 1: Shopping items table
CREATE TABLE public.shopping_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  completed_by UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.shopping_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view shopping items"
  ON public.shopping_items FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert shopping items"
  ON public.shopping_items FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Authenticated users can update shopping items"
  ON public.shopping_items FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete shopping items"
  ON public.shopping_items FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Enable realtime for shopping items
ALTER PUBLICATION supabase_realtime ADD TABLE public.shopping_items;

-- Feature 2: Multi-image columns
ALTER TABLE public.announcements ADD COLUMN image_urls TEXT[] DEFAULT '{}';
ALTER TABLE public.bulletin_posts ADD COLUMN image_urls TEXT[] DEFAULT '{}';
ALTER TABLE public.routines ADD COLUMN image_urls TEXT[] DEFAULT '{}';

-- Migrate existing data
UPDATE public.announcements SET image_urls = ARRAY[image_url] WHERE image_url IS NOT NULL AND image_url != '';
UPDATE public.bulletin_posts SET image_urls = ARRAY[image_url] WHERE image_url IS NOT NULL AND image_url != '';
UPDATE public.routines SET image_urls = ARRAY[multimedia_url] WHERE multimedia_url IS NOT NULL AND multimedia_url != '';
