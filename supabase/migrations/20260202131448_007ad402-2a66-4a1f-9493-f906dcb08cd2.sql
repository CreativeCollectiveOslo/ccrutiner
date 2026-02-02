-- Drop eksisterende SELECT policies
DROP POLICY IF EXISTS "Users can view own completions" ON task_completions;
DROP POLICY IF EXISTS "Admins can view all completions" ON task_completions;

-- Ny SELECT policy - alle kan se alle afkrydsninger
CREATE POLICY "Authenticated users can view all completions"
  ON task_completions FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Opdater DELETE policy så alle kan fjerne afkrydsninger
DROP POLICY IF EXISTS "Users can delete own completions" ON task_completions;
CREATE POLICY "Authenticated users can delete completions"
  ON task_completions FOR DELETE
  USING (auth.uid() IS NOT NULL);