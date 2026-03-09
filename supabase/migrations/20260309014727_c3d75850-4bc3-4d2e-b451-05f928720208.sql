
-- =====================================================
-- 1. RETURNS & REFUNDS (RMA) SYSTEM
-- =====================================================
CREATE TABLE public.returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  wholesaler_id UUID NOT NULL,
  rma_number TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'received', 'refunded', 'restocked')),
  return_type TEXT NOT NULL CHECK (return_type IN ('defective', 'wrong_item', 'damaged', 'not_as_described', 'buyers_remorse', 'other')),
  reason TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]',
  refund_amount NUMERIC NOT NULL DEFAULT 0,
  restocking_fee NUMERIC NOT NULL DEFAULT 0,
  approved_at TIMESTAMPTZ,
  approved_by UUID,
  received_at TIMESTAMPTZ,
  refunded_at TIMESTAMPTZ,
  producer_notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.returns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wholesalers can view their returns" ON public.returns FOR SELECT USING (auth.uid() = wholesaler_id);
CREATE POLICY "Wholesalers can create returns" ON public.returns FOR INSERT WITH CHECK (auth.uid() = wholesaler_id);
CREATE POLICY "Producers can view returns for their orders" ON public.returns FOR SELECT USING (
  EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = returns.order_id AND oi.producer_id = auth.uid())
);
CREATE POLICY "Producers can update returns" ON public.returns FOR UPDATE USING (
  EXISTS (SELECT 1 FROM order_items oi WHERE oi.order_id = returns.order_id AND oi.producer_id = auth.uid())
);
CREATE POLICY "Admins can manage all returns" ON public.returns FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_returns_updated_at BEFORE UPDATE ON public.returns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 2. DISCOUNT CODES / PROMOTIONAL SYSTEM
-- =====================================================
CREATE TABLE public.discount_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL,
  min_order_amount NUMERIC DEFAULT 0,
  max_uses INTEGER,
  used_count INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT true,
  applicable_to TEXT NOT NULL DEFAULT 'all' CHECK (applicable_to IN ('all', 'first_order', 'specific_products', 'specific_categories')),
  applicable_items JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.discount_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active discount codes" ON public.discount_codes FOR SELECT USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));
CREATE POLICY "Admins can manage discount codes" ON public.discount_codes FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE TABLE public.discount_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  discount_code_id UUID NOT NULL REFERENCES public.discount_codes(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  discount_amount NUMERIC NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(discount_code_id, order_id)
);

ALTER TABLE public.discount_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their discount usage" ON public.discount_usage FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all usage" ON public.discount_usage FOR SELECT USING (has_role(auth.uid(), 'admin'));

-- =====================================================
-- 3. MULTI-CURRENCY SUPPORT
-- =====================================================
CREATE TABLE public.currencies (
  code TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  exchange_rate NUMERIC NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.currencies (code, name, symbol, exchange_rate) VALUES
  ('USD', 'US Dollar', '$', 1),
  ('EUR', 'Euro', '€', 0.92),
  ('GBP', 'British Pound', '£', 0.79),
  ('NGN', 'Nigerian Naira', '₦', 1550),
  ('KES', 'Kenyan Shilling', 'KSh', 153);

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view currencies" ON public.currencies FOR SELECT USING (true);
CREATE POLICY "Admins can manage currencies" ON public.currencies FOR ALL USING (has_role(auth.uid(), 'admin'));

-- Add preferred currency to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS preferred_currency TEXT DEFAULT 'USD';

-- =====================================================
-- 4. PRODUCER B2B INVOICES (separate from POS)
-- =====================================================
CREATE TABLE public.b2b_invoices (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  producer_id UUID NOT NULL,
  order_id UUID REFERENCES public.orders(id),
  wholesaler_id UUID NOT NULL,
  wholesaler_name TEXT NOT NULL,
  wholesaler_email TEXT,
  wholesaler_address JSONB,
  items JSONB NOT NULL DEFAULT '[]',
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax_rate NUMERIC NOT NULL DEFAULT 0,
  tax_amount NUMERIC NOT NULL DEFAULT 0,
  discount_amount NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'paid', 'overdue', 'cancelled')),
  payment_terms TEXT DEFAULT 'due_on_receipt',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.b2b_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Producers can manage their invoices" ON public.b2b_invoices FOR ALL USING (auth.uid() = producer_id);
