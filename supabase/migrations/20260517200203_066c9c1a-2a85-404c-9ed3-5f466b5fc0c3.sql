
ALTER TABLE public.orders ALTER COLUMN wholesaler_id DROP NOT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_email text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS guest_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS referral_code text;

ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_buyer_present;
ALTER TABLE public.orders ADD CONSTRAINT orders_buyer_present
  CHECK (wholesaler_id IS NOT NULL OR (guest_email IS NOT NULL AND guest_email <> ''));

DROP POLICY IF EXISTS "Wholesalers can create orders" ON public.orders;
CREATE POLICY "Anyone can create orders"
ON public.orders
FOR INSERT
TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NOT NULL AND auth.uid() = wholesaler_id)
  OR (wholesaler_id IS NULL AND guest_email IS NOT NULL AND guest_email <> '')
);

DROP POLICY IF EXISTS "Wholesalers can insert order items" ON public.order_items;
CREATE POLICY "Buyers can insert order items"
ON public.order_items
FOR INSERT
TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.orders o
    WHERE o.id = order_items.order_id
      AND (
        (o.wholesaler_id IS NOT NULL AND o.wholesaler_id = auth.uid())
        OR (o.wholesaler_id IS NULL AND o.guest_email IS NOT NULL)
      )
  )
);
