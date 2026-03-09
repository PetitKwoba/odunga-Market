import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Bell, Mail, Smartphone } from 'lucide-react';

interface Preferences {
  email_orders: boolean;
  email_shipments: boolean;
  email_payments: boolean;
  email_rfq: boolean;
  email_promotions: boolean;
  in_app_orders: boolean;
  in_app_shipments: boolean;
  in_app_payments: boolean;
  in_app_rfq: boolean;
  in_app_promotions: boolean;
}

const defaultPrefs: Preferences = {
  email_orders: true, email_shipments: true, email_payments: true, email_rfq: true, email_promotions: false,
  in_app_orders: true, in_app_shipments: true, in_app_payments: true, in_app_rfq: true, in_app_promotions: true,
};

const categories = [
  { key: 'orders', label: 'Orders', description: 'Order confirmations, status updates' },
  { key: 'shipments', label: 'Shipments', description: 'Shipping updates, delivery notifications' },
  { key: 'payments', label: 'Payments', description: 'Payment confirmations, payout notifications' },
  { key: 'rfq', label: 'Quotes & RFQ', description: 'New quotes, RFQ responses' },
  { key: 'promotions', label: 'Promotions', description: 'Discounts, new features, newsletters' },
];

export default function NotificationPreferences() {
  const { user } = useAuth();
  const [prefs, setPrefs] = useState<Preferences>(defaultPrefs);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('notification_preferences').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        setPrefs({
          email_orders: data.email_orders,
          email_shipments: data.email_shipments,
          email_payments: data.email_payments,
          email_rfq: data.email_rfq,
          email_promotions: data.email_promotions,
          in_app_orders: data.in_app_orders,
          in_app_shipments: data.in_app_shipments,
          in_app_payments: data.in_app_payments,
          in_app_rfq: data.in_app_rfq,
          in_app_promotions: data.in_app_promotions,
        });
      }
      setLoaded(true);
    });
  }, [user]);

  const toggle = (key: keyof Preferences) => {
    setPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('notification_preferences').upsert({
      user_id: user.id,
      ...prefs,
    }, { onConflict: 'user_id' });
    setSaving(false);
    if (error) toast.error('Failed to save preferences');
    else toast.success('Notification preferences saved');
  };

  if (!loaded) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2"><Bell className="h-5 w-5" /> Notification Preferences</CardTitle>
        <CardDescription>Choose how you want to be notified</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-4 pb-2">
          <div />
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground"><Mail className="h-3.5 w-3.5" /> Email</div>
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground"><Smartphone className="h-3.5 w-3.5" /> In-App</div>
        </div>
        {categories.map((cat, i) => (
          <div key={cat.key}>
            {i > 0 && <Separator className="mb-4" />}
            <div className="grid grid-cols-3 items-center gap-4">
              <div>
                <Label className="font-medium">{cat.label}</Label>
                <p className="text-xs text-muted-foreground">{cat.description}</p>
              </div>
              <div className="flex justify-center">
                <Switch checked={prefs[`email_${cat.key}` as keyof Preferences] as boolean} onCheckedChange={() => toggle(`email_${cat.key}` as keyof Preferences)} />
              </div>
              <div className="flex justify-center">
                <Switch checked={prefs[`in_app_${cat.key}` as keyof Preferences] as boolean} onCheckedChange={() => toggle(`in_app_${cat.key}` as keyof Preferences)} />
              </div>
            </div>
          </div>
        ))}
        <Separator />
        <Button onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Save Preferences'}</Button>
      </CardContent>
    </Card>
  );
}
