
-- =========================================================
-- 1. Extend wallet_balances
-- =========================================================
ALTER TABLE public.wallet_balances
  ADD COLUMN IF NOT EXISTS last_payout_at timestamptz;

-- =========================================================
-- 2. Referrer wallets
-- =========================================================
CREATE TABLE IF NOT EXISTS public.referrer_wallet_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL UNIQUE,
  available_balance numeric NOT NULL DEFAULT 0,
  pending_balance numeric NOT NULL DEFAULT 0,
  lifetime_earned numeric NOT NULL DEFAULT 0,
  lifetime_paid_out numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KES',
  last_payout_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referrer_wallet_balances TO authenticated;
GRANT ALL ON public.referrer_wallet_balances TO service_role;
ALTER TABLE public.referrer_wallet_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referrers view own wallet" ON public.referrer_wallet_balances
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_rwb_updated BEFORE UPDATE ON public.referrer_wallet_balances
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.referrer_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL,
  type text NOT NULL, -- credit_referral, debit_withdrawal, debit_return, hold_release, reversal
  amount numeric NOT NULL,
  order_id uuid,
  withdrawal_id uuid,
  description text,
  balance_after numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referrer_wallet_transactions TO authenticated;
GRANT ALL ON public.referrer_wallet_transactions TO service_role;
ALTER TABLE public.referrer_wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Referrers view own tx" ON public.referrer_wallet_transactions
  FOR SELECT TO authenticated
  USING (referrer_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 3. Platform revenue ledger
-- =========================================================
CREATE TABLE IF NOT EXISTS public.platform_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL,
  order_item_id uuid NOT NULL,
  producer_id uuid NOT NULL,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'KES',
  source text NOT NULL DEFAULT 'system_commission',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.platform_revenue TO authenticated;
GRANT ALL ON public.platform_revenue TO service_role;
ALTER TABLE public.platform_revenue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins view platform revenue" ON public.platform_revenue
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =========================================================
-- 4. Withdrawal requests
-- =========================================================
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_type text NOT NULL CHECK (user_type IN ('producer','referrer')),
  amount numeric NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'KES',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','paid','failed','rejected')),
  bank_account_id uuid,
  paystack_transfer_code text,
  paystack_reference text,
  failure_reason text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.withdrawal_requests TO authenticated;
GRANT ALL ON public.withdrawal_requests TO service_role;
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own withdrawals" ON public.withdrawal_requests
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own withdrawals" ON public.withdrawal_requests
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_wr_updated BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- 5. Extend order_items with split snapshot
-- =========================================================
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS platform_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrer_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS producer_net numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrer_id uuid,
  ADD COLUMN IF NOT EXISTS funds_released_at timestamptz,
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- =========================================================
-- 6. Seed platform settings
-- =========================================================
INSERT INTO public.platform_settings (key, value, description) VALUES
  ('system_commission_type', '"percentage"'::jsonb, 'System usage commission type: percentage or fixed'),
  ('system_commission_value', '5'::jsonb, 'System commission value (% or fixed amount per item)'),
  ('referrer_commission_type', '"percentage"'::jsonb, 'Referrer commission type'),
  ('referrer_commission_value', '3'::jsonb, 'Referrer commission value'),
  ('return_window_days', '7'::jsonb, 'Days funds are held pending after order paid'),
  ('producer_min_withdrawal', '1000'::jsonb, 'Minimum producer withdrawal amount (KES)'),
  ('referrer_min_withdrawal', '500'::jsonb, 'Minimum referrer withdrawal amount (KES)')
ON CONFLICT (key) DO NOTHING;

-- =========================================================
-- 7. Settings helper
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_setting_numeric(_key text, _default numeric)
RETURNS numeric LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT (value)::text::numeric FROM public.platform_settings WHERE key = _key), _default)
$$;

CREATE OR REPLACE FUNCTION public.get_setting_text(_key text, _default text)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT trim(both '"' from (value)::text) FROM public.platform_settings WHERE key = _key), _default)
$$;

