import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Percent } from 'lucide-react';

export default function CommissionsTab() {
  const { user } = useAuth();
  const [type, setType] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('5');
  const [scope, setScope] = useState<'platform' | 'referral' | 'both'>('platform');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from('producer_profiles')
      .select('commission_type, commission_value, commission_scope')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setType((data.commission_type as any) || 'percentage');
          setValue(String(data.commission_value ?? 5));
          setScope((data.commission_scope as any) || 'platform');
        }
      });
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from('producer_profiles').update({
      commission_type: type,
      commission_value: Number(value) || 0,
      commission_scope: scope,
    }).eq('user_id', user.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success('Storewide commission saved');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Percent className="h-5 w-5" /> Storewide Commission</CardTitle>
        <CardDescription>
          Default commission applied to all your products. You can override this per product when editing a product.
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
        <div className="space-y-1.5">
          <Label>Who is the commission paid to?</Label>
          <Select value={scope} onValueChange={(v: any) => setScope(v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="platform">Platform only</SelectItem>
              <SelectItem value="referral">Referrers only</SelectItem>
              <SelectItem value="both">Split between platform & referrers</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
      </CardContent>
    </Card>
  );
}
