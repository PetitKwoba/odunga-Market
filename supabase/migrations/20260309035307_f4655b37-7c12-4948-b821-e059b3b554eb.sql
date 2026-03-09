
-- Saved cart templates for wholesalers
CREATE TABLE public.saved_carts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.saved_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their saved carts"
  ON public.saved_carts
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Rate limiting table for guest support tickets
CREATE TABLE public.guest_rate_limits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ip_hash TEXT NOT NULL,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.guest_rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow anon to insert (for tracking)
CREATE POLICY "Anon can insert rate limits"
  ON public.guest_rate_limits
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anon to read (for checking)  
CREATE POLICY "Anon can read rate limits"
  ON public.guest_rate_limits
  FOR SELECT
  TO anon
  USING (true);

-- Updated_at trigger for saved_carts
CREATE TRIGGER update_saved_carts_updated_at
  BEFORE UPDATE ON public.saved_carts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
