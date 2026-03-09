-- Inventory Movements Table (for tracking stock changes)
CREATE TABLE public.inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('sale', 'restock', 'adjustment', 'return', 'order_deduction')),
  quantity INTEGER NOT NULL,
  previous_stock INTEGER NOT NULL,
  new_stock INTEGER NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock Alerts Table
CREATE TABLE public.stock_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL CHECK (alert_type IN ('low_stock', 'out_of_stock', 'back_in_stock')),
  threshold INTEGER DEFAULT 10,
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Shipments Table
CREATE TABLE public.shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  carrier TEXT NOT NULL DEFAULT 'custom',
  tracking_number TEXT,
  tracking_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'failed', 'returned')),
  estimated_delivery DATE,
  actual_delivery TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Product Reviews Table
CREATE TABLE public.product_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  reviewer_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  title TEXT,
  review TEXT,
  images TEXT[] DEFAULT '{}',
  is_verified_purchase BOOLEAN DEFAULT false,
  helpful_count INTEGER DEFAULT 0,
  producer_response TEXT,
  producer_response_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RFQ Requests Table
CREATE TABLE public.rfq_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT,
  quantity INTEGER NOT NULL,
  target_price NUMERIC,
  delivery_location TEXT,
  delivery_deadline DATE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'awarded', 'cancelled')),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RFQ Responses (Quotes from producers)
CREATE TABLE public.rfq_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id UUID NOT NULL REFERENCES public.rfq_requests(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL,
  unit_price NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  lead_time_days INTEGER NOT NULL,
  notes TEXT,
  is_selected BOOLEAN DEFAULT false,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications Table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'order', 'shipment', 'review', 'rfq', 'stock')),
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.inventory_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Inventory Movements RLS
CREATE POLICY "Producers can view their inventory movements" ON public.inventory_movements
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = inventory_movements.product_id AND products.producer_id = auth.uid())
  );

CREATE POLICY "Producers can insert inventory movements" ON public.inventory_movements
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM products WHERE products.id = inventory_movements.product_id AND products.producer_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can manage all inventory movements" ON public.inventory_movements
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Stock Alerts RLS
CREATE POLICY "Producers can view their stock alerts" ON public.stock_alerts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = stock_alerts.product_id AND products.producer_id = auth.uid())
  );

CREATE POLICY "Producers can manage their stock alerts" ON public.stock_alerts
  FOR ALL USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = stock_alerts.product_id AND products.producer_id = auth.uid())
  );

CREATE POLICY "Admins can manage all stock alerts" ON public.stock_alerts
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Shipments RLS
CREATE POLICY "Order participants can view shipments" ON public.shipments
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM orders WHERE orders.id = shipments.order_id AND orders.wholesaler_id = auth.uid())
    OR EXISTS (SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.id = shipments.order_id AND oi.producer_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Producers can manage shipments for their orders" ON public.shipments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.id = shipments.order_id AND oi.producer_id = auth.uid())
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Product Reviews RLS
CREATE POLICY "Anyone can view published reviews" ON public.product_reviews
  FOR SELECT USING (true);

CREATE POLICY "Verified purchasers can create reviews" ON public.product_reviews
  FOR INSERT WITH CHECK (
    auth.uid() = reviewer_id
    AND EXISTS (
      SELECT 1 FROM order_items oi 
      JOIN orders o ON o.id = oi.order_id 
      WHERE oi.product_id = product_reviews.product_id 
      AND o.wholesaler_id = auth.uid() 
      AND o.status = 'Completed'
    )
  );

CREATE POLICY "Reviewers can update their own reviews" ON public.product_reviews
  FOR UPDATE USING (auth.uid() = reviewer_id);

CREATE POLICY "Producers can respond to reviews" ON public.product_reviews
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM products WHERE products.id = product_reviews.product_id AND products.producer_id = auth.uid())
  );

CREATE POLICY "Admins can manage all reviews" ON public.product_reviews
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RFQ Requests RLS
CREATE POLICY "Anyone can view open RFQs" ON public.rfq_requests
  FOR SELECT USING (status = 'open' OR auth.uid() = wholesaler_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Wholesalers can create RFQs" ON public.rfq_requests
  FOR INSERT WITH CHECK (auth.uid() = wholesaler_id);

CREATE POLICY "Wholesalers can manage their RFQs" ON public.rfq_requests
  FOR UPDATE USING (auth.uid() = wholesaler_id);

CREATE POLICY "Admins can manage all RFQs" ON public.rfq_requests
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RFQ Responses RLS
CREATE POLICY "RFQ owner can view responses" ON public.rfq_responses
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM rfq_requests WHERE rfq_requests.id = rfq_responses.rfq_id AND rfq_requests.wholesaler_id = auth.uid())
    OR auth.uid() = producer_id
    OR has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Producers can submit quotes" ON public.rfq_responses
  FOR INSERT WITH CHECK (auth.uid() = producer_id AND has_role(auth.uid(), 'producer'::app_role));

CREATE POLICY "Producers can update their quotes" ON public.rfq_responses
  FOR UPDATE USING (auth.uid() = producer_id);

CREATE POLICY "RFQ owner can accept/reject quotes" ON public.rfq_responses
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM rfq_requests WHERE rfq_requests.id = rfq_responses.rfq_id AND rfq_requests.wholesaler_id = auth.uid())
  );

CREATE POLICY "Admins can manage all quotes" ON public.rfq_responses
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Notifications RLS
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can manage all notifications" ON public.notifications
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- Add triggers for updated_at
CREATE TRIGGER update_shipments_updated_at BEFORE UPDATE ON public.shipments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON public.product_reviews
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rfq_requests_updated_at BEFORE UPDATE ON public.rfq_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rfq_responses_updated_at BEFORE UPDATE ON public.rfq_responses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;