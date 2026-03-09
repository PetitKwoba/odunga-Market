
-- ============================================================
-- 1. ADD GUEST COLUMNS TO SUPPORT_TICKETS (if not exist)
-- ============================================================
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS guest_name TEXT;
ALTER TABLE public.support_tickets ADD COLUMN IF NOT EXISTS guest_email TEXT;

-- ============================================================
-- 2. CREATE STORE_REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.store_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id UUID NOT NULL,  -- producer user_id
  reviewer_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review TEXT,
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  producer_response TEXT,
  producer_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_reviews ENABLE ROW LEVEL SECURITY;

-- Anyone can view store reviews
CREATE POLICY "Anyone can view store reviews" ON public.store_reviews
  FOR SELECT USING (true);

-- Verified purchasers can create store reviews
CREATE POLICY "Verified purchasers can create store reviews" ON public.store_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      WHERE oi.producer_id = store_reviews.store_id
        AND o.wholesaler_id = auth.uid()
        AND o.status = 'Completed'
    )
  );

-- Reviewers can update their own reviews
CREATE POLICY "Reviewers can update own store reviews" ON public.store_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

-- Store owners can respond (update producer_response)
CREATE POLICY "Store owners can respond to store reviews" ON public.store_reviews
  FOR UPDATE USING (auth.uid() = store_id);

-- Admins can manage all store reviews
CREATE POLICY "Admins can manage all store reviews" ON public.store_reviews
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- 3. RLS FOR GUEST SUPPORT TICKETS
-- ============================================================
-- Allow anonymous users to insert tickets (guest support)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Guests can create tickets' AND tablename = 'support_tickets'
  ) THEN
    CREATE POLICY "Guests can create tickets" ON public.support_tickets
      FOR INSERT TO anon
      WITH CHECK (user_id IS NULL AND guest_email IS NOT NULL);
  END IF;
END $$;

-- Allow anon to select their own guest tickets by id
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Guests can view their tickets' AND tablename = 'support_tickets'
  ) THEN
    CREATE POLICY "Guests can view their tickets" ON public.support_tickets
      FOR SELECT TO anon
      USING (user_id IS NULL);
  END IF;
END $$;

-- ============================================================
-- 4. RE-CREATE ALL TRIGGERS
-- ============================================================

-- 4a. Auth trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4b. Stock deduction trigger
DROP TRIGGER IF EXISTS trigger_deduct_stock_on_order_item ON public.order_items;
CREATE TRIGGER trigger_deduct_stock_on_order_item
  AFTER INSERT ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.deduct_stock_on_order_item();

-- 4c. Notification preferences on profile creation
DROP TRIGGER IF EXISTS trigger_create_notification_preferences ON public.profiles;
CREATE TRIGGER trigger_create_notification_preferences
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_notification_preferences();

-- 4d. updated_at triggers
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
CREATE TRIGGER update_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_products_updated_at ON public.products;
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_support_tickets_updated_at ON public.support_tickets;
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_rfq_requests_updated_at ON public.rfq_requests;
CREATE TRIGGER update_rfq_requests_updated_at
  BEFORE UPDATE ON public.rfq_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_returns_updated_at ON public.returns;
CREATE TRIGGER update_returns_updated_at
  BEFORE UPDATE ON public.returns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_shipments_updated_at ON public.shipments;
CREATE TRIGGER update_shipments_updated_at
  BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_b2b_invoices_updated_at ON public.b2b_invoices;
CREATE TRIGGER update_b2b_invoices_updated_at
  BEFORE UPDATE ON public.b2b_invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_store_reviews_updated_at ON public.store_reviews;
CREATE TRIGGER update_store_reviews_updated_at
  BEFORE UPDATE ON public.store_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. ADD REALTIME FOR STORE_REVIEWS
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'store_reviews'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.store_reviews;
  END IF;
END $$;
