-- Add order_index column to shifts table for custom ordering
ALTER TABLE public.shifts ADD COLUMN order_index integer DEFAULT 0;

-- Update existing shifts with incremental order values based on name
UPDATE public.shifts SET order_index = subquery.row_num 
FROM (SELECT id, ROW_NUMBER() OVER (ORDER BY name) as row_num FROM public.shifts) AS subquery 
WHERE public.shifts.id = subquery.id;