GRANT SELECT, INSERT, UPDATE, DELETE ON public.workshop_logbook_posts TO authenticated;
GRANT ALL ON public.workshop_logbook_posts TO service_role;
CREATE POLICY "Users delete own workshop logbook posts" ON public.workshop_logbook_posts FOR DELETE TO authenticated USING (auth.uid() = user_id);