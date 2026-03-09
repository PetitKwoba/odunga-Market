import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCurrency } from '@/lib/currency-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Settings, Wallet, Truck, CalendarCheck, Info, Users, Pencil, Clock, CheckCircle2, DollarSign, TrendingUp, MessageCircle, CreditCard, Package, FileText, RotateCcw, Sparkles, Percent, BarChart3, Mail, Upload } from 'lucide-react';
import BulkCSVUpload from '@/components/BulkCSVUpload';
import { toast } from 'sonner';
import StoreTeamTab from '@/components/StoreTeamTab';
import ProductEditDialog from '@/components/ProductEditDialog';
import OrderChat from '@/components/OrderChat';
import POSDashboard from '@/components/POSDashboard';
import InventoryManagement from '@/components/InventoryManagement';
import ShipmentTracking from '@/components/ShipmentTracking';
import RFQSystem from '@/components/RFQSystem';
import ReturnsManagement from '@/components/ReturnsManagement';
import B2BInvoicing from '@/components/B2BInvoicing';
import DemandForecast from '@/components/DemandForecast';
import DiscountManager from '@/components/DiscountManager';
import DirectMessaging from '@/components/DirectMessaging';
import ProducerAnalytics from '@/components/ProducerAnalytics';
import { Separator } from '@/components/ui/separator';

const PLATFORM_FEE_PERCENT = 5;

function getNextMonday(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  const next = new Date(now);
  next.setDate(now.getDate() + diff);
  next.setHours(9, 0, 0, 0);
  return next;
}

// Currency formatting now uses CurrencyProvider via useCurrency()

function daysUntilMonday(): number {
  const now = new Date();
  const day = now.getDay();
  return day === 0 ? 1 : day === 1 ? 0 : 8 - day;
}

interface Payout {
  id: string;
  order_id: string;
  gross_amount: number;
  platform_fee: number;
  referral_fee: number;
  net_amount: number;
  status: string;
  paid_at: string | null;
  created_at: string;
}

