CREATE TABLE public.bulletin_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  message text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.bulletin_posts ENABLE ROW LEVEL SECURITY;

-- Alle autentificerede brugere kan se alle indlæg
CREATE POLICY "Authenticated users can view all bulletin posts"
  ON public.bulletin_posts FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Brugere kan kun oprette indlæg i eget navn
CREATE POLICY "Users can insert own bulletin posts"
  ON public.bulletin_posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Brugere kan kun redigere egne indlæg
CREATE POLICY "Users can update own bulletin posts"
  ON public.bulletin_posts FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger til at opdatere updated_at ved ændringer
CREATE TRIGGER update_bulletin_posts_updated_at
  BEFORE UPDATE ON public.bulletin_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();