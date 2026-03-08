import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Settings, Wallet, Truck, CalendarCheck, Info, Users, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import StoreTeamTab from '@/components/StoreTeamTab';
import ProductEditDialog from '@/components/ProductEditDialog';

const PLATFORM_FEE_PERCENT = 5;

export default function ProducerDashboard() {
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [rewardType, setRewardType] = useState<'fixed' | 'percentage'>('fixed');
  const [rewardValue, setRewardValue] = useState('0');

  useEffect(() => {
    if (!user) return;
    // Fetch products
    supabase.from('products').select('*').eq('producer_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setProducts(data);
    });
    // Fetch orders with this producer's items
    supabase.from('order_items').select('*, orders(*)').eq('producer_id', user.id).then(({ data }) => {
      if (data) {
        const orderMap = new Map<string, any>();
        data.forEach((item: any) => {
          if (item.orders && !orderMap.has(item.orders.id)) {
            orderMap.set(item.orders.id, { ...item.orders, items: [] });
          }
          orderMap.get(item.orders?.id)?.items.push(item);
        });
        setOrders(Array.from(orderMap.values()));
      }
    });
    // Fetch producer profile for referral settings
    supabase.from('producer_profiles').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        setRewardType(data.referral_reward_type as 'fixed' | 'percentage');
        setRewardValue(String(data.referral_reward_value));
      }
    });
  }, [user]);

  if (!user) return null;

  const refreshProducts = async () => {
    const { data } = await supabase.from('products').select('*').eq('producer_id', user.id).order('created_at', { ascending: false });
    if (data) setProducts(data);
  };

  const saveReward = async () => {
    const { error } = await supabase.from('producer_profiles').update({
      referral_reward_type: rewardType,
      referral_reward_value: parseFloat(rewardValue) || 0,
    }).eq('user_id', user.id);
    if (error) toast.error('Failed to save: ' + error.message);
    else toast.success(`Referral reward updated`);
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await supabase.from('orders').update({ status }).eq('id', orderId);
    if (error) toast.error('Failed to update: ' + error.message);
    else {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
      toast.success(`Order status updated to ${status}`);
    }
  };

  const totalRevenue = orders.reduce((s, o) => s + (o.total_amount || 0), 0);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Producer Dashboard</h1>
      <p className="mt-1 text-muted-foreground">{user.business_name || user.name}</p>

      <Card className="mt-4 border-primary/30 bg-primary/5">
        <CardContent className="flex items-start gap-3 p-4">
          <Info className="h-5 w-5 mt-0.5 text-primary shrink-0" />
          <div className="text-sm">
            <p className="font-medium text-foreground">Payment & Logistics Reminder</p>
            <ul className="mt-1 space-y-0.5 text-muted-foreground">
              <li>• Payouts are sent every <strong>Monday</strong>, minus referral fees and a {PLATFORM_FEE_PERCENT}% platform maintenance fee.</li>
              <li>• You are responsible for <strong>arranging logistics and shipping</strong> for all orders.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="products" className="mt-6">
        <TabsList>
          <TabsTrigger value="products">My Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="team"><Users className="mr-1 h-4 w-4" /> Team</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="referrals">Referral Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Products ({products.length})</h2>
            <Button onClick={() => setAddOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add Product</Button>
          </div>

          {products.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No products yet. Add your first product!</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map(p => (
                <Card key={p.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => { setEditProduct(p); setEditOpen(true); }}>
                  <CardContent className="p-4">
                    {p.images && p.images.length > 0 && p.images[0] ? (
                      <div className="mb-3 h-32 w-full rounded-md overflow-hidden bg-muted">
                        <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" />
                      </div>
                    ) : (
                      <div className="mb-3 flex h-32 w-full items-center justify-center rounded-md bg-muted text-muted-foreground/40 text-xs">No image</div>
                    )}
                    <div className="flex items-start justify-between">
                      <div><h3 className="font-display font-semibold">{p.name}</h3><p className="text-xs text-muted-foreground">{p.category}</p></div>
                      <Badge variant={p.is_active ? 'default' : 'outline'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <div className="mt-3 flex gap-4 text-sm">
                      <span>${Number(p.base_price).toFixed(2)}/unit</span>
                      <span>MOQ: {p.moq}</span>
                      <span>Stock: {p.stock_quantity}</span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
                      <Truck className="h-3 w-3" /> Lead time: {p.lead_time_days} days
                    </p>
                    <Button variant="outline" size="sm" className="mt-3 w-full" onClick={e => { e.stopPropagation(); setEditProduct(p); setEditOpen(true); }}>
                      <Pencil className="mr-1 h-3 w-3" /> Edit Product
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <ProductEditDialog product={null} open={addOpen} onOpenChange={setAddOpen} onSaved={refreshProducts} isNew producerId={user.id} />
          <ProductEditDialog product={editProduct} open={editOpen} onOpenChange={setEditOpen} onSaved={refreshProducts} />
        </TabsContent>

        <TabsContent value="orders" className="mt-4 space-y-4">
          <h2 className="font-display text-xl font-semibold">Orders</h2>
          {orders.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No orders yet.</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Date</TableHead><TableHead>Action</TableHead></TableRow></TableHeader>
                <TableBody>
                  {orders.map(o => (
                    <TableRow key={o.id}>
                      <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}...</TableCell>
                      <TableCell className="font-semibold">${Number(o.total_amount).toFixed(2)}</TableCell>
                      <TableCell><Badge variant={o.status === 'Completed' ? 'default' : 'outline'}>{o.status}</Badge></TableCell>
                      <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Select defaultValue={o.status} onValueChange={(v) => updateOrderStatus(o.id, v)}>
                          <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {['Pending', 'Confirmed', 'Shipped', 'Completed', 'Cancelled'].map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <StoreTeamTab />
        </TabsContent>

        <TabsContent value="payouts" className="mt-4 space-y-4">
          <h2 className="font-display text-xl font-semibold">Payout Schedule</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Wallet className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Pending Payout</p><p className="font-display text-xl font-bold">${(totalRevenue * (1 - PLATFORM_FEE_PERCENT / 100)).toFixed(2)}</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><CalendarCheck className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Next Payout</p><p className="font-display text-xl font-bold">Monday</p></div></CardContent></Card>
            <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Truck className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Platform Fee</p><p className="font-display text-xl font-bold">{PLATFORM_FEE_PERCENT}%</p></div></CardContent></Card>
          </div>
        </TabsContent>

        <TabsContent value="referrals" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2"><Settings className="h-5 w-5" /> Referral Reward Settings</CardTitle>
              <CardDescription>Set the reward referrers earn for orders with your products.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Reward Type</Label>
                  <Select value={rewardType} onValueChange={(v: 'fixed' | 'percentage') => setRewardType(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="fixed">Fixed Amount ($)</SelectItem><SelectItem value="percentage">Percentage (%)</SelectItem></SelectContent></Select>
                </div>
                <div className="space-y-2"><Label>Reward Value</Label><Input type="number" value={rewardValue} onChange={e => setRewardValue(e.target.value)} /></div>
              </div>
              <Button onClick={saveReward}>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
