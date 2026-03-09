
-- Canned responses table
CREATE TABLE public.support_canned_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.support_canned_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage canned responses" ON public.support_canned_responses
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view canned responses" ON public.support_canned_responses
  FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_canned_responses_updated_at
  BEFORE UPDATE ON public.support_canned_responses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add rating columns to support_tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS rating integer CHECK (rating >= 1 AND rating <= 5),
  ADD COLUMN IF NOT EXISTS rating_comment text,
  ADD COLUMN IF NOT EXISTS rated_at timestamptz;
