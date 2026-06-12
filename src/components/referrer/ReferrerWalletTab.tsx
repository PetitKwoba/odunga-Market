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
import { Wallet, CheckCircle2, ArrowDownToLine, Info } from 'lucide-react';
import { toast } from 'sonner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import PendingReleasesCard from '@/components/wallet/PendingReleasesCard';
import WithdrawalStatusTimeline from '@/components/wallet/WithdrawalStatusTimeline';
import ReturnPolicyDialog from '@/components/wallet/ReturnPolicyDialog';


export default function ReferrerWalletTab() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [balance, setBalance] = useState<any>(null);
  const [tx, setTx] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [bank, setBank] = useState<any>(null);
  const [form, setForm] = useState({ bank_name: '', bank_code: '', account_number: '', account_name: '', currency: 'KES' });
  const [saving, setSaving] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [minWithdrawal, setMinWithdrawal] = useState(500);

  const load = async () => {
    if (!user) return;
    const sb: any = supabase;
    const [b, t, ba, wr, s] = await Promise.all([
      sb.from('referrer_wallet_balances').select('*').eq('referrer_id', user.id).maybeSingle(),
      sb.from('referrer_wallet_transactions').select('*').eq('referrer_id', user.id).order('created_at', { ascending: false }).limit(50),
      sb.from('producer_bank_accounts').select('*').eq('producer_id', user.id).maybeSingle(),
      sb.from('withdrawal_requests').select('*').eq('user_id', user.id).eq('user_type', 'referrer').order('created_at', { ascending: false }).limit(20),
      sb.from('platform_settings').select('value').eq('key', 'referrer_min_withdrawal').maybeSingle(),
    ]);
    setBalance(b.data);
    setTx(t.data || []);
    setWithdrawals(wr.data || []);
    if (s.data?.value) setMinWithdrawal(Number(s.data.value));
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
    toast.success('Bank account verified'); load();
  };

  const withdraw = async () => {
    setWithdrawing(true);
    const { data, error } = await supabase.functions.invoke('request-withdrawal', { body: { user_type: 'referrer' } });
    setWithdrawing(false);
    if (error || data?.error) { toast.error(data?.error || error?.message || 'Withdrawal failed'); return; }
    toast.success(`Withdrawal of ${format(data.amount)} initiated`); load();
  };

  const available = Number(balance?.available_balance || 0);
  const canWithdraw = available >= minWithdrawal && bank?.is_verified;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardDescription>Available</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{format(available)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Pending (return hold)</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{format(Number(balance?.pending_balance || 0))}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Lifetime earned</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{format(Number(balance?.lifetime_earned || 0))}</div></CardContent></Card>
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="flex items-start justify-between gap-3 flex-wrap">
          <span>
            <strong>Available</strong> funds can be withdrawn anytime. <strong>Pending</strong> referral commissions are held for 7 days
            after the buyer's payment to cover the return window, then move to Available automatically.
          </span>
          <ReturnPolicyDialog windowDays={7} />
        </AlertDescription>
      </Alert>

      <PendingReleasesCard userType="referrer" />


      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><ArrowDownToLine className="h-5 w-5" /> Withdraw funds</CardTitle>
          <CardDescription>Auto payouts run monthly (1st). Withdraw on demand once your balance reaches {format(minWithdrawal)}.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <Button onClick={withdraw} disabled={!canWithdraw || withdrawing}>
            {withdrawing ? 'Processing…' : `Withdraw ${format(available)}`}
          </Button>
          {!bank?.is_verified && <span className="text-xs text-muted-foreground">Verify a bank account first.</span>}
          {bank?.is_verified && available < minWithdrawal && <span className="text-xs text-muted-foreground">Minimum {format(minWithdrawal)}.</span>}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> Payout Bank Account</CardTitle>
          <CardDescription>{bank?.is_verified && <Badge variant="default" className="ml-1"><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</Badge>}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 max-w-xl">
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label>Bank name</Label><Input value={form.bank_name} onChange={e => setForm({ ...form, bank_name: e.target.value })} /></div>
            <div><Label>Paystack bank code</Label><Input value={form.bank_code} onChange={e => setForm({ ...form, bank_code: e.target.value })} /></div>
            <div><Label>Account number / phone</Label><Input value={form.account_number} onChange={e => setForm({ ...form, account_number: e.target.value })} /></div>
            <div><Label>Account holder name</Label><Input value={form.account_name} onChange={e => setForm({ ...form, account_name: e.target.value })} /></div>
            <div><Label>Currency</Label><Input value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} /></div>
          </div>
          <Button onClick={saveBank} disabled={saving}>{saving ? 'Verifying…' : 'Save & verify with Paystack'}</Button>
        </CardContent>
      </Card>

      {withdrawals.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Withdrawal history</CardTitle><CardDescription>Track each withdrawal from request through payout.</CardDescription></CardHeader>
          <CardContent className="space-y-4">
            {withdrawals.map((w: any) => (
              <div key={w.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{format(Number(w.amount))} {w.currency}</div>
                  <span className="text-xs font-mono text-muted-foreground">{w.paystack_reference || w.id.slice(0, 8)}</span>
                </div>
                <WithdrawalStatusTimeline
                  status={w.status}
                  createdAt={w.created_at}
                  processedAt={w.processed_at}
                  failureReason={w.failure_reason}
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}


      <Card>
        <CardHeader><CardTitle>Recent transactions</CardTitle></CardHeader>
        <CardContent>
          {tx.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Type</TableHead><TableHead>Description</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
              <TableBody>
                {tx.map((t: any) => (
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