-- =========================================================
-- 8. Commission computations
-- =========================================================
CREATE OR REPLACE FUNCTION public.compute_platform_commission(_quantity int, _subtotal numeric)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _t text; _v numeric;
BEGIN
  _t := public.get_setting_text('system_commission_type', 'percentage');
  _v := public.get_setting_numeric('system_commission_value', 5);
  IF _t = 'percentage' THEN
    RETURN ROUND((_subtotal * _v / 100.0)::numeric, 2);
  ELSE
    RETURN ROUND((_v * _quantity)::numeric, 2);
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.compute_referrer_commission(_quantity int, _subtotal numeric)
RETURNS numeric LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _t text; _v numeric;
BEGIN
  _t := public.get_setting_text('referrer_commission_type', 'percentage');
  _v := public.get_setting_numeric('referrer_commission_value', 3);
  IF _t = 'percentage' THEN
    RETURN ROUND((_subtotal * _v / 100.0)::numeric, 2);
  ELSE
    RETURN ROUND((_v * _quantity)::numeric, 2);
  END IF;
END;
$$;

-- =========================================================
-- 9. Rewrite credit trigger: 3-way split, credit PENDING balances
-- =========================================================
CREATE OR REPLACE FUNCTION public.credit_wallet_on_order_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item RECORD;
  platform_fee numeric;
  ref_fee numeric;
  producer_net numeric;
  ref_user uuid;
  new_pending numeric;
  cur text;
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
    cur := COALESCE(NEW.currency, 'KES');

    -- Resolve referrer (if any) from order.referral_code
    ref_user := NULL;
    IF NEW.referral_code IS NOT NULL THEN
      SELECT user_id INTO ref_user FROM public.profiles WHERE referral_code = NEW.referral_code LIMIT 1;
    END IF;

    FOR item IN
      SELECT id, producer_id, product_id, quantity, subtotal
      FROM public.order_items WHERE order_id = NEW.id
    LOOP
      platform_fee := public.compute_platform_commission(item.quantity, item.subtotal);
      ref_fee := CASE WHEN ref_user IS NOT NULL
                      THEN public.compute_referrer_commission(item.quantity, item.subtotal)
                      ELSE 0 END;
      producer_net := item.subtotal - platform_fee - ref_fee;
      IF producer_net < 0 THEN producer_net := 0; END IF;

      -- Snapshot on order_item
      UPDATE public.order_items
        SET platform_fee = platform_fee,
            referrer_fee = ref_fee,
            producer_net = producer_net,
            referrer_id  = ref_user,
            paid_at      = now()
        WHERE id = item.id;

      -- Credit producer PENDING
      INSERT INTO public.wallet_balances (producer_id, pending_balance, lifetime_earned, currency)
      VALUES (item.producer_id, producer_net, producer_net, cur)
      ON CONFLICT (producer_id) DO UPDATE
        SET pending_balance = wallet_balances.pending_balance + EXCLUDED.pending_balance,
            lifetime_earned = wallet_balances.lifetime_earned + EXCLUDED.lifetime_earned,
            updated_at = now()
      RETURNING pending_balance INTO new_pending;

      INSERT INTO public.wallet_transactions
        (producer_id, type, amount, order_id, description, balance_after)
      VALUES
        (item.producer_id, 'credit_sale_pending', producer_net, NEW.id,
         'Order '||NEW.id||' pending (gross '||item.subtotal||', platform '||platform_fee||', referrer '||ref_fee||')',
         new_pending);

      -- Platform revenue ledger
      INSERT INTO public.platform_revenue (order_id, order_item_id, producer_id, amount, currency)
      VALUES (NEW.id, item.id, item.producer_id, platform_fee, cur);

      -- Referrer credit (pending)
      IF ref_user IS NOT NULL AND ref_fee > 0 THEN
        INSERT INTO public.referrer_wallet_balances (referrer_id, pending_balance, lifetime_earned, currency)
        VALUES (ref_user, ref_fee, ref_fee, cur)
        ON CONFLICT (referrer_id) DO UPDATE
          SET pending_balance = referrer_wallet_balances.pending_balance + EXCLUDED.pending_balance,
              lifetime_earned = referrer_wallet_balances.lifetime_earned + EXCLUDED.lifetime_earned,
              updated_at = now()
        RETURNING pending_balance INTO new_pending;

        INSERT INTO public.referrer_wallet_transactions
          (referrer_id, type, amount, order_id, description, balance_after)
        VALUES
          (ref_user, 'credit_referral_pending', ref_fee, NEW.id,
           'Referral on order '||NEW.id, new_pending);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trg_credit_wallet_on_paid ON public.orders;
CREATE TRIGGER trg_credit_wallet_on_paid
  AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.credit_wallet_on_order_paid();

-- =========================================================
-- 10. Release held funds (run by cron hourly)
-- =========================================================
CREATE OR REPLACE FUNCTION public.release_held_funds()
RETURNS int LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  win_days int;
  rec RECORD;
  released_count int := 0;
  new_avail numeric;
