
-- Order messages for order-based chat
CREATE TABLE public.order_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  message text NOT NULL,
  is_flagged boolean NOT NULL DEFAULT false,
  flag_reason text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.order_messages ENABLE ROW LEVEL SECURITY;

-- Participants (wholesaler or producer with items in that order) can view messages
CREATE POLICY "Order participants can view messages"
  ON public.order_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders WHERE orders.id = order_messages.order_id AND orders.wholesaler_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM order_items WHERE order_items.order_id = order_messages.order_id AND order_items.producer_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Participants can send messages
CREATE POLICY "Order participants can send messages"
  ON public.order_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      EXISTS (
        SELECT 1 FROM orders WHERE orders.id = order_messages.order_id AND orders.wholesaler_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM order_items WHERE order_items.order_id = order_messages.order_id AND order_items.producer_id = auth.uid()
      )
    )
  );

-- Admins can update (for flagging)
CREATE POLICY "Admins can manage messages"
  ON public.order_messages FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_messages;

-- POS: Private catalog items (not listed publicly)
CREATE TABLE public.pos_catalog_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  category text DEFAULT '',
  price numeric NOT NULL DEFAULT 0,
  stock_quantity integer NOT NULL DEFAULT 0,
  sku text DEFAULT '',
  images text[] DEFAULT '{}',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_catalog_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their catalog"
  ON public.pos_catalog_items FOR ALL
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can view all catalogs"
  ON public.pos_catalog_items FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- POS transactions (in-person sales)
CREATE TABLE public.pos_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  customer_name text DEFAULT 'Walk-in',
  customer_phone text DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'cash',
  payment_status text NOT NULL DEFAULT 'completed',
  notes text DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their transactions"
  ON public.pos_transactions FOR ALL
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can view all transactions"
  ON public.pos_transactions FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Private invoices (B2B deals without public listing)
CREATE TABLE public.pos_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  client_name text NOT NULL,
  client_email text DEFAULT '',
  client_phone text DEFAULT '',
  items jsonb NOT NULL DEFAULT '[]',
  subtotal numeric NOT NULL DEFAULT 0,
  tax numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  due_date date,
  notes text DEFAULT '',
  invoice_number text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.pos_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can manage their invoices"
  ON public.pos_invoices FOR ALL
  USING (auth.uid() = owner_id);

CREATE POLICY "Admins can view all invoices"
  ON public.pos_invoices FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));
