import { User, ProducerProfile, Product, Order, Referral, ProductReferralSale, defaultProfile } from './types';

export const mockUsers: User[] = [
  {
    id: 'u1', role: 'producer', name: 'Amara Textiles', business_name: 'Amara Textiles Ltd',
    email: 'amara@example.com', country: 'Nigeria', referral_code: 'AMARA01',
    referred_by_user_id: null, referral_credits: 0, is_verified: true, is_approved: true,
    documents: [{ id: 'd1', name: 'Business Registration', file_name: 'business_reg.pdf', uploaded_at: '2025-01-15T10:00:00Z', status: 'approved' }],
    document_requests: [],
    profile: { ...defaultProfile, phone: '+234800000000', address: '12 Lagos Rd', city: 'Lagos', industry: 'Textiles', bio: 'Premium textile producer', bank_name: 'First Bank', bank_account_number: '1234567890', bank_routing_number: '011', payout_method: 'bank_transfer' },
    store_team: [
      { id: 'tm1', name: 'Chidi Okonkwo', email: 'chidi@amara.com', phone: '+234800111111', role: 'store_manager', permissions: ['manage_products', 'manage_orders', 'view_orders', 'view_reports', 'manage_shipping'], is_active: true, added_at: '2025-02-01T10:00:00Z' },
      { id: 'tm2', name: 'Fatima Bello', email: 'fatima@amara.com', phone: '+234800222222', role: 'delivery_person', permissions: ['view_orders', 'update_delivery_status'], is_active: true, added_at: '2025-02-15T10:00:00Z' },
    ],
    created_at: '2025-01-15T10:00:00Z', updated_at: '2025-01-15T10:00:00Z',
  },
  {
    id: 'u2', role: 'producer', name: 'GreenLeaf Agro', business_name: 'GreenLeaf Agro Inc',
    email: 'greenleaf@example.com', country: 'Ghana', referral_code: 'GREEN01',
    referred_by_user_id: null, referral_credits: 0, is_verified: true, is_approved: true,
    documents: [{ id: 'd2', name: 'Business Registration', file_name: 'greenleaf_cert.pdf', uploaded_at: '2025-02-01T10:00:00Z', status: 'approved' }],
    document_requests: [],
    profile: { ...defaultProfile, phone: '+233200000000', address: '5 Accra Ave', city: 'Accra', industry: 'Agriculture', bio: 'Organic agro products' },
    created_at: '2025-02-01T10:00:00Z', updated_at: '2025-02-01T10:00:00Z',
  },
  {
    id: 'u3', role: 'wholesaler', name: 'BulkBuy Co', business_name: 'BulkBuy Trading',
    email: 'bulkbuy@example.com', country: 'Kenya', referral_code: 'BULK01',
    referred_by_user_id: 'u5', referral_credits: 0, is_verified: true, is_approved: true,
    documents: [{ id: 'd3', name: 'Trade License', file_name: 'trade_license.pdf', uploaded_at: '2025-03-01T10:00:00Z', status: 'approved' }],
    document_requests: [],
    profile: { ...defaultProfile, phone: '+254700000000', address: '123 Market St', city: 'Nairobi', industry: 'Wholesale Trade' },
    created_at: '2025-03-01T10:00:00Z', updated_at: '2025-03-01T10:00:00Z',
  },
  {
    id: 'u4', role: 'admin', name: 'Admin', business_name: null,
    email: 'admin@waholo.com', country: 'US', referral_code: 'ADMIN01',
    referred_by_user_id: null, referral_credits: 0, is_verified: true, is_approved: true,
    documents: [], document_requests: [],
    profile: { ...defaultProfile },
    created_at: '2025-01-01T10:00:00Z', updated_at: '2025-01-01T10:00:00Z',
  },
  {
    id: 'u5', role: 'referrer', name: 'Jane Doe', business_name: null,
    email: 'jane@example.com', country: 'UK', referral_code: 'JANE01',
    referred_by_user_id: null, referral_credits: 25, is_verified: true, is_approved: true,
    documents: [], document_requests: [],
    profile: { ...defaultProfile, phone: '+44700000000', city: 'London', bio: 'Connecting buyers with the best African products' },
    created_at: '2025-02-10T10:00:00Z', updated_at: '2025-02-10T10:00:00Z',
  },
];

export const mockProducerProfiles: ProducerProfile[] = [
  {
    user_id: 'u1', logo_url: null, categories: ['Textiles', 'Apparel'],
    minimum_order_rules: 'Minimum 50 units per order',
    shipping_regions: ['West Africa', 'East Africa', 'Europe'],
    referral_reward_type: 'percentage', referral_reward_value: 5,
  },
  {
    user_id: 'u2', logo_url: null, categories: ['Agriculture', 'Food & Beverage'],
    minimum_order_rules: 'Minimum 100kg per order',
    shipping_regions: ['Africa', 'Middle East'],
    referral_reward_type: 'fixed', referral_reward_value: 10,
  },
];

