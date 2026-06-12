
CREATE TABLE public.webhook_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source TEXT NOT NULL,
  event_type TEXT,
  reference TEXT,
  payload JSONB,
  error_message TEXT,
  retry_count INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  next_retry_at TIMESTAMPTZ DEFAULT (now() + interval '2 minutes'),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.webhook_failures TO authenticated;
GRANT ALL ON public.webhook_failures TO service_role;

ALTER TABLE public.webhook_failures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view webhook failures"
  ON public.webhook_failures FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_webhook_failures_status_next_retry
  ON public.webhook_failures(status, next_retry_at);

CREATE TRIGGER update_webhook_failures_updated_at
  BEFORE UPDATE ON public.webhook_failures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
