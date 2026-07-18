ALTER TABLE public.workshop_logbook_posts
ADD COLUMN IF NOT EXISTS image_url text;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_logbook_posts TO authenticated;
GRANT ALL ON public.workshop_logbook_posts TO service_role;

NOTIFY pgrst, 'reload schema';