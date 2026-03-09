
-- Add last_seen_at to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_seen_at timestamp with time zone DEFAULT NULL;

-- Create access_logs table
CREATE TABLE public.access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL DEFAULT 'page_view',
  ip_address text DEFAULT NULL,
  user_agent text DEFAULT NULL,
  path text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Users can insert their own access logs
CREATE POLICY "Users can insert own access logs"
  ON public.access_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all access logs
CREATE POLICY "Admins can view all access logs"
  ON public.access_logs FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Index for admin queries
CREATE INDEX idx_access_logs_user_id ON public.access_logs (user_id);
CREATE INDEX idx_access_logs_created_at ON public.access_logs (created_at DESC);
