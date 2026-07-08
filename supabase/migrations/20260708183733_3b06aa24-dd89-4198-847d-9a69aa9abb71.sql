
-- 1. Clean slate for existing info data
DELETE FROM public.shift_info WHERE shift_id IS NULL;
DELETE FROM public.info_categories;

-- 2. Add color_code to info_categories (mirror shifts)
ALTER TABLE public.info_categories
  ADD COLUMN IF NOT EXISTS color_code text NOT NULL DEFAULT '#D2593A';

-- 3. Allow sections to belong to either a shift OR an info_category
ALTER TABLE public.sections
  ALTER COLUMN shift_id DROP NOT NULL;

ALTER TABLE public.sections
  ADD COLUMN IF NOT EXISTS info_category_id uuid NULL;

-- Exactly one parent must be set
ALTER TABLE public.sections
  DROP CONSTRAINT IF EXISTS sections_parent_check;
ALTER TABLE public.sections
  ADD CONSTRAINT sections_parent_check
  CHECK ((shift_id IS NOT NULL)::int + (info_category_id IS NOT NULL)::int = 1);

-- 4. Allow shift_info items to belong to a section
ALTER TABLE public.shift_info
  ADD COLUMN IF NOT EXISTS section_id uuid NULL;

CREATE INDEX IF NOT EXISTS idx_sections_info_category ON public.sections(info_category_id);
CREATE INDEX IF NOT EXISTS idx_shift_info_section ON public.shift_info(section_id);
