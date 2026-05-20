import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function PayoutsManagement() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<any[]>([]);
  const [running, setRunning] = useState(false);

  const load = async () => {
    const [w, p] = await Promise.all([
      supabase.from('wallet_balances').select('*').order('available_balance', { ascending: false }),
      supabase.from('payouts').select('*').order('created_at', { ascending: false }).limit(100),
    ]);
    setWallets(w.data || []);
    setPayouts(p.data || []);
  };

  useEffect(() => { load(); }, []);

  const runBatch = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke('weekly-payouts');
    setRunning(false);
    if (error) toast.error(error.message);
    else { toast.success(`Processed ${data?.processed ?? 0} payouts`); load(); }
  };

  const totalPending = wallets.reduce((s, w) => s + Number(w.available_balance || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><CardHeader className="pb-2"><CardDescription>Producers with balance</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold">{wallets.filter(w => Number(w.available_balance) > 0).length}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Total available to pay out</CardDescription></CardHeader>
          <CardContent><div className="text-2xl font-bold text-primary">{totalPending.toFixed(2)}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardDescription>Action</CardDescription></CardHeader>
          <CardContent>
            <Button onClick={runBatch} disabled={running} className="w-full">
              {running ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Play className="h-4 w-4 mr-2" />}
              Run weekly payout now
            </Button>
          </CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Wallet Balances</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Producer</TableHead><TableHead>Available</TableHead><TableHead>Pending</TableHead><TableHead>Lifetime Earned</TableHead><TableHead>Lifetime Paid Out</TableHead></TableRow></TableHeader>
            <TableBody>
              {wallets.map(w => (
                <TableRow key={w.id}>
                  <TableCell className="font-mono text-xs">{w.producer_id.slice(0, 8)}</TableCell>
                  <TableCell className="font-medium text-primary">{Number(w.available_balance).toFixed(2)} {w.currency}</TableCell>
                  <TableCell>{Number(w.pending_balance).toFixed(2)}</TableCell>
                  <TableCell>{Number(w.lifetime_earned).toFixed(2)}</TableCell>
                  <TableCell>{Number(w.lifetime_paid_out).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Recent Payouts</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader><TableRow><TableHead>Date</TableHead><TableHead>Producer</TableHead><TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead>Transfer</TableHead></TableRow></TableHeader>
            <TableBody>
              {payouts.map(p => (
                <TableRow key={p.id}>
                  <TableCell className="text-xs">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="font-mono text-xs">{String(p.producer_id).slice(0, 8)}</TableCell>
                  <TableCell>{Number(p.net_amount).toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge variant={p.status === 'paid' ? 'default' : p.status === 'failed' ? 'destructive' : 'outline'}>{p.status}</Badge>
                    {p.failure_reason && <div className="text-xs text-destructive mt-1">{p.failure_reason}</div>}
                  </TableCell>
                  <TableCell className="text-xs font-mono">{p.paystack_transfer_code || '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
