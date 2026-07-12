DELETE FROM public.task_completions a
USING public.task_completions b
WHERE a.ctid < b.ctid AND a.routine_id = b.routine_id;

CREATE UNIQUE INDEX IF NOT EXISTS task_completions_routine_unique
  ON public.task_completions(routine_id);

ALTER TABLE public.task_completions REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'task_completions'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.task_completions';
  END IF;
END $$;