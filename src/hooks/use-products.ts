import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ProductRow {
  id: string;
  producer_id: string;
  name: string;
  description: string | null;
  category: string;
  images: string[] | null;
  moq: number;
  base_price: number;
  bulk_pricing: any;
  stock_quantity: number;
  lead_time_days: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductWithProducer extends ProductRow {
  producer_name: string;
  producer_country: string;
}

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async (): Promise<ProductWithProducer[]> => {
      // Fetch active products
      const { data: products, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!products || products.length === 0) return [];

      // Get unique producer IDs and fetch their profiles
      const producerIds = [...new Set(products.map(p => p.producer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name, country')
        .in('user_id', producerIds);

      const profileMap = new Map(
        (profiles || []).map(p => [p.user_id, { name: p.name, country: p.country }])
      );

      return products.map(p => ({
        ...p,
        producer_name: profileMap.get(p.producer_id)?.name || 'Unknown Producer',
        producer_country: profileMap.get(p.producer_id)?.country || '',
      }));
    },
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ['product-categories'],
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('products')
        .select('category')
        .eq('is_active', true);

      if (error) throw error;
      const cats = [...new Set((data || []).map(d => d.category).filter(Boolean))];
      return cats.sort();
    },
  });
}