BEGIN
  win_days := public.get_setting_numeric('return_window_days', 7)::int;

  FOR rec IN
    SELECT oi.id, oi.producer_id, oi.referrer_id, oi.producer_net, oi.referrer_fee,
           oi.order_id, o.currency
    FROM public.order_items oi
    JOIN public.orders o ON o.id = oi.order_id
    WHERE oi.paid_at IS NOT NULL
      AND oi.funds_released_at IS NULL
      AND oi.paid_at <= now() - (win_days || ' days')::interval
      AND NOT EXISTS (
        SELECT 1 FROM public.returns r
        WHERE r.order_id = oi.order_id AND r.status IN ('pending','approved','received')
      )
  LOOP
    -- Producer: pending -> available
    IF rec.producer_net > 0 THEN
      UPDATE public.wallet_balances
        SET pending_balance = pending_balance - rec.producer_net,
            available_balance = available_balance + rec.producer_net,
            updated_at = now()
        WHERE producer_id = rec.producer_id
        RETURNING available_balance INTO new_avail;

      INSERT INTO public.wallet_transactions
        (producer_id, type, amount, order_id, description, balance_after)
      VALUES (rec.producer_id, 'hold_release', rec.producer_net, rec.order_id,
              'Funds released after return window', new_avail);
    END IF;

    -- Referrer: pending -> available
    IF rec.referrer_id IS NOT NULL AND rec.referrer_fee > 0 THEN
      UPDATE public.referrer_wallet_balances
        SET pending_balance = pending_balance - rec.referrer_fee,
            available_balance = available_balance + rec.referrer_fee,
            updated_at = now()
        WHERE referrer_id = rec.referrer_id
        RETURNING available_balance INTO new_avail;

      INSERT INTO public.referrer_wallet_transactions
        (referrer_id, type, amount, order_id, description, balance_after)
      VALUES (rec.referrer_id, 'hold_release', rec.referrer_fee, rec.order_id,
              'Referral funds released after return window', new_avail);
    END IF;

    UPDATE public.order_items SET funds_released_at = now() WHERE id = rec.id;
    released_count := released_count + 1;
  END LOOP;

  RETURN released_count;
END;
$$;

-- =========================================================
-- 11. Reverse on return approved
-- =========================================================
CREATE OR REPLACE FUNCTION public.reverse_wallet_on_return()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  oi RECORD;
  new_bal numeric;
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    FOR oi IN
      SELECT * FROM public.order_items WHERE order_id = NEW.order_id
    LOOP
      -- Reverse producer
      IF oi.producer_net > 0 THEN
        IF oi.funds_released_at IS NULL THEN
          UPDATE public.wallet_balances
            SET pending_balance = pending_balance - oi.producer_net, updated_at = now()
            WHERE producer_id = oi.producer_id
            RETURNING pending_balance INTO new_bal;
        ELSE
          UPDATE public.wallet_balances
            SET available_balance = available_balance - oi.producer_net, updated_at = now()
            WHERE producer_id = oi.producer_id
            RETURNING available_balance INTO new_bal;
        END IF;
        INSERT INTO public.wallet_transactions
          (producer_id, type, amount, order_id, description, balance_after)
        VALUES (oi.producer_id, 'debit_return', -oi.producer_net, NEW.order_id,
                'Return approved (RMA '||COALESCE(NEW.rma_number,'')||')', new_bal);
      END IF;

      -- Reverse referrer
      IF oi.referrer_id IS NOT NULL AND oi.referrer_fee > 0 THEN
        IF oi.funds_released_at IS NULL THEN
          UPDATE public.referrer_wallet_balances
            SET pending_balance = pending_balance - oi.referrer_fee, updated_at = now()
            WHERE referrer_id = oi.referrer_id
            RETURNING pending_balance INTO new_bal;
        ELSE
          UPDATE public.referrer_wallet_balances
            SET available_balance = available_balance - oi.referrer_fee, updated_at = now()
            WHERE referrer_id = oi.referrer_id
            RETURNING available_balance INTO new_bal;
        END IF;
        INSERT INTO public.referrer_wallet_transactions
          (referrer_id, type, amount, order_id, description, balance_after)
        VALUES (oi.referrer_id, 'debit_return', -oi.referrer_fee, NEW.order_id,
                'Return approved', new_bal);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reverse_wallet_on_return ON public.returns;
CREATE TRIGGER trg_reverse_wallet_on_return
  AFTER UPDATE ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.reverse_wallet_on_return();
