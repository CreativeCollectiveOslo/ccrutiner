
CREATE TABLE public.workshop_logbook_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  image_urls TEXT[] DEFAULT '{}'::text[],
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.workshop_logbook_posts TO authenticated;
GRANT ALL ON public.workshop_logbook_posts TO service_role;

ALTER TABLE public.workshop_logbook_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View workshop logbook posts"
  ON public.workshop_logbook_posts
  FOR SELECT
  TO authenticated
  USING (public.has_store_access(auth.uid(), store_id));

CREATE POLICY "Users insert own workshop logbook posts"
  ON public.workshop_logbook_posts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.has_store_access(auth.uid(), store_id));

CREATE POLICY "Users update own workshop logbook posts"
  ON public.workshop_logbook_posts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND public.has_store_access(auth.uid(), store_id));

CREATE TRIGGER update_workshop_logbook_posts_updated_at
  BEFORE UPDATE ON public.workshop_logbook_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.workshop_logbook_posts;
