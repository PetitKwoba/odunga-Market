export type UserRole = 'producer' | 'wholesaler' | 'referrer' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  name: string;
  business_name: string | null;
  email: string;
  country: string;
  referral_code: string;
  referred_by_user_id: string | null;
  referral_credits: number;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProducerProfile {
  user_id: string;
  logo_url: string | null;
  categories: string[];
  minimum_order_rules: string | null;
  shipping_regions: string[];
  referral_reward_type: 'fixed' | 'percentage';
  referral_reward_value: number;
}

export interface Product {
  id: string;
  producer_id: string;
  producer_name: string;
  producer_country: string;
  name: string;
  description: string;
  category: string;
  images: string[];
  moq: number;
  base_price: number;
  bulk_pricing: BulkTier[];
  stock_quantity: number;
  lead_time_days: number;
  is_active: boolean;
}

export interface BulkTier {
  min_qty: number;
  max_qty: number | null;
  price: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface ShippingAddress {
  name: string;
  address: string;
  city: string;
  country: string;
  phone: string;
}

export type OrderStatus = 'Pending' | 'Confirmed' | 'Shipped' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface Order {
  id: string;
  wholesaler_id: string;
  wholesaler_name: string;
  total_amount: number;
  status: OrderStatus;
  payment_status: PaymentStatus;
  shipping_address: ShippingAddress;
  items: OrderItem[];
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  producer_id: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface Referral {
  id: string;
  referrer_user_id: string;
  referred_user_id: string;
  referred_user_name: string;
  referred_user_email_masked: string;
  referred_user_role: UserRole;
  created_at: string;
  first_order_id: string | null;
  reward_credits_awarded: number;
  rewarded: boolean;
}
