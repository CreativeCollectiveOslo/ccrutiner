CREATE POLICY "Authenticated users can view profile names"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);