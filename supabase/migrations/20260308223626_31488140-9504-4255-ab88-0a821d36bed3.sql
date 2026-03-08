
-- Payouts table for tracking producer disbursements
CREATE TABLE public.payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id),
  producer_id uuid NOT NULL,
  gross_amount numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  referral_fee numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  paid_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Producers can view their own payouts"
  ON public.payouts FOR SELECT
  USING (auth.uid() = producer_id);

CREATE POLICY "Admins can manage all payouts"
  ON public.payouts FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service can insert referral sales"
  ON public.product_referral_sales FOR INSERT
  WITH CHECK (true);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_reference text;
