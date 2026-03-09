-- Knowledge base articles table
CREATE TABLE public.knowledge_base_articles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'general',
  tags text[] DEFAULT '{}',
  is_published boolean NOT NULL DEFAULT true,
  view_count integer NOT NULL DEFAULT 0,
  helpful_count integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published articles" ON public.knowledge_base_articles
  FOR SELECT USING (is_published = true);

CREATE POLICY "Admins can manage all articles" ON public.knowledge_base_articles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_kb_articles_updated_at
  BEFORE UPDATE ON public.knowledge_base_articles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- SLA configurations table
CREATE TABLE public.sla_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  priority text NOT NULL UNIQUE,
  first_response_hours integer NOT NULL DEFAULT 24,
  resolution_hours integer NOT NULL DEFAULT 72,
  escalation_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sla_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view SLA configs" ON public.sla_configurations
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage SLA configs" ON public.sla_configurations
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'));

-- Insert default SLA configurations
INSERT INTO public.sla_configurations (priority, first_response_hours, resolution_hours, escalation_enabled) VALUES
  ('urgent', 1, 4, true),
  ('high', 4, 24, true),
  ('medium', 24, 72, true),
  ('low', 48, 168, false);

-- Add SLA tracking columns to support_tickets
ALTER TABLE public.support_tickets
  ADD COLUMN IF NOT EXISTS first_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS sla_breached boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalated_at timestamptz;

-- Add policy for users to update their own ticket ratings
CREATE POLICY "Users can rate their own tickets" ON public.support_tickets
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);