export const mockProducts: Product[] = [
  {
    id: 'p1', producer_id: 'u1', producer_name: 'Amara Textiles', producer_country: 'Nigeria',
    name: 'Premium Ankara Fabric', description: 'High-quality 100% cotton Ankara print fabric. Vibrant colors, pre-shrunk. Perfect for fashion brands and retailers.',
    category: 'Textiles', images: ['/placeholder.svg'], moq: 50, base_price: 8.50,
    bulk_pricing: [{ min_qty: 50, max_qty: 199, price: 8.50 }, { min_qty: 200, max_qty: 499, price: 7.20 }, { min_qty: 500, max_qty: null, price: 6.00 }],
    stock_quantity: 10000, lead_time_days: 7, is_active: true,
  },
  {
    id: 'p2', producer_id: 'u1', producer_name: 'Amara Textiles', producer_country: 'Nigeria',
    name: 'Cotton Blend T-Shirt Blanks', description: 'Unbranded cotton-blend t-shirts in bulk. Available in 12 colors, sizes S-3XL.',
    category: 'Apparel', images: ['/placeholder.svg'], moq: 100, base_price: 3.20,
    bulk_pricing: [{ min_qty: 100, max_qty: 499, price: 3.20 }, { min_qty: 500, max_qty: 999, price: 2.80 }, { min_qty: 1000, max_qty: null, price: 2.40 }],
    stock_quantity: 25000, lead_time_days: 10, is_active: true,
  },
  {
    id: 'p3', producer_id: 'u2', producer_name: 'GreenLeaf Agro', producer_country: 'Ghana',
    name: 'Organic Cocoa Beans (Grade A)', description: 'Premium grade A organic cocoa beans, sun-dried and fermented. Ideal for chocolate manufacturers.',
    category: 'Agriculture', images: ['/placeholder.svg'], moq: 500, base_price: 4.50,
    bulk_pricing: [{ min_qty: 500, max_qty: 1999, price: 4.50 }, { min_qty: 2000, max_qty: 4999, price: 4.00 }, { min_qty: 5000, max_qty: null, price: 3.50 }],
    stock_quantity: 50000, lead_time_days: 14, is_active: true,
  },
  {
    id: 'p4', producer_id: 'u2', producer_name: 'GreenLeaf Agro', producer_country: 'Ghana',
    name: 'Shea Butter (Unrefined)', description: 'Raw unrefined shea butter, cold-pressed. Cosmetic grade, great for skincare brands.',
    category: 'Agriculture', images: ['/placeholder.svg'], moq: 200, base_price: 6.00,
    bulk_pricing: [{ min_qty: 200, max_qty: 499, price: 6.00 }, { min_qty: 500, max_qty: null, price: 5.00 }],
    stock_quantity: 8000, lead_time_days: 10, is_active: true,
  },
  {
    id: 'p5', producer_id: 'u1', producer_name: 'Amara Textiles', producer_country: 'Nigeria',
    name: 'Kente Woven Strips', description: 'Authentic hand-woven Kente cloth strips. Traditional patterns, ideal for designers and cultural events.',
    category: 'Textiles', images: ['/placeholder.svg'], moq: 20, base_price: 15.00,
    bulk_pricing: [{ min_qty: 20, max_qty: 99, price: 15.00 }, { min_qty: 100, max_qty: null, price: 12.00 }],
    stock_quantity: 3000, lead_time_days: 21, is_active: true,
  },
];

export const mockOrders: Order[] = [
  {
    id: 'o1', wholesaler_id: 'u3', wholesaler_name: 'BulkBuy Co', total_amount: 1440,
    status: 'Completed', payment_status: 'paid',
    shipping_address: { name: 'BulkBuy Co', address: '123 Market St', city: 'Nairobi', country: 'Kenya', phone: '+254700000000' },
    items: [
      { id: 'oi1', order_id: 'o1', product_id: 'p2', product_name: 'Cotton Blend T-Shirt Blanks', producer_id: 'u1', quantity: 500, unit_price: 2.80, subtotal: 1400 },
      { id: 'oi2', order_id: 'o1', product_id: 'p4', product_name: 'Shea Butter (Unrefined)', producer_id: 'u2', quantity: 0, unit_price: 0, subtotal: 0 },
    ],
    created_at: '2025-03-15T10:00:00Z', updated_at: '2025-04-01T10:00:00Z',
  },
];

export const mockReferrals: Referral[] = [
  {
    id: 'r1', referrer_user_id: 'u5', referred_user_id: 'u3',
    referred_user_name: 'BulkBuy Co', referred_user_email_masked: 'b***@example.com',
    referred_user_role: 'wholesaler', created_at: '2025-03-01T10:00:00Z',
    first_order_id: 'o1', reward_credits_awarded: 25, rewarded: true,
  },
];

export const mockProductReferralSales: ProductReferralSale[] = [
  {
    id: 'prs1', referrer_user_id: 'u5', product_id: 'p2', product_name: 'Cotton Blend T-Shirt Blanks',
    producer_name: 'Amara Textiles', order_id: 'o1', buyer_name: 'BulkBuy Co',
    quantity: 500, subtotal: 1400, commission_earned: 25,
    created_at: '2025-03-15T10:00:00Z',
  },
];
