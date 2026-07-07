
-- 1. Fix bulletin_posts UPDATE policy: add WITH CHECK for store membership
DROP POLICY IF EXISTS "Users update own bulletin posts" ON public.bulletin_posts;
CREATE POLICY "Users update own bulletin posts"
  ON public.bulletin_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id
    AND public.has_store_access(auth.uid(), store_id)
  );

-- 2. Prevent admins from self-escalating to super_admin via user_roles INSERT/UPDATE
DROP POLICY IF EXISTS "Admins can insert roles" ON public.user_roles;
CREATE POLICY "Admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (
    (public.is_super_admin(auth.uid()))
    OR (public.has_role(auth.uid(), 'admin'::app_role) AND role <> 'super_admin'::app_role)
  );

DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
CREATE POLICY "Admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.is_super_admin(auth.uid()))
  WITH CHECK (
    public.is_super_admin(auth.uid())
    OR (public.has_role(auth.uid(), 'admin'::app_role) AND role <> 'super_admin'::app_role)
  );

-- 3. Scope attachments-private storage to owner (path prefixed with user id)
DROP POLICY IF EXISTS "Auth upload private attachments" ON storage.objects;
CREATE POLICY "Auth upload private attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'attachments-private'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Auth view private attachments" ON storage.objects;
CREATE POLICY "Auth view private attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'attachments-private'
    AND (
      owner = auth.uid()
      OR (storage.foldername(name))[1] = auth.uid()::text
      OR public.is_content_admin(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Auth update private attachments" ON storage.objects;
CREATE POLICY "Auth update private attachments"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'attachments-private'
    AND (owner = auth.uid() OR public.is_content_admin(auth.uid()))
  )
  WITH CHECK (
    bucket_id = 'attachments-private'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Auth delete private attachments" ON storage.objects;
CREATE POLICY "Auth delete private attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'attachments-private'
    AND (owner = auth.uid() OR public.is_content_admin(auth.uid()))
  );
