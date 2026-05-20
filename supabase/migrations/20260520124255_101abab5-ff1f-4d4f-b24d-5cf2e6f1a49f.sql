
-- ============ COMMISSIONS ============
ALTER TABLE public.producer_profiles
  ADD COLUMN IF NOT EXISTS commission_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS commission_value numeric NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS commission_scope text NOT NULL DEFAULT 'platform';

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS commission_type text,
  ADD COLUMN IF NOT EXISTS commission_value numeric;

CREATE OR REPLACE FUNCTION public.compute_commission(_product_id uuid, _quantity integer, _subtotal numeric)
RETURNS numeric
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ctype text;
  _cval numeric;
  _producer uuid;
BEGIN
  SELECT producer_id, commission_type, commission_value
    INTO _producer, _ctype, _cval
  FROM public.products WHERE id = _product_id;

  IF _ctype IS NULL OR _cval IS NULL THEN
    SELECT commission_type, commission_value INTO _ctype, _cval
    FROM public.producer_profiles WHERE user_id = _producer;
  END IF;

  IF _ctype IS NULL OR _cval IS NULL THEN
    RETURN 0;
  END IF;

  IF _ctype = 'percentage' THEN
    RETURN ROUND((_subtotal * _cval / 100.0)::numeric, 2);
  ELSE
    RETURN ROUND((_cval * _quantity)::numeric, 2);
  END IF;
END;
$$;

-- ============ WALLET ============
CREATE TABLE IF NOT EXISTS public.wallet_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL UNIQUE,
  available_balance numeric NOT NULL DEFAULT 0,
  pending_balance numeric NOT NULL DEFAULT 0,
  lifetime_earned numeric NOT NULL DEFAULT 0,
  lifetime_paid_out numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KES',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Producers view own wallet" ON public.wallet_balances
  FOR SELECT USING (auth.uid() = producer_id);
CREATE POLICY "Admins manage wallets" ON public.wallet_balances
  FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_wallet_balances_updated
  BEFORE UPDATE ON public.wallet_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL,
  type text NOT NULL,
  amount numeric NOT NULL,
  order_id uuid,
  payout_id uuid,
  description text,
  balance_after numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wallet_tx_producer ON public.wallet_transactions(producer_id, created_at DESC);

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Producers view own wallet tx" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = producer_id);
CREATE POLICY "Admins manage wallet tx" ON public.wallet_transactions
  FOR ALL USING (has_role(auth.uid(), 'admin'));

-- ============ BANK ACCOUNTS ============
CREATE TABLE IF NOT EXISTS public.producer_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL UNIQUE,
  bank_name text NOT NULL,
  bank_code text NOT NULL,
  account_number text NOT NULL,
  account_name text NOT NULL,
  currency text NOT NULL DEFAULT 'KES',
  paystack_recipient_code text,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.producer_bank_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Producers manage own bank" ON public.producer_bank_accounts
  FOR ALL USING (auth.uid() = producer_id) WITH CHECK (auth.uid() = producer_id);
CREATE POLICY "Admins view all banks" ON public.producer_bank_accounts
  FOR SELECT USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_bank_accounts_updated
  BEFORE UPDATE ON public.producer_bank_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ PAYOUTS EXTENSIONS ============
ALTER TABLE public.payouts
  ADD COLUMN IF NOT EXISTS paystack_transfer_code text,
  ADD COLUMN IF NOT EXISTS paystack_recipient_code text,
  ADD COLUMN IF NOT EXISTS failure_reason text,
  ADD COLUMN IF NOT EXISTS batch_id uuid,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

-- ============ TRIGGER: credit wallet on order paid ============
CREATE OR REPLACE FUNCTION public.credit_wallet_on_order_paid()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item RECORD;
  commission numeric;
  net numeric;
  new_avail numeric;
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
    FOR item IN
      SELECT producer_id, product_id, quantity, subtotal
      FROM public.order_items WHERE order_id = NEW.id
    LOOP
      commission := public.compute_commission(item.product_id, item.quantity, item.subtotal);
      net := item.subtotal - commission;

      INSERT INTO public.wallet_balances (producer_id, available_balance, lifetime_earned, currency)
      VALUES (item.producer_id, net, net, COALESCE(NEW.currency, 'KES'))
      ON CONFLICT (producer_id) DO UPDATE
        SET available_balance = wallet_balances.available_balance + net,
            lifetime_earned   = wallet_balances.lifetime_earned + net,
            updated_at = now()
      RETURNING available_balance INTO new_avail;

      INSERT INTO public.wallet_transactions
        (producer_id, type, amount, order_id, description, balance_after)
      VALUES
        (item.producer_id, 'credit_sale', net, NEW.id,
         'Order ' || NEW.id || ' (gross ' || item.subtotal || ', commission ' || commission || ')',
         new_avail);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_credit_wallet_on_paid ON public.orders;
CREATE TRIGGER trg_credit_wallet_on_paid
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.credit_wallet_on_order_paid();
