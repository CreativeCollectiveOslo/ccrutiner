
CREATE POLICY "Auth view private attachments"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'attachments-private');

CREATE POLICY "Auth upload private attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'attachments-private');

CREATE POLICY "Auth update private attachments"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'attachments-private' AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin'::app_role)));

CREATE POLICY "Auth delete private attachments"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'attachments-private' AND (auth.uid() = owner OR public.has_role(auth.uid(), 'admin'::app_role)));
