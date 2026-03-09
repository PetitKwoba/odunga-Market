import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, ShoppingCart, Link2, DollarSign, Users, MessageCircle, CreditCard, PackagePlus, Truck, FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import OrderChat from '@/components/OrderChat';
import POSDashboard from '@/components/POSDashboard';
import AddToPOSDialog from '@/components/AddToPOSDialog';
import ShipmentTracking from '@/components/ShipmentTracking';
import RFQSystem from '@/components/RFQSystem';

export default function WholesalerDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string>('');
  const [posDialogOrderId, setPosDialogOrderId] = useState<string | null>(null);
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
        <TabsList className="flex-wrap">
          <TabsTrigger value="orders">My Orders</TabsTrigger>
          <TabsTrigger value="shipments"><Truck className="mr-1 h-4 w-4" /> Shipments</TabsTrigger>
          <TabsTrigger value="rfq"><FileText className="mr-1 h-4 w-4" /> RFQ</TabsTrigger>
          <TabsTrigger value="pos"><CreditCard className="mr-1 h-4 w-4" /> POS</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Orders</h2>
            <Button asChild><Link to="/products"><ShoppingCart className="mr-1 h-4 w-4" /> Browse Products</Link></Button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              {orders.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No orders yet. Start buying!</CardContent></Card>
              ) : (
                <Card><CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Chat</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {orders.map(o => (
                        <TableRow key={o.id} className={selectedOrderId === o.id ? 'bg-primary/5' : ''}>
                          <TableCell>
                            <p className="font-mono text-xs">{o.id.slice(0, 8)}...</p>
                            <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                          </TableCell>
                          <TableCell className="font-semibold">${Number(o.total_amount).toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <Badge variant={o.status === 'Completed' ? 'default' : 'outline'} className="text-xs">{o.status}</Badge>
                              <Badge variant={o.payment_status === 'paid' ? 'default' : 'outline'} className="text-xs block w-fit">{o.payment_status}</Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant={selectedOrderId === o.id ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => { setSelectedOrderId(o.id); setSelectedOrderStatus(o.status); }}
                            >
                              <MessageCircle className="h-3 w-3" />
                            </Button>
                          </TableCell>
                          <TableCell>
                            {(o.payment_status === 'paid' || o.status === 'Completed') && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setPosDialogOrderId(o.id)}
                                className="text-primary hover:text-primary"
                              >
                                <PackagePlus className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent></Card>
              )}
            </div>

            <div>
              {selectedOrderId ? (
                <OrderChat orderId={selectedOrderId} orderStatus={selectedOrderStatus} />
              ) : (
                <Card className="h-[400px] flex items-center justify-center">
                  <CardContent className="text-center text-muted-foreground">
                    <MessageCircle className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm">Select an order to chat with the producer</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="shipments" className="mt-4">
          <ShipmentTracking mode="wholesaler" />
        </TabsContent>

        <TabsContent value="rfq" className="mt-4">
          <RFQSystem mode="wholesaler" />
        </TabsContent>

        <TabsContent value="pos" className="mt-4">
          <POSDashboard />
        </TabsContent>

        <TabsContent value="referrals" className="mt-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20 text-secondary"><DollarSign className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Credits</p><p className="font-display text-2xl font-bold">${user.referral_credits.toFixed(2)}</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Referred</p><p className="font-display text-2xl font-bold">{referrals.length}</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Link2 className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Code</p><p className="font-display text-lg font-bold">{user.referral_code}</p></div></CardContent></Card>
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

      <AddToPOSDialog 
        orderId={posDialogOrderId || ''}
        ownerId={user.id}
        open={!!posDialogOrderId}
        onOpenChange={(open) => !open && setPosDialogOrderId(null)}
      />
    </div>
  );
}
