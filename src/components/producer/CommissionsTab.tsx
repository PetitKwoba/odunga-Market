import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Percent, Info } from 'lucide-react';

export default function CommissionsTab() {
  const { user } = useAuth();
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('3');
  const [saving, setSaving] = useState(false);
  const [systemRate, setSystemRate] = useState<{ type: string; value: number } | null>(null);

  useEffect(() => {
    if (!user) return;
    const sb: any = supabase;
    Promise.all([
      sb.from('producer_profiles')
        .select('commission_type, commission_value')
        .eq('user_id', user.id).maybeSingle(),
      sb.from('platform_settings').select('key, value')
        .in('key', ['system_commission_type', 'system_commission_value']),
    ]).then(([p, s]: any[]) => {
      if (p.data) {
        setType((p.data.commission_type as any) || 'percentage');
        setValue(String(p.data.commission_value ?? 3));
      }
      if (s.data) {
        const m: any = {};
        s.data.forEach((r: any) => { m[r.key] = r.value; });
        setSystemRate({
          type: String(m.system_commission_type || 'percentage').replace(/"/g, ''),
          value: Number(m.system_commission_value ?? 5),
        });
      }
    });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('producer_profiles').update({
      commission_type: type,
      commission_value: Number(value) || 0,
      commission_scope: 'referral',
    }).eq('user_id', user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Referrer commission saved');
  };

  return (
    <div className="space-y-4">
      {systemRate && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Platform system commission is <strong>
              {systemRate.type === 'percentage' ? `${systemRate.value}%` : `${systemRate.value} per unit`}
            </strong> of every sale. This is set by the platform admin and cannot be changed by producers.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5" /> Referrer Commission</CardTitle>
          <CardDescription>
            This is what you pay referrers who bring buyers to your products. It's deducted from your sale alongside the platform commission. You can override it per product when editing a product.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 max-w-xl">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage of sale</SelectItem>
                  <SelectItem value="fixed">Fixed amount per unit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{type === 'percentage' ? 'Percent (%)' : 'Amount per unit'}</Label>
              <Input type="number" step="0.01" value={value} onChange={e => setValue(e.target.value)} />
            </div>
          </div>
          <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save referrer commission'}</Button>
        </CardContent>
      </Card>
    </div>
  );
}
