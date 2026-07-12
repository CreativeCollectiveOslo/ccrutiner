CREATE POLICY "Delete task completions in accessible stores"
ON public.task_completions
FOR DELETE
TO authenticated
USING (public.has_store_access(auth.uid(), store_id));

CREATE POLICY "Update task completions in accessible stores"
ON public.task_completions
FOR UPDATE
TO authenticated
USING (public.has_store_access(auth.uid(), store_id))
WITH CHECK (public.has_store_access(auth.uid(), store_id));