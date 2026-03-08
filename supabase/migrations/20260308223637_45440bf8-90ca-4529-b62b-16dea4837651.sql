
-- Replace permissive INSERT policy with one restricted to authenticated users with admin role
DROP POLICY IF EXISTS "Service can insert referral sales" ON public.product_referral_sales;
CREATE POLICY "Admins can insert referral sales"
  ON public.product_referral_sales FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