export default function ProducerDashboard() {
  const { user } = useAuth();
  const { format: formatCurrency } = useCurrency();
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [rewardType, setRewardType] = useState<'fixed' | 'percentage'>('fixed');
  const [rewardValue, setRewardValue] = useState('0');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderStatus, setSelectedOrderStatus] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    supabase.from('products').select('*').eq('producer_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setProducts(data);
    });
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
    supabase.from('producer_profiles').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        setRewardType(data.referral_reward_type as 'fixed' | 'percentage');
        setRewardValue(String(data.referral_reward_value));
      }
    });
    supabase.from('payouts').select('*').eq('producer_id', user.id).order('created_at', { ascending: false }).then(({ data }) => {
      if (data) setPayouts(data as Payout[]);
    });
  }, [user]);

  const payoutStats = useMemo(() => {
    const pending = payouts.filter(p => p.status === 'pending');
    const paid = payouts.filter(p => p.status === 'paid');
    return {
      pendingAmount: pending.reduce((s, p) => s + Number(p.net_amount), 0),
      pendingCount: pending.length,
      paidAmount: paid.reduce((s, p) => s + Number(p.net_amount), 0),
      paidCount: paid.length,
      totalGross: payouts.reduce((s, p) => s + Number(p.gross_amount), 0),
      totalFees: payouts.reduce((s, p) => s + Number(p.platform_fee) + Number(p.referral_fee), 0),
    };
  }, [payouts]);

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

  const nextMonday = getNextMonday();
  const daysLeft = daysUntilMonday();

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
        <TabsList className="flex-wrap">
          <TabsTrigger value="products">My Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="analytics"><BarChart3 className="mr-1 h-4 w-4" /> Analytics</TabsTrigger>
          <TabsTrigger value="messages"><Mail className="mr-1 h-4 w-4" /> Messages</TabsTrigger>
          <TabsTrigger value="inventory"><Package className="mr-1 h-4 w-4" /> Inventory</TabsTrigger>
          <TabsTrigger value="shipments"><Truck className="mr-1 h-4 w-4" /> Shipments</TabsTrigger>
          <TabsTrigger value="rfq"><FileText className="mr-1 h-4 w-4" /> RFQ</TabsTrigger>
          <TabsTrigger value="returns"><RotateCcw className="mr-1 h-4 w-4" /> Returns</TabsTrigger>
          <TabsTrigger value="invoices"><DollarSign className="mr-1 h-4 w-4" /> Invoices</TabsTrigger>
          <TabsTrigger value="forecast"><Sparkles className="mr-1 h-4 w-4" /> AI Forecast</TabsTrigger>
          <TabsTrigger value="discounts"><Percent className="mr-1 h-4 w-4" /> Discounts</TabsTrigger>
          <TabsTrigger value="pos"><CreditCard className="mr-1 h-4 w-4" /> POS</TabsTrigger>
          <TabsTrigger value="team"><Users className="mr-1 h-4 w-4" /> Team</TabsTrigger>
          <TabsTrigger value="payouts"><Wallet className="mr-1 h-4 w-4" /> Payouts</TabsTrigger>
          <TabsTrigger value="referrals">Referral Settings</TabsTrigger>
        </TabsList>

        {/* ─── PRODUCTS TAB ─── */}
        <TabsContent value="products" className="mt-4 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="font-display text-xl font-semibold">Products ({products.length})</h2>
            <Button onClick={() => setAddOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add Product</Button>
          </div>
          <BulkCSVUpload onComplete={refreshProducts} />
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

        {/* ─── ORDERS TAB ─── */}
        <TabsContent value="orders" className="mt-4 space-y-4">
          <h2 className="font-display text-xl font-semibold">Orders</h2>
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              {orders.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">No orders yet.</CardContent></Card>
              ) : (
                <Card><CardContent className="p-0">
                  <Table>
                    <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Action</TableHead><TableHead>Chat</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {orders.map(o => (
                        <TableRow key={o.id} className={selectedOrderId === o.id ? 'bg-primary/5' : ''}>
                          <TableCell>
                            <p className="font-mono text-xs">{o.id.slice(0, 8)}...</p>
                            <p className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</p>
                          </TableCell>
                          <TableCell className="font-semibold">${Number(o.total_amount).toFixed(2)}</TableCell>
                          <TableCell><Badge variant={o.status === 'Completed' ? 'default' : 'outline'}>{o.status}</Badge></TableCell>
                          <TableCell>
                            <Select defaultValue={o.status} onValueChange={(v) => updateOrderStatus(o.id, v)}>
                              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {['Pending', 'Confirmed', 'Shipped', 'Completed', 'Cancelled'].map(s => (
                                  <SelectItem key={s} value={s}>{s}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
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
                    <p className="text-sm">Select an order to chat with the wholesaler</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ─── ANALYTICS TAB ─── */}
        <TabsContent value="analytics" className="mt-4">
          <ProducerAnalytics />
        </TabsContent>

        {/* ─── MESSAGES TAB ─── */}
        <TabsContent value="messages" className="mt-4">
          <DirectMessaging />
        </TabsContent>

        {/* ─── INVENTORY TAB ─── */}
        <TabsContent value="inventory" className="mt-4">
          <InventoryManagement />
        </TabsContent>

        {/* ─── SHIPMENTS TAB ─── */}
        <TabsContent value="shipments" className="mt-4">
          <ShipmentTracking mode="producer" />
        </TabsContent>

        {/* ─── RFQ TAB ─── */}
        <TabsContent value="rfq" className="mt-4">
          <RFQSystem mode="producer" />
        </TabsContent>

        {/* ─── RETURNS TAB ─── */}
        <TabsContent value="returns" className="mt-4">
          <ReturnsManagement mode="producer" />
        </TabsContent>

        {/* ─── INVOICES TAB ─── */}
        <TabsContent value="invoices" className="mt-4">
          <B2BInvoicing />
        </TabsContent>

        {/* ─── AI FORECAST TAB ─── */}
        <TabsContent value="forecast" className="mt-4">
          <DemandForecast />
        </TabsContent>

        {/* ─── DISCOUNTS TAB ─── */}
        <TabsContent value="discounts" className="mt-4">
          <DiscountManager mode="producer" />
        </TabsContent>

        {/* ─── POS TAB ─── */}
        <TabsContent value="pos" className="mt-4">
          <POSDashboard />
        </TabsContent>

        {/* ─── TEAM TAB ─── */}
        <TabsContent value="team" className="mt-4">
          <StoreTeamTab />
        </TabsContent>

        {/* ─── PAYOUTS TAB ─── */}
        <TabsContent value="payouts" className="mt-4 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Payouts & Earnings</h2>
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 text-sm">
              <CalendarCheck className="h-3.5 w-3.5" />
              Next payout: {daysLeft === 0 ? 'Today' : daysLeft === 1 ? 'Tomorrow' : `${daysLeft} days`}
            </Badge>
          </div>

          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending Payout</p>
                  <p className="font-display text-xl font-bold">{formatCurrency(payoutStats.pendingAmount)}</p>
                  <p className="text-xs text-muted-foreground">{payoutStats.pendingCount} order{payoutStats.pendingCount !== 1 ? 's' : ''}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Paid Out</p>
                  <p className="font-display text-xl font-bold">{formatCurrency(payoutStats.paidAmount)}</p>
                  <p className="text-xs text-muted-foreground">{payoutStats.paidCount} payout{payoutStats.paidCount !== 1 ? 's' : ''}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Gross Revenue</p>
                  <p className="font-display text-xl font-bold">{formatCurrency(payoutStats.totalGross)}</p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                  <DollarSign className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Fees Deducted</p>
                  <p className="font-display text-xl font-bold">{formatCurrency(payoutStats.totalFees)}</p>
                  <p className="text-xs text-muted-foreground">Platform + Referral</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Next Payout Info */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <CalendarCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="font-display font-semibold">Next Monday Disbursement</p>
                    <p className="text-sm text-muted-foreground">
                      {nextMonday.toLocaleDateString('en-KE', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Estimated amount</p>
                  <p className="font-display text-2xl font-bold text-primary">{formatCurrency(payoutStats.pendingAmount)}</p>
                </div>
              </div>
              <Separator className="my-3" />
              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Gross: {formatCurrency(payouts.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.gross_amount), 0))}</span>
                <span>Platform fee ({PLATFORM_FEE_PERCENT}%): -{formatCurrency(payouts.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.platform_fee), 0))}</span>
                <span>Referral fees: -{formatCurrency(payouts.filter(p => p.status === 'pending').reduce((s, p) => s + Number(p.referral_fee), 0))}</span>
              </div>
            </CardContent>
          </Card>

          {/* Payout History Table */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Payout History</CardTitle>
              <CardDescription>All your earnings from confirmed orders</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {payouts.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  <Wallet className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
                  <p>No payouts yet. Payouts are created when wholesalers pay for orders.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Platform Fee</TableHead>
                      <TableHead className="text-right">Referral Fee</TableHead>
                      <TableHead className="text-right">Net Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payouts.map(p => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString('en-KE')}</TableCell>
                        <TableCell className="font-mono text-xs">{p.order_id.slice(0, 8)}...</TableCell>
                        <TableCell className="text-right">{formatCurrency(Number(p.gross_amount))}</TableCell>
                        <TableCell className="text-right text-muted-foreground">-{formatCurrency(Number(p.platform_fee))}</TableCell>
                        <TableCell className="text-right text-muted-foreground">-{formatCurrency(Number(p.referral_fee))}</TableCell>
                        <TableCell className="text-right font-semibold">{formatCurrency(Number(p.net_amount))}</TableCell>
                        <TableCell>
                          {p.status === 'paid' ? (
                            <Badge variant="default" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" /> Paid
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="gap-1">
                              <Clock className="h-3 w-3" /> Pending
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ─── REFERRALS TAB ─── */}
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
