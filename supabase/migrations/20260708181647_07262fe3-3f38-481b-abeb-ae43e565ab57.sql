
-- 1. Backfill: gi alle eksisterende admins medlemskap i alle butikker
-- så ingen mister tilgang når has_store_access strammes inn.
INSERT INTO public.store_members (user_id, store_id)
SELECT ur.user_id, s.id
FROM public.user_roles ur
CROSS JOIN public.stores s
WHERE ur.role IN ('admin','super_admin')
ON CONFLICT (user_id, store_id) DO NOTHING;

-- 2. Redefiner has_store_access: kun super_admin bypasser
CREATE OR REPLACE FUNCTION public.has_store_access(_user_id uuid, _store_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.is_super_admin(_user_id)
      OR EXISTS (
        SELECT 1 FROM public.store_members
        WHERE user_id = _user_id AND store_id = _store_id
      )
$$;

-- 3. Skjerp mutasjonspolicyene til å kreve butikk-tilgang

-- shifts
DROP POLICY IF EXISTS "Admins insert shifts" ON public.shifts;
DROP POLICY IF EXISTS "Admins update shifts" ON public.shifts;
DROP POLICY IF EXISTS "Admins delete shifts" ON public.shifts;
CREATE POLICY "Admins insert shifts in own store" ON public.shifts
  FOR INSERT TO authenticated
  WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins update shifts in own store" ON public.shifts
  FOR UPDATE TO authenticated
  USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id))
  WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins delete shifts in own store" ON public.shifts
  FOR DELETE TO authenticated
  USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));

-- sections
DROP POLICY IF EXISTS "Admins insert sections" ON public.sections;
DROP POLICY IF EXISTS "Admins update sections" ON public.sections;
DROP POLICY IF EXISTS "Admins delete sections" ON public.sections;
CREATE POLICY "Admins insert sections in own store" ON public.sections
  FOR INSERT TO authenticated
  WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins update sections in own store" ON public.sections
  FOR UPDATE TO authenticated
  USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id))
  WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins delete sections in own store" ON public.sections
  FOR DELETE TO authenticated
  USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));

-- routines
DROP POLICY IF EXISTS "Admins insert routines" ON public.routines;
DROP POLICY IF EXISTS "Admins update routines" ON public.routines;
DROP POLICY IF EXISTS "Admins delete routines" ON public.routines;
CREATE POLICY "Admins insert routines in own store" ON public.routines
  FOR INSERT TO authenticated
  WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins update routines in own store" ON public.routines
  FOR UPDATE TO authenticated
  USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id))
  WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins delete routines in own store" ON public.routines
  FOR DELETE TO authenticated
  USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));

-- shift_info
DROP POLICY IF EXISTS "Admins insert shift info" ON public.shift_info;
DROP POLICY IF EXISTS "Admins update shift info" ON public.shift_info;
DROP POLICY IF EXISTS "Admins delete shift info" ON public.shift_info;
CREATE POLICY "Admins insert shift info in own store" ON public.shift_info
  FOR INSERT TO authenticated
  WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins update shift info in own store" ON public.shift_info
  FOR UPDATE TO authenticated
  USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id))
  WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins delete shift info in own store" ON public.shift_info
  FOR DELETE TO authenticated
  USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));

-- announcements
DROP POLICY IF EXISTS "Admins insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins delete announcements" ON public.announcements;
CREATE POLICY "Admins insert announcements in own store" ON public.announcements
  FOR INSERT TO authenticated
  WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins update announcements in own store" ON public.announcements
  FOR UPDATE TO authenticated
  USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id))
  WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins delete announcements in own store" ON public.announcements
  FOR DELETE TO authenticated
  USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));

-- info_categories
DROP POLICY IF EXISTS "Admins insert info categories" ON public.info_categories;
DROP POLICY IF EXISTS "Admins update info categories" ON public.info_categories;
DROP POLICY IF EXISTS "Admins delete info categories" ON public.info_categories;
CREATE POLICY "Admins insert info categories in own store" ON public.info_categories
  FOR INSERT TO authenticated
  WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins update info categories in own store" ON public.info_categories
  FOR UPDATE TO authenticated
  USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id))
  WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins delete info categories in own store" ON public.info_categories
  FOR DELETE TO authenticated
  USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));

-- routine_notifications
DROP POLICY IF EXISTS "Admins insert routine notifications" ON public.routine_notifications;
DROP POLICY IF EXISTS "Admins delete routine notifications" ON public.routine_notifications;
CREATE POLICY "Admins insert routine notifications in own store" ON public.routine_notifications
  FOR INSERT TO authenticated
  WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins delete routine notifications in own store" ON public.routine_notifications
  FOR DELETE TO authenticated
  USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));

-- task_completions: skjerp SELECT slik at admins kun ser fullførte oppgaver i egne butikker
DROP POLICY IF EXISTS "View task completions" ON public.task_completions;
CREATE POLICY "View task completions" ON public.task_completions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_store_access(auth.uid(), store_id));

-- store_members: admins kan kun administrere medlemskap i butikker de selv har tilgang til
DROP POLICY IF EXISTS "Admins insert memberships" ON public.store_members;
DROP POLICY IF EXISTS "Admins update memberships" ON public.store_members;
DROP POLICY IF EXISTS "Admins delete memberships" ON public.store_members;
CREATE POLICY "Admins insert memberships in own store" ON public.store_members
  FOR INSERT TO authenticated
  WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins update memberships in own store" ON public.store_members
  FOR UPDATE TO authenticated
  USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id))
  WITH CHECK (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
CREATE POLICY "Admins delete memberships in own store" ON public.store_members
  FOR DELETE TO authenticated
  USING (public.is_content_admin(auth.uid()) AND public.has_store_access(auth.uid(), store_id));
