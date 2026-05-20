import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useCurrency } from '@/lib/currency-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Wallet, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export default function WalletTab() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [balance, setBalance] = useState<any>(null);
  const [tx, setTx] = useState<any[]>([]);
  const [bank, setBank] = useState<any>(null);
  const [form, setForm] = useState({ bank_name: '', bank_code: '', account_number: '', account_name: '', currency: 'KES' });
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!user) return;
    const [b, t, ba] = await Promise.all([
      supabase.from('wallet_balances').select('*').eq('producer_id', user.id).maybeSingle(),
      supabase.from('wallet_transactions').select('*').eq('producer_id', user.id).order('created_at', { ascending: false }).limit(50),
      supabase.from('producer_bank_accounts').select('*').eq('producer_id', user.id).maybeSingle(),
    ]);
    setBalance(b.data);
    setTx(t.data || []);
    if (ba.data) {
      setBank(ba.data);
      setForm({
        bank_name: ba.data.bank_name, bank_code: ba.data.bank_code,
        account_number: ba.data.account_number, account_name: ba.data.account_name,
        currency: ba.data.currency,
      });
    }
  };

  useEffect(() => { load(); }, [user]);

  const saveBank = async () => {
    setSaving(true);
    const { data, error } = await supabase.functions.invoke('paystack-create-recipient', { body: form });
    setSaving(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || 'Failed'); return; }
    toast.success('Bank account verified');
    load();
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardDescription>Available</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{format(Number(balance?.available_balance || 0))}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Pending</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{format(Number(balance?.pending_balance || 0))}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardDescription>Lifetime paid out</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{format(Number(balance?.lifetime_paid_out || 0))}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Payout Bank Account</CardTitle>
          <CardDescription>
            Required for weekly Monday payouts. {bank?.is_verified && <Badge variant="default" className="ml-1"><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</Badge>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 max-w-xl">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Bank name</Label><Input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} placeholder="e.g. M-Pesa, Equity Bank" /></div>
            <div><Label>Paystack bank code</Label><Input value={form.bank_code} onChange={e => setForm({ ...form, bank_code: e.target.value })} placeholder="e.g. MPESA" /></div>
            <div><Label>Account number / phone</Label><Input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} /></div>
            <div><Label>Account holder name</Label><Input value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} /></div>
            <div><Label>Currency</Label><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
          </div>
          <Button onClick={saveBank} disabled={saving}>{saving ? 'Verifying…' : 'Save & verify with Paystack'}</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent transactions</CardTitle></CardHeader>
        <CardContent>
          {tx.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {tx.map(t => (
                  <TableRow key={t.id}>
                    <TableCell className="text-xs">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                    <TableCell><Badge variant="outline">{t.type}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.description}</TableCell>
                    <TableCell className={`text-right font-medium ${Number(t.amount) < 0 ? 'text-destructive' : 'text-primary'}`}>{format(Math.abs(Number(t.amount)))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
