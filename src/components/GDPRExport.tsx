import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Loader2, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function GDPRExport() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!user) return;
    setExporting(true);

    try {
      // Collect all user data
      const [
        { data: profile },
        { data: orders },
        { data: orderItems },
        { data: reviews },
        { data: storeReviews },
        { data: referrals },
        { data: tickets },
        { data: notifications },
        { data: wishlists },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('user_id', user.id).single(),
        supabase.from('orders').select('*').eq('wholesaler_id', user.id),
        supabase.from('order_items').select('*').eq('producer_id', user.id),
        supabase.from('product_reviews').select('*').eq('reviewer_id', user.id),
        supabase.from('store_reviews').select('*').eq('reviewer_id', user.id),
        supabase.from('referrals').select('*').or(`referrer_user_id.eq.${user.id},referred_user_id.eq.${user.id}`),
        supabase.from('support_tickets').select('*').eq('user_id', user.id),
        supabase.from('notifications').select('*').eq('user_id', user.id),
        supabase.from('wishlists').select('*').eq('user_id', user.id),
      ]);

      const exportData = {
        exported_at: new Date().toISOString(),
        user_id: user.id,
        profile: profile || null,
        orders: orders || [],
        order_items_as_producer: orderItems || [],
        product_reviews: reviews || [],
        store_reviews: storeReviews || [],
        referrals: referrals || [],
        support_tickets: tickets || [],
        notifications: notifications || [],
        wishlists: wishlists || [],
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `my-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Your data has been exported successfully');
    } catch (error) {
      toast.error('Failed to export data');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Data Privacy & Export
        </CardTitle>
        <CardDescription>
          Download a copy of all your personal data stored on this platform (GDPR compliant).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button onClick={handleExport} disabled={exporting} variant="outline" className="gap-2">
          {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          {exporting ? 'Exporting...' : 'Export My Data'}
        </Button>
      </CardContent>
    </Card>
  );
}
