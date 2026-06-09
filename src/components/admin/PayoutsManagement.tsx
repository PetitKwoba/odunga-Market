import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';

const SETTING_KEYS = [
  'system_commission_type', 'system_commission_value',
  'referrer_commission_type', 'referrer_commission_value',
  'return_window_days', 'producer_min_withdrawal', 'referrer_min_withdrawal',
];

export default function PayoutsManagement() {
  const [producerWallets, setProducerWallets] = useState<any[]>([]);
  const [referrerWallets, setReferrerWallets] = useState<any[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [running, setRunning] = useState<string | null>(null);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  const load = async () => {
    const sb: any = supabase;
    const [pw, rw, wr, p, s] = await Promise.all([
      sb.from('wallet_balances').select('*').order('available_balance', { ascending: false }),
      sb.from('referrer_wallet_balances').select('*').order('available_balance', { ascending: false }),
      sb.from('withdrawal_requests').select('*').order('created_at', { ascending: false }).limit(100),
      sb.from('payouts').select('*').order('created_at', { ascending: false }).limit(100),
      sb.from('platform_settings').select('key, value').in('key', SETTING_KEYS),
    ]);
    setProducerWallets(pw.data || []);
    setReferrerWallets(rw.data || []);
    setWithdrawals(wr.data || []);
    setPayouts(p.data || []);
    const map: Record<string, any> = {};
    (s.data || []).forEach((row: any) => {
      const v = row.value;
      map[row.key] = typeof v === 'string' ? v : v;
    });
    setSettings(map);
  };

  useEffect(() => { load(); }, []);

  const runFn = async (name: string, label: string) => {
    setRunning(name);
    const { data, error } = await supabase.functions.invoke(name);
    setRunning(null);
    if (error) toast.error(error.message);
    else { toast.success(`${label}: processed ${data?.processed ?? data?.released ?? 0}`); load(); }
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const sb: any = supabase;
    for (const k of SETTING_KEYS) {
      if (settings[k] === undefined) continue;
      await sb.from('platform_settings').update({ value: settings[k] }).eq('key', k);
    }
    setSavingSettings(false);
    toast.success('Settings saved'); load();
  };

  const setVal = (k: string, v: any) => setSettings(s => ({ ...s, [k]: v }));

  const producerTotal = producerWallets.reduce((s, w) => s + Number(w.available_balance || 0), 0);
  const referrerTotal = referrerWallets.reduce((s, w) => s + Number(w.available_balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardDescription>Producer balance</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{producerTotal.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Referrer balance</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{referrerTotal.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Pending withdrawals</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{withdrawals.filter(w => ['pending', 'processing'].includes(w.status)).length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Held funds release</CardDescription></CardHeader>
          <CardContent><Button size="sm" variant="outline" onClick={() => runFn('release-held-funds', 'Released')} disabled={running === 'release-held-funds'}>
            {running === 'release-held-funds' ? <RefreshCw className="h-4 w-4 animate-spin" /> : 'Run now'}
          </Button></CardContent></Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => runFn('biweekly-producer-payouts', 'Producer payouts')} disabled={!!running}>
          <Play className="h-4 w-4 mr-2" />Run biweekly producer payouts
        </Button>
        <Button onClick={() => runFn('monthly-referrer-payouts', 'Referrer payouts')} disabled={!!running} variant="secondary">
          <Play className="h-4 w-4 mr-2" />Run monthly referrer payouts
        </Button>
      </div>

      <Tabs defaultValue="producers">
        <TabsList>
          <TabsTrigger value="producers">Producer wallets</TabsTrigger>
          <TabsTrigger value="referrers">Referrer wallets</TabsTrigger>
          <TabsTrigger value="withdrawals">Withdrawals</TabsTrigger>
          <TabsTrigger value="payouts">Batch payouts</TabsTrigger>
          <TabsTrigger value="settings">Commissions & limits</TabsTrigger>
        </TabsList>

        <TabsContent value="producers">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Producer</TableHead><TableHead>Available</TableHead><TableHead>Pending</TableHead><TableHead>Lifetime earned</TableHead><TableHead>Paid out</TableHead></TableRow></TableHeader>
              <TableBody>{producerWallets.map(w => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono text-xs">{w.producer_id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium text-primary">{Number(w.available_balance).toFixed(2)} {w.currency}</TableCell>
                  <TableCell>{Number(w.pending_balance).toFixed(2)}</TableCell>
                  <TableCell>{Number(w.lifetime_earned).toFixed(2)}</TableCell>
                  <TableCell>{Number(w.lifetime_paid_out).toFixed(2)}</TableCell>
                </TableRow>))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="referrers">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Referrer</TableHead><TableHead>Available</TableHead><TableHead>Pending</TableHead><TableHead>Lifetime earned</TableHead><TableHead>Paid out</TableHead></TableRow></TableHeader>
              <TableBody>{referrerWallets.map(w => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono text-xs">{w.referrer_id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium text-primary">{Number(w.available_balance).toFixed(2)} {w.currency}</TableCell>
                  <TableCell>{Number(w.pending_balance).toFixed(2)}</TableCell>
                  <TableCell>{Number(w.lifetime_earned).toFixed(2)}</TableCell>
                  <TableCell>{Number(w.lifetime_paid_out).toFixed(2)}</TableCell>
                </TableRow>))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="withdrawals">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>User</TableHead><TableHead>Type</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Ref</TableHead></TableRow></TableHeader>
              <TableBody>{withdrawals.map(w => (
                <TableRow key={w.id}>
                  <TableCell className="text-xs">{new Date(w.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-mono text-xs">{w.user_id.slice(0, 8)}</TableCell>
                  <TableCell><Badge variant="outline">{w.user_type}</Badge></TableCell>
                  <TableCell>{Number(w.amount).toFixed(2)} {w.currency}</TableCell>
                  <TableCell><Badge variant={w.status === 'paid' ? 'default' : w.status === 'failed' ? 'destructive' : 'outline'}>{w.status}</Badge>{w.failure_reason && <div className="text-xs text-destructive">{w.failure_reason}</div>}</TableCell>
                  <TableCell className="font-mono text-xs">{w.paystack_reference || '—'}</TableCell>
                </TableRow>))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card><CardContent className="pt-6">
            <Table>
              <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Producer</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Transfer</TableHead></TableRow></TableHeader>
              <TableBody>{payouts.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono text-xs">{String(p.producer_id).slice(0, 8)}</TableCell>
                  <TableCell>{Number(p.net_amount).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={p.status === 'paid' ? 'default' : p.status === 'failed' ? 'destructive' : 'outline'}>{p.status}</Badge>{p.failure_reason && <div className="text-xs text-destructive">{p.failure_reason}</div>}</TableCell>
                  <TableCell className="text-xs font-mono">{p.paystack_transfer_code || '—'}</TableCell>
                </TableRow>))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader><CardTitle>Commissions & withdrawal limits</CardTitle>
              <CardDescription>System (platform) commission applies to every order. Referrer commission applies only when a referral code is used.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 max-w-2xl">
              <div className="grid grid-cols-2 gap-3">
                <div><Label>System commission type</Label>
                  <select className="w-full h-10 border rounded-md px-3 bg-background" value={String(settings.system_commission_type || 'percentage').replace(/"/g, '')} onChange={e => setVal('system_commission_type', e.target.value)}>
                    <option value="percentage">Percentage</option><option value="fixed">Fixed per unit</option>
                  </select></div>
                <div><Label>System commission value</Label>
                  <Input type="number" step="0.01" value={settings.system_commission_value ?? 5} onChange={e => setVal('system_commission_value', Number(e.target.value))} /></div>
                <div><Label>Referrer commission type</Label>
                  <select className="w-full h-10 border rounded-md px-3 bg-background" value={String(settings.referrer_commission_type || 'percentage').replace(/"/g, '')} onChange={e => setVal('referrer_commission_type', e.target.value)}>
                    <option value="percentage">Percentage</option><option value="fixed">Fixed per unit</option>
                  </select></div>
                <div><Label>Referrer commission value</Label>
                  <Input type="number" step="0.01" value={settings.referrer_commission_value ?? 3} onChange={e => setVal('referrer_commission_value', Number(e.target.value))} /></div>
                <div><Label>Return window (days)</Label>
                  <Input type="number" value={settings.return_window_days ?? 7} onChange={e => setVal('return_window_days', Number(e.target.value))} /></div>
                <div><Label>Producer min withdrawal</Label>
                  <Input type="number" value={settings.producer_min_withdrawal ?? 1000} onChange={e => setVal('producer_min_withdrawal', Number(e.target.value))} /></div>
                <div><Label>Referrer min withdrawal</Label>
                  <Input type="number" value={settings.referrer_min_withdrawal ?? 500} onChange={e => setVal('referrer_min_withdrawal', Number(e.target.value))} /></div>
              </div>
              <Button onClick={saveSettings} disabled={savingSettings}><Save className="h-4 w-4 mr-2" />{savingSettings ? 'Saving…' : 'Save settings'}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