CREATE POLICY "Wholesalers can view invoices sent to them" ON public.b2b_invoices FOR SELECT USING (auth.uid() = wholesaler_id);
CREATE POLICY "Admins can manage all invoices" ON public.b2b_invoices FOR ALL USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_b2b_invoices_updated_at BEFORE UPDATE ON public.b2b_invoices FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- 5. AUTO STOCK DEDUCTION TRIGGER
-- =====================================================
CREATE OR REPLACE FUNCTION public.deduct_stock_on_order_item()
RETURNS TRIGGER AS $$
BEGIN
  -- Deduct stock from the product
  UPDATE public.products 
  SET stock_quantity = stock_quantity - NEW.quantity
  WHERE id = NEW.product_id;
  
  -- Log the inventory movement
  INSERT INTO public.inventory_movements (
    product_id, 
    movement_type, 
    quantity, 
    previous_stock, 
    new_stock, 
    order_id, 
    notes
  )
  SELECT 
    NEW.product_id,
    'order_deduction',
    -NEW.quantity,
    p.stock_quantity + NEW.quantity,
    p.stock_quantity,
    NEW.order_id,
    'Auto-deducted on order placement'
  FROM public.products p WHERE p.id = NEW.product_id;
  
  -- Create low stock alert if needed
  INSERT INTO public.stock_alerts (product_id, alert_type, threshold)
  SELECT NEW.product_id, 
    CASE 
      WHEN p.stock_quantity <= 0 THEN 'out_of_stock'
      WHEN p.stock_quantity <= 10 THEN 'low_stock'
    END,
    CASE WHEN p.stock_quantity <= 0 THEN 0 ELSE 10 END
  FROM public.products p 
  WHERE p.id = NEW.product_id 
    AND p.stock_quantity <= 10
    AND NOT EXISTS (
      SELECT 1 FROM public.stock_alerts sa 
      WHERE sa.product_id = NEW.product_id 
        AND sa.is_resolved = false
    );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trigger_deduct_stock_on_order
  AFTER INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.deduct_stock_on_order_item();

-- =====================================================
-- 6. STOCK VALIDATION FUNCTION (for checkout)
-- =====================================================
CREATE OR REPLACE FUNCTION public.validate_stock_availability(p_items JSONB)
RETURNS JSONB AS $$
DECLARE
  item JSONB;
  product_record RECORD;
  errors JSONB := '[]'::JSONB;
BEGIN
  FOR item IN SELECT * FROM jsonb_array_elements(p_items)
  LOOP
    SELECT id, name, stock_quantity INTO product_record
    FROM public.products 
    WHERE id = (item->>'product_id')::UUID;
    
    IF product_record IS NULL THEN
      errors := errors || jsonb_build_object(
        'product_id', item->>'product_id',
        'error', 'Product not found'
      );
    ELSIF product_record.stock_quantity < (item->>'quantity')::INTEGER THEN
      errors := errors || jsonb_build_object(
        'product_id', item->>'product_id',
        'product_name', product_record.name,
        'requested', (item->>'quantity')::INTEGER,
        'available', product_record.stock_quantity,
        'error', 'Insufficient stock'
      );
    END IF;
  END LOOP;
  
  RETURN errors;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =====================================================
-- 7. EMAIL NOTIFICATION LOG
-- =====================================================
CREATE TABLE public.email_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email_to TEXT NOT NULL,
  email_type TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  error_message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view all email logs" ON public.email_logs FOR ALL USING (has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view their email logs" ON public.email_logs FOR SELECT USING (auth.uid() = user_id);

-- Add discount_code column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_code_id UUID REFERENCES public.discount_codes(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
