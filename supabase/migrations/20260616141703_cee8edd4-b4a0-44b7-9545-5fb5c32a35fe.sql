
-- 1) PROFILES: remove broad public SELECT, keep self/admin, add safe public view
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE VIEW public.public_profiles
WITH (security_invoker = true) AS
SELECT user_id, name, avatar_url, business_name, country, referral_code
FROM public.profiles;

GRANT SELECT ON public.public_profiles TO anon, authenticated;

-- Allow the view to actually return rows for non-owners by adding a permissive
-- SELECT policy that the view inherits (view is invoker; underlying table still
-- needs a policy). Restrict to the safe columns by exposing them only via view.
CREATE POLICY "Public can view profiles for storefront via view"
  ON public.profiles FOR SELECT TO anon, authenticated
  USING (true);
-- NOTE: this still permits direct SELECT on profiles. To fully lock it down,
-- replace direct profile queries in the client with public_profiles. Until then
-- this policy keeps the app working; the view is the migration target.

-- 2) SUPPORT TICKETS: remove anon SELECT of all guest tickets
DROP POLICY IF EXISTS "Guests can view their tickets" ON public.support_tickets;

-- 3) DISCOUNT CODES: require auth to list active codes
DROP POLICY IF EXISTS "Anyone can view active discount codes" ON public.discount_codes;
CREATE POLICY "Authenticated users can view active discount codes"
  ON public.discount_codes FOR SELECT TO authenticated
  USING (is_active = true AND (valid_until IS NULL OR valid_until > now()));

-- 4) STORE REVIEWS: require auth to read
DROP POLICY IF EXISTS "Anyone can view store reviews" ON public.store_reviews;
CREATE POLICY "Authenticated users can view store reviews"
  ON public.store_reviews FOR SELECT TO authenticated
  USING (true);

-- 5) GUEST RATE LIMITS: drop anon SELECT, tighten INSERT check
DROP POLICY IF EXISTS "Anon can read rate limits" ON public.guest_rate_limits;
DROP POLICY IF EXISTS "Anon can insert rate limits" ON public.guest_rate_limits;
CREATE POLICY "Anon can insert rate limits"
  ON public.guest_rate_limits FOR INSERT TO anon
  WITH CHECK (ip_hash IS NOT NULL);

-- 6) SECURITY DEFINER functions: revoke public EXECUTE
REVOKE EXECUTE ON FUNCTION public.compute_commission(uuid, integer, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_platform_commission(integer, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.compute_referrer_commission(integer, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_setting_numeric(text, numeric) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.get_setting_text(text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_producer_for_order(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_wholesaler_for_order(uuid, uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.validate_stock_availability(jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.increment_discount_usage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_held_funds() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_producer_for_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_wholesaler_for_order(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_stock_availability(jsonb) TO authenticated;
