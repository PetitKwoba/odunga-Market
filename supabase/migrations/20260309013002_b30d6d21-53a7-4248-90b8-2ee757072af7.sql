-- Fix the notifications insert policy to be more restrictive
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

-- Allow admins and the system to create notifications for any user
-- Regular users cannot create notifications for others
CREATE POLICY "Admins can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (has_role(auth.uid(), 'admin'::app_role));