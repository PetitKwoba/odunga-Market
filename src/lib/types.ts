export type UserRole = 'producer' | 'wholesaler' | 'referrer' | 'admin';

export interface UserDocument {
  id: string;
  name: string;
  file_name: string;
  uploaded_at: string;
  status: 'pending' | 'approved' | 'rejected';
  note?: string;
}

export interface DocumentRequest {
  id: string;
  document_name: string;
  description: string;
  requested_at: string;
  fulfilled: boolean;
}

export interface UserProfile {
  phone: string;
  address: string;
  city: string;
  bio: string;
  avatar_url: string;
  website: string;
  tax_id: string;
  registration_number: string;
  industry: string;
  bank_name: string;
  bank_account_number: string;
  bank_routing_number: string;
  payout_method: 'bank_transfer' | 'mobile_money' | 'other';
}

export type StoreTeamRole = 'store_admin' | 'store_manager' | 'order_handler' | 'viewer' | 'delivery_person' | 'custom';

export interface StoreTeamMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: StoreTeamRole;
  custom_role_name?: string;
  permissions: StorePermission[];
  is_active: boolean;
  added_at: string;
}

export type StorePermission =
  | 'manage_products'
  | 'manage_orders'
  | 'view_orders'
  | 'manage_payouts'
  | 'manage_team'
  | 'view_reports'
  | 'manage_shipping'
  | 'update_delivery_status';

export const ROLE_PERMISSIONS: Record<Exclude<StoreTeamRole, 'custom'>, StorePermission[]> = {
  store_admin: ['manage_products', 'manage_orders', 'view_orders', 'manage_payouts', 'manage_team', 'view_reports', 'manage_shipping', 'update_delivery_status'],
  store_manager: ['manage_products', 'manage_orders', 'view_orders', 'view_reports', 'manage_shipping'],
  order_handler: ['view_orders', 'manage_orders', 'manage_shipping'],
  viewer: ['view_orders', 'view_reports'],
  delivery_person: ['view_orders', 'update_delivery_status'],
};

export const PERMISSION_LABELS: Record<StorePermission, string> = {
  manage_products: 'Manage Products',
  manage_orders: 'Manage Orders',
  view_orders: 'View Orders',
  manage_payouts: 'Manage Payouts',
  manage_team: 'Manage Team',
  view_reports: 'View Reports',
  manage_shipping: 'Manage Shipping',
  update_delivery_status: 'Update Delivery Status',
};

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
  is_approved: boolean;
  documents: UserDocument[];
  document_requests: DocumentRequest[];
  profile: UserProfile;
  store_team: StoreTeamMember[];
  created_at: string;
  updated_at: string;
}

export const defaultProfile: UserProfile = {
  phone: '',
  address: '',
  city: '',
  bio: '',
  avatar_url: '',
  website: '',
  tax_id: '',
  registration_number: '',
  industry: '',
  bank_name: '',
  bank_account_number: '',
  bank_routing_number: '',
  payout_method: 'bank_transfer',
};

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

export interface ProductReferralSale {
  id: string;
  referrer_user_id: string;
  product_id: string;
  product_name: string;
  producer_name: string;
  order_id: string;
  buyer_name: string;
  quantity: number;
  subtotal: number;
  commission_earned: number;
  created_at: string;
}
