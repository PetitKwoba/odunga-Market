import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, ShoppingCart, Link2, DollarSign, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';

export default function WholesalerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('orders').select('*').eq('wholesaler_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setOrders(data);
    });
    supabase.from('referrals').select('*').eq('referrer_user_id', user.id).then(({ data }) => {
      if (data) setReferrals(data);
    });
  }, [user]);

  if (!user) return null;

  const referralLink = `${window.location.origin}/signup?ref=${user.referral_code}`;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Wholesaler Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Welcome back, {user.name}</p>

      <Tabs defaultValue="orders" className="mt-6">
        <TabsList>
          <TabsTrigger value="orders">My Orders</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Orders</h2>
            <Button asChild><Link to="/products"><ShoppingCart className="mr-1 h-4 w-4" /> Browse Products</Link></Button>
          </div>
          {orders.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No orders yet. Start buying!</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Order ID</TableHead><TableHead>Date</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Payment</TableHead></TableRow></TableHeader>
                <TableBody>
                  {orders.map(o => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}...</TableCell>
                      <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-semibold">${Number(o.total_amount).toFixed(2)}</TableCell>
                      <TableCell><Badge variant={o.status === 'Completed' ? 'default' : 'outline'}>{o.status}</Badge></TableCell>
                      <TableCell><Badge variant={o.payment_status === 'paid' ? 'default' : 'outline'}>{o.payment_status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="referrals" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20 text-secondary"><DollarSign className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Credits</p><p className="font-display text-2xl font-bold">${user.referral_credits.toFixed(2)}</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Referred</p><p className="font-display text-2xl font-bold">{referrals.length}</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20 text-success"><Link2 className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Code</p><p className="font-display text-lg font-bold">{user.referral_code}</p></div></CardContent></Card>
          </div>
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Your Referral Link</CardTitle><CardDescription>Share and earn when referrals complete their first order.</CardDescription></CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm truncate">{referralLink}</code>
                <Button onClick={() => { navigator.clipboard.writeText(referralLink); toast.success('Copied!'); }} size="sm" variant="outline"><Copy className="mr-1 h-4 w-4" /> Copy</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
