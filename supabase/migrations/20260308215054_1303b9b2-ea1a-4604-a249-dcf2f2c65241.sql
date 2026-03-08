
-- ============================================
-- WAHOLO MARKET DATABASE SCHEMA
-- ============================================

-- 1. ROLES ENUM & USER ROLES TABLE
CREATE TYPE public.app_role AS ENUM ('producer', 'wholesaler', 'referrer', 'admin');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles" ON public.user_roles
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 2. PROFILES TABLE
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  name TEXT NOT NULL,
  business_name TEXT,
  email TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT '',
  referral_code TEXT NOT NULL UNIQUE,
  referred_by_user_id UUID REFERENCES auth.users(id),
  referral_credits NUMERIC NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT FALSE,
  is_approved BOOLEAN NOT NULL DEFAULT FALSE,
  phone TEXT DEFAULT '',
  address TEXT DEFAULT '',
  city TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  website TEXT DEFAULT '',
  tax_id TEXT DEFAULT '',
  registration_number TEXT DEFAULT '',
  industry TEXT DEFAULT '',
  bank_name TEXT DEFAULT '',
  bank_account_number TEXT DEFAULT '',
  bank_routing_number TEXT DEFAULT '',
  payout_method TEXT DEFAULT 'bank_transfer',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- 3. USER DOCUMENTS TABLE
CREATE TABLE public.user_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  note TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own documents" ON public.user_documents
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can upload their own documents" ON public.user_documents
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all documents" ON public.user_documents
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update document status" ON public.user_documents
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- 4. DOCUMENT REQUESTS TABLE
CREATE TABLE public.document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  document_name TEXT NOT NULL,
  description TEXT DEFAULT '',
  fulfilled BOOLEAN NOT NULL DEFAULT FALSE,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own document requests" ON public.document_requests
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage document requests" ON public.document_requests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can update their own requests" ON public.document_requests
  FOR UPDATE USING (auth.uid() = user_id);

-- 5. PRODUCTS TABLE
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  images TEXT[] DEFAULT '{}',
  moq INTEGER NOT NULL DEFAULT 1,
  base_price NUMERIC NOT NULL DEFAULT 0,
  bulk_pricing JSONB DEFAULT '[]',
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  lead_time_days INTEGER NOT NULL DEFAULT 7,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active products are viewable by everyone" ON public.products
  FOR SELECT USING (is_active = true OR auth.uid() = producer_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Producers can manage their own products" ON public.products
  FOR ALL USING (auth.uid() = producer_id);

CREATE POLICY "Admins can manage all products" ON public.products
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

-- 6. ORDERS TABLE
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wholesaler_id UUID REFERENCES auth.users(id) NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'Shipped', 'Completed', 'Cancelled')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed')),
  shipping_address JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Wholesalers can view their own orders" ON public.orders
  FOR SELECT USING (auth.uid() = wholesaler_id);

CREATE POLICY "Wholesalers can create orders" ON public.orders
  FOR INSERT WITH CHECK (auth.uid() = wholesaler_id);

CREATE POLICY "Admins can view all orders" ON public.orders
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- 7. ORDER ITEMS TABLE
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  producer_id UUID REFERENCES auth.users(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0
);

ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order items viewable by order owner" ON public.order_items
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.wholesaler_id = auth.uid())
  );

CREATE POLICY "Producers can view their order items" ON public.order_items
  FOR SELECT USING (auth.uid() = producer_id);

CREATE POLICY "Admins can view all order items" ON public.order_items
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Wholesalers can insert order items" ON public.order_items
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE orders.id = order_items.order_id AND orders.wholesaler_id = auth.uid())
  );

-- 8. REFERRALS TABLE
CREATE TABLE public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID REFERENCES auth.users(id) NOT NULL,
  referred_user_id UUID REFERENCES auth.users(id) NOT NULL,
  first_order_id UUID REFERENCES public.orders(id),
  reward_credits_awarded NUMERIC NOT NULL DEFAULT 0,
  rewarded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own referrals" ON public.referrals
  FOR SELECT USING (auth.uid() = referrer_user_id OR auth.uid() = referred_user_id);

CREATE POLICY "Admins can view all referrals" ON public.referrals
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 9. PRODUCT REFERRAL SALES
CREATE TABLE public.product_referral_sales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id UUID REFERENCES auth.users(id) NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  order_id UUID REFERENCES public.orders(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 0,
  subtotal NUMERIC NOT NULL DEFAULT 0,
  commission_earned NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.product_referral_sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Referrers can view their own sales" ON public.product_referral_sales
  FOR SELECT USING (auth.uid() = referrer_user_id);

CREATE POLICY "Admins can view all sales" ON public.product_referral_sales
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 10. STORE TEAM MEMBERS
CREATE TABLE public.store_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'viewer',
  custom_role_name TEXT,
  permissions TEXT[] DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.store_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Producers can manage their own team" ON public.store_team_members
  FOR ALL USING (auth.uid() = producer_id);

CREATE POLICY "Admins can view all teams" ON public.store_team_members
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- 11. PRODUCER PROFILES (business settings)
CREATE TABLE public.producer_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  logo_url TEXT,
  categories TEXT[] DEFAULT '{}',
  minimum_order_rules TEXT,
  shipping_regions TEXT[] DEFAULT '{}',
  referral_reward_type TEXT NOT NULL DEFAULT 'fixed' CHECK (referral_reward_type IN ('fixed', 'percentage')),
  referral_reward_value NUMERIC NOT NULL DEFAULT 0
);

ALTER TABLE public.producer_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Producer profiles are viewable by everyone" ON public.producer_profiles
  FOR SELECT USING (true);

CREATE POLICY "Producers can manage their own profile" ON public.producer_profiles
  FOR ALL USING (auth.uid() = user_id);

-- 12. STORAGE BUCKETS
INSERT INTO storage.buckets (id, name, public) VALUES ('documents', 'documents', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);

-- Storage policies
CREATE POLICY "Users can upload their own documents" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all documents" ON storage.objects
  FOR SELECT USING (bucket_id = 'documents' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Product images are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'product-images');

CREATE POLICY "Producers can upload product images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Producers can update product images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 13. UTILITY FUNCTIONS
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 14. AUTO-CREATE PROFILE ON SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
  _name TEXT;
  _ref_code TEXT;
BEGIN
  _role := COALESCE((NEW.raw_user_meta_data->>'role')::app_role, 'wholesaler');
  _name := COALESCE(NEW.raw_user_meta_data->>'name', NEW.email);
  _ref_code := UPPER(LEFT(REPLACE(_name, ' ', ''), 6)) || FLOOR(RANDOM() * 1000)::TEXT;

  INSERT INTO public.profiles (user_id, name, email, country, referral_code, business_name, is_approved)
  VALUES (
    NEW.id,
    _name,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'country', ''),
    _ref_code,
    NEW.raw_user_meta_data->>'business_name',
    CASE WHEN _role IN ('referrer', 'admin') THEN TRUE ELSE FALSE END
  );

  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _role);

  -- If producer, create producer profile
  IF _role = 'producer' THEN
    INSERT INTO public.producer_profiles (user_id) VALUES (NEW.id);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Producers can also view orders containing their products
CREATE POLICY "Producers can view orders with their products" ON public.orders
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.order_items WHERE order_items.order_id = orders.id AND order_items.producer_id = auth.uid())
  );

-- Producers can update order status for their items
CREATE POLICY "Producers can update their orders" ON public.orders
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.order_items WHERE order_items.order_id = orders.id AND order_items.producer_id = auth.uid())
  );
