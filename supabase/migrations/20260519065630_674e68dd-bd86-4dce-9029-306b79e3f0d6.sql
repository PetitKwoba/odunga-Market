-- Fix infinite recursion between orders and order_items policies
CREATE OR REPLACE FUNCTION public.is_producer_for_order(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_items
    WHERE order_id = _order_id AND producer_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_wholesaler_for_order(_order_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.orders
    WHERE id = _order_id AND wholesaler_id = _user_id
  )
$$;

-- Replace recursive policies on orders
DROP POLICY IF EXISTS "Producers can view orders with their products" ON public.orders;
DROP POLICY IF EXISTS "Producers can update their orders" ON public.orders;

CREATE POLICY "Producers can view orders with their products"
ON public.orders FOR SELECT
USING (public.is_producer_for_order(id, auth.uid()));

CREATE POLICY "Producers can update their orders"
ON public.orders FOR UPDATE
USING (public.is_producer_for_order(id, auth.uid()));

-- Replace recursive policy on order_items
DROP POLICY IF EXISTS "Order items viewable by order owner" ON public.order_items;

CREATE POLICY "Order items viewable by order owner"
ON public.order_items FOR SELECT
USING (public.is_wholesaler_for_order(order_id, auth.uid()));