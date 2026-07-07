ALTER POLICY "Admins delete announcements" ON public.announcements TO authenticated;
ALTER POLICY "Admins insert announcements" ON public.announcements TO authenticated;
ALTER POLICY "Admins update announcements" ON public.announcements TO authenticated;
ALTER POLICY "View announcements" ON public.announcements TO authenticated;

ALTER POLICY "Admins can view all announcement read statuses" ON public.announcements_read TO authenticated;

ALTER POLICY "Users insert own bulletin posts" ON public.bulletin_posts TO authenticated;
ALTER POLICY "View bulletin posts" ON public.bulletin_posts TO authenticated;

ALTER POLICY "Admins delete info categories" ON public.info_categories TO authenticated;
ALTER POLICY "Admins insert info categories" ON public.info_categories TO authenticated;
ALTER POLICY "Admins update info categories" ON public.info_categories TO authenticated;
ALTER POLICY "View info categories" ON public.info_categories TO authenticated;

ALTER POLICY "Admins delete routine notifications" ON public.routine_notifications TO authenticated;
ALTER POLICY "Admins insert routine notifications" ON public.routine_notifications TO authenticated;
ALTER POLICY "View routine notifications" ON public.routine_notifications TO authenticated;

ALTER POLICY "Admins can view all routine notification read statuses" ON public.routine_notifications_read TO authenticated;
ALTER POLICY "Users can insert own read status" ON public.routine_notifications_read TO authenticated;
ALTER POLICY "Users can view own read status" ON public.routine_notifications_read TO authenticated;

ALTER POLICY "Admins delete routines" ON public.routines TO authenticated;
ALTER POLICY "Admins insert routines" ON public.routines TO authenticated;
ALTER POLICY "Admins update routines" ON public.routines TO authenticated;
ALTER POLICY "View routines" ON public.routines TO authenticated;

ALTER POLICY "Admins delete sections" ON public.sections TO authenticated;
ALTER POLICY "Admins insert sections" ON public.sections TO authenticated;
ALTER POLICY "Admins update sections" ON public.sections TO authenticated;
ALTER POLICY "View sections" ON public.sections TO authenticated;

ALTER POLICY "Admins delete shift info" ON public.shift_info TO authenticated;
ALTER POLICY "Admins insert shift info" ON public.shift_info TO authenticated;
ALTER POLICY "Admins update shift info" ON public.shift_info TO authenticated;
ALTER POLICY "View shift info" ON public.shift_info TO authenticated;

ALTER POLICY "Admins delete shifts" ON public.shifts TO authenticated;
ALTER POLICY "Admins insert shifts" ON public.shifts TO authenticated;
ALTER POLICY "Admins update shifts" ON public.shifts TO authenticated;
ALTER POLICY "View shifts" ON public.shifts TO authenticated;

ALTER POLICY "Delete shopping items" ON public.shopping_items TO authenticated;
ALTER POLICY "Insert shopping items" ON public.shopping_items TO authenticated;
ALTER POLICY "Update shopping items" ON public.shopping_items TO authenticated;
ALTER POLICY "View shopping items" ON public.shopping_items TO authenticated;

ALTER POLICY "Admins delete memberships" ON public.store_members TO authenticated;
ALTER POLICY "Admins insert memberships" ON public.store_members TO authenticated;
ALTER POLICY "Admins update memberships" ON public.store_members TO authenticated;
ALTER POLICY "View own or admin memberships" ON public.store_members TO authenticated;

ALTER POLICY "Super admins delete stores" ON public.stores TO authenticated;
ALTER POLICY "Super admins insert stores" ON public.stores TO authenticated;
ALTER POLICY "Super admins update stores" ON public.stores TO authenticated;

ALTER POLICY "Insert own task completions" ON public.task_completions TO authenticated;
ALTER POLICY "View task completions" ON public.task_completions TO authenticated;