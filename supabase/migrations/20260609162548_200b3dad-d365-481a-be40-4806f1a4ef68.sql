
CREATE OR REPLACE FUNCTION public.credit_wallet_on_order_paid()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  item RECORD;
  v_platform_fee numeric;
  v_ref_fee numeric;
  v_producer_net numeric;
  v_ref_user uuid;
  v_new_pending numeric;
  v_cur text;
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid') THEN
    v_cur := COALESCE(NEW.currency, 'KES');

    v_ref_user := NULL;
    IF NEW.referral_code IS NOT NULL THEN
      SELECT user_id INTO v_ref_user FROM public.profiles WHERE referral_code = NEW.referral_code LIMIT 1;
    END IF;

    FOR item IN
      SELECT id, producer_id, product_id, quantity, subtotal
      FROM public.order_items WHERE order_id = NEW.id
    LOOP
      v_platform_fee := public.compute_platform_commission(item.quantity, item.subtotal);
      v_ref_fee := CASE WHEN v_ref_user IS NOT NULL
                        THEN public.compute_referrer_commission(item.quantity, item.subtotal)
                        ELSE 0 END;
      v_producer_net := item.subtotal - v_platform_fee - v_ref_fee;
      IF v_producer_net < 0 THEN v_producer_net := 0; END IF;

      UPDATE public.order_items
        SET platform_fee = v_platform_fee,
            referrer_fee = v_ref_fee,
            producer_net = v_producer_net,
            referrer_id  = v_ref_user,
            paid_at      = now()
        WHERE id = item.id;

      INSERT INTO public.wallet_balances (producer_id, pending_balance, lifetime_earned, currency)
      VALUES (item.producer_id, v_producer_net, v_producer_net, v_cur)
      ON CONFLICT (producer_id) DO UPDATE
        SET pending_balance = wallet_balances.pending_balance + EXCLUDED.pending_balance,
            lifetime_earned = wallet_balances.lifetime_earned + EXCLUDED.lifetime_earned,
            updated_at = now()
      RETURNING pending_balance INTO v_new_pending;

      INSERT INTO public.wallet_transactions
        (producer_id, type, amount, order_id, description, balance_after)
      VALUES (item.producer_id, 'credit_sale_pending', v_producer_net, NEW.id,
              'Order '||NEW.id||' pending (gross '||item.subtotal||', platform '||v_platform_fee||', referrer '||v_ref_fee||')',
              v_new_pending);

      INSERT INTO public.platform_revenue (order_id, order_item_id, producer_id, amount, currency)
      VALUES (NEW.id, item.id, item.producer_id, v_platform_fee, v_cur);

      IF v_ref_user IS NOT NULL AND v_ref_fee > 0 THEN
        INSERT INTO public.referrer_wallet_balances (referrer_id, pending_balance, lifetime_earned, currency)
        VALUES (v_ref_user, v_ref_fee, v_ref_fee, v_cur)
        ON CONFLICT (referrer_id) DO UPDATE
          SET pending_balance = referrer_wallet_balances.pending_balance + EXCLUDED.pending_balance,
              lifetime_earned = referrer_wallet_balances.lifetime_earned + EXCLUDED.lifetime_earned,
              updated_at = now()
        RETURNING pending_balance INTO v_new_pending;

        INSERT INTO public.referrer_wallet_transactions
          (referrer_id, type, amount, order_id, description, balance_after)
        VALUES (v_ref_user, 'credit_referral_pending', v_ref_fee, NEW.id,
                'Referral on order '||NEW.id, v_new_pending);
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
