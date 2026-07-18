GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.workshop_logbook_posts TO authenticated;
GRANT ALL ON TABLE public.workshop_logbook_posts TO service_role;

DROP POLICY IF EXISTS "Users insert own workshop logbook posts" ON public.workshop_logbook_posts;
CREATE POLICY "All store users can create workshop logbook posts"
ON public.workshop_logbook_posts
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND public.has_store_access(auth.uid(), store_id)
);

NOTIFY pgrst, 'reload schema';