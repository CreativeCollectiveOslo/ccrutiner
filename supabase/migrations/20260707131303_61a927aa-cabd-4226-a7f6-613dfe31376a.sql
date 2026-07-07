
-- Create stores table
CREATE TABLE public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  color_code TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

INSERT INTO public.stores (name, slug) VALUES ('Oslo', 'oslo');

-- Create store_members table
CREATE TABLE public.store_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL REFERENCES public.stores(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (store_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.store_members TO authenticated;
GRANT ALL ON public.store_members TO service_role;
ALTER TABLE public.store_members ENABLE ROW LEVEL SECURITY;

-- Add store_id
ALTER TABLE public.shifts ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.sections ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.routines ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.info_categories ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.shift_info ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.announcements ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.bulletin_posts ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.shopping_items ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.routine_notifications ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;
ALTER TABLE public.task_completions ADD COLUMN store_id UUID REFERENCES public.stores(id) ON DELETE CASCADE;

-- Backfill and membership seed
DO $$
DECLARE oslo_id UUID;
BEGIN
  SELECT id INTO oslo_id FROM public.stores WHERE slug = 'oslo';
  UPDATE public.shifts SET store_id = oslo_id WHERE store_id IS NULL;
  UPDATE public.sections SET store_id = oslo_id WHERE store_id IS NULL;
  UPDATE public.routines SET store_id = oslo_id WHERE store_id IS NULL;
  UPDATE public.info_categories SET store_id = oslo_id WHERE store_id IS NULL;
  UPDATE public.shift_info SET store_id = oslo_id WHERE store_id IS NULL;
  UPDATE public.announcements SET store_id = oslo_id WHERE store_id IS NULL;
  UPDATE public.bulletin_posts SET store_id = oslo_id WHERE store_id IS NULL;
  UPDATE public.shopping_items SET store_id = oslo_id WHERE store_id IS NULL;
  UPDATE public.routine_notifications SET store_id = oslo_id WHERE store_id IS NULL;
  UPDATE public.task_completions SET store_id = oslo_id WHERE store_id IS NULL;

  INSERT INTO public.store_members (store_id, user_id)
  SELECT oslo_id, ur.user_id FROM public.user_roles ur WHERE ur.role = 'employee'
  ON CONFLICT DO NOTHING;
END $$;

ALTER TABLE public.shifts ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.sections ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.routines ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.info_categories ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.shift_info ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.announcements ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.bulletin_posts ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.shopping_items ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.routine_notifications ALTER COLUMN store_id SET NOT NULL;
ALTER TABLE public.task_completions ALTER COLUMN store_id SET NOT NULL;

-- Security definer functions
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'super_admin'::app_role
  )
$$;

CREATE OR REPLACE FUNCTION public.is_content_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
      OR public.has_role(_user_id, 'admin'::app_role)
$$;

CREATE OR REPLACE FUNCTION public.has_store_access(_user_id uuid, _store_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.is_content_admin(_user_id)
      OR EXISTS (
        SELECT 1 FROM public.store_members
        WHERE user_id = _user_id AND store_id = _store_id
      )
$$;

-- stores policies
CREATE POLICY "View stores" ON public.stores FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Super admins insert stores" ON public.stores FOR INSERT WITH CHECK (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins update stores" ON public.stores FOR UPDATE USING (public.is_super_admin(auth.uid()));
CREATE POLICY "Super admins delete stores" ON public.stores FOR DELETE USING (public.is_super_admin(auth.uid()));

-- store_members policies
CREATE POLICY "View own or admin memberships" ON public.store_members FOR SELECT USING (auth.uid() = user_id OR public.is_content_admin(auth.uid()));
CREATE POLICY "Admins insert memberships" ON public.store_members FOR INSERT WITH CHECK (public.is_content_admin(auth.uid()));
CREATE POLICY "Admins update memberships" ON public.store_members FOR UPDATE USING (public.is_content_admin(auth.uid()));
CREATE POLICY "Admins delete memberships" ON public.store_members FOR DELETE USING (public.is_content_admin(auth.uid()));

-- shifts
DROP POLICY IF EXISTS "Admins can delete shifts" ON public.shifts;
DROP POLICY IF EXISTS "Admins can insert shifts" ON public.shifts;
DROP POLICY IF EXISTS "Admins can update shifts" ON public.shifts;
DROP POLICY IF EXISTS "Authenticated users can view shifts" ON public.shifts;
CREATE POLICY "View shifts" ON public.shifts FOR SELECT USING (public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins insert shifts" ON public.shifts FOR INSERT WITH CHECK (public.is_content_admin(auth.uid()));
CREATE POLICY "Admins update shifts" ON public.shifts FOR UPDATE USING (public.is_content_admin(auth.uid()));
CREATE POLICY "Admins delete shifts" ON public.shifts FOR DELETE USING (public.is_content_admin(auth.uid()));

-- sections
DROP POLICY IF EXISTS "Admins can delete sections" ON public.sections;
DROP POLICY IF EXISTS "Admins can insert sections" ON public.sections;
DROP POLICY IF EXISTS "Admins can update sections" ON public.sections;
DROP POLICY IF EXISTS "Authenticated users can view sections" ON public.sections;
CREATE POLICY "View sections" ON public.sections FOR SELECT USING (public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins insert sections" ON public.sections FOR INSERT WITH CHECK (public.is_content_admin(auth.uid()));
CREATE POLICY "Admins update sections" ON public.sections FOR UPDATE USING (public.is_content_admin(auth.uid()));
CREATE POLICY "Admins delete sections" ON public.sections FOR DELETE USING (public.is_content_admin(auth.uid()));

-- routines
DROP POLICY IF EXISTS "Admins can delete routines" ON public.routines;
DROP POLICY IF EXISTS "Admins can insert routines" ON public.routines;
DROP POLICY IF EXISTS "Admins can update routines" ON public.routines;
DROP POLICY IF EXISTS "Authenticated users can view routines" ON public.routines;
CREATE POLICY "View routines" ON public.routines FOR SELECT USING (public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins insert routines" ON public.routines FOR INSERT WITH CHECK (public.is_content_admin(auth.uid()));
CREATE POLICY "Admins update routines" ON public.routines FOR UPDATE USING (public.is_content_admin(auth.uid()));
CREATE POLICY "Admins delete routines" ON public.routines FOR DELETE USING (public.is_content_admin(auth.uid()));

-- info_categories
DROP POLICY IF EXISTS "Admins can delete info categories" ON public.info_categories;
DROP POLICY IF EXISTS "Admins can insert info categories" ON public.info_categories;
DROP POLICY IF EXISTS "Admins can update info categories" ON public.info_categories;
DROP POLICY IF EXISTS "Authenticated users can view info categories" ON public.info_categories;
CREATE POLICY "View info categories" ON public.info_categories FOR SELECT USING (public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins insert info categories" ON public.info_categories FOR INSERT WITH CHECK (public.is_content_admin(auth.uid()));
CREATE POLICY "Admins update info categories" ON public.info_categories FOR UPDATE USING (public.is_content_admin(auth.uid()));
CREATE POLICY "Admins delete info categories" ON public.info_categories FOR DELETE USING (public.is_content_admin(auth.uid()));

-- shift_info
DROP POLICY IF EXISTS "Admins can delete shift info" ON public.shift_info;
DROP POLICY IF EXISTS "Admins can insert shift info" ON public.shift_info;
DROP POLICY IF EXISTS "Admins can update shift info" ON public.shift_info;
DROP POLICY IF EXISTS "Authenticated users can view shift info" ON public.shift_info;
CREATE POLICY "View shift info" ON public.shift_info FOR SELECT USING (public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins insert shift info" ON public.shift_info FOR INSERT WITH CHECK (public.is_content_admin(auth.uid()));
CREATE POLICY "Admins update shift info" ON public.shift_info FOR UPDATE USING (public.is_content_admin(auth.uid()));
CREATE POLICY "Admins delete shift info" ON public.shift_info FOR DELETE USING (public.is_content_admin(auth.uid()));

-- announcements
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Authenticated users can view announcements" ON public.announcements;
CREATE POLICY "View announcements" ON public.announcements FOR SELECT USING (public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins insert announcements" ON public.announcements FOR INSERT WITH CHECK (public.is_content_admin(auth.uid()));
CREATE POLICY "Admins update announcements" ON public.announcements FOR UPDATE USING (public.is_content_admin(auth.uid()));
CREATE POLICY "Admins delete announcements" ON public.announcements FOR DELETE USING (public.is_content_admin(auth.uid()));

-- bulletin_posts
DROP POLICY IF EXISTS "Authenticated users can view all bulletin posts" ON public.bulletin_posts;
DROP POLICY IF EXISTS "Users can insert own bulletin posts" ON public.bulletin_posts;
DROP POLICY IF EXISTS "Users can update own bulletin posts" ON public.bulletin_posts;
CREATE POLICY "View bulletin posts" ON public.bulletin_posts FOR SELECT USING (public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Users insert own bulletin posts" ON public.bulletin_posts FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Users update own bulletin posts" ON public.bulletin_posts FOR UPDATE USING (auth.uid() = user_id);

-- shopping_items
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='shopping_items' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.shopping_items', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "View shopping items" ON public.shopping_items FOR SELECT USING (public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Insert shopping items" ON public.shopping_items FOR INSERT WITH CHECK (public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Update shopping items" ON public.shopping_items FOR UPDATE USING (public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Delete shopping items" ON public.shopping_items FOR DELETE USING (public.has_store_access(auth.uid(), store_id));

-- routine_notifications
DROP POLICY IF EXISTS "Admins can delete routine notifications" ON public.routine_notifications;
DROP POLICY IF EXISTS "Admins can insert routine notifications" ON public.routine_notifications;
DROP POLICY IF EXISTS "Authenticated users can view routine notifications" ON public.routine_notifications;
CREATE POLICY "View routine notifications" ON public.routine_notifications FOR SELECT USING (public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins insert routine notifications" ON public.routine_notifications FOR INSERT WITH CHECK (public.is_content_admin(auth.uid()));
CREATE POLICY "Admins delete routine notifications" ON public.routine_notifications FOR DELETE USING (public.is_content_admin(auth.uid()));

-- task_completions
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='task_completions' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.task_completions', p.policyname);
  END LOOP;
END $$;
CREATE POLICY "View task completions" ON public.task_completions FOR SELECT USING (auth.uid() = user_id OR public.is_content_admin(auth.uid()));
CREATE POLICY "Insert own task completions" ON public.task_completions FOR INSERT WITH CHECK (auth.uid() = user_id AND public.has_store_access(auth.uid(), store_id));
