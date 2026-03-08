import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { mockProducts, mockOrders, mockProducerProfiles } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Package, Settings } from 'lucide-react';
import { toast } from 'sonner';

export default function ProducerDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const products = mockProducts.filter(p => p.producer_id === user.id);
  const orders = mockOrders.filter(o => o.items.some(i => i.producer_id === user.id));
  const profile = mockProducerProfiles.find(p => p.user_id === user.id);

  const [rewardType, setRewardType] = useState(profile?.referral_reward_type || 'fixed');
  const [rewardValue, setRewardValue] = useState(String(profile?.referral_reward_value || 0));

  const saveReward = () => {
    toast.success(`Referral reward updated: ${rewardType === 'fixed' ? '$' : ''}${rewardValue}${rewardType === 'percentage' ? '%' : ''}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Producer Dashboard</h1>
      <p className="mt-1 text-muted-foreground">{user.business_name || user.name}</p>

      <Tabs defaultValue="products" className="mt-6">
        <TabsList>
          <TabsTrigger value="products">My Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="referrals">Referral Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-semibold">Products ({products.length})</h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button><Plus className="mr-1 h-4 w-4" /> Add Product</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle className="font-display">Add New Product</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2"><Label>Product Name</Label><Input placeholder="e.g. Organic Cotton Fabric" /></div>
                  <div className="space-y-2"><Label>Description</Label><Textarea placeholder="Describe your product..." /></div>
                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2"><Label>Category</Label><Input placeholder="e.g. Textiles" /></div>
                    <div className="space-y-2"><Label>Base Price ($)</Label><Input type="number" placeholder="0.00" /></div>
                  </div>
                  <div className="grid gap-4 grid-cols-2">
                    <div className="space-y-2"><Label>MOQ</Label><Input type="number" placeholder="50" /></div>
                    <div className="space-y-2"><Label>Lead Time (days)</Label><Input type="number" placeholder="7" /></div>
                  </div>
                  <Button className="w-full" onClick={() => toast.success('Product created! (demo)')}>Create Product</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {products.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No products yet. Add your first product!</CardContent></Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map(p => (
                <Card key={p.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-display font-semibold">{p.name}</h3>
                        <p className="text-xs text-muted-foreground">{p.category}</p>
                      </div>
                      <Badge variant={p.is_active ? 'default' : 'outline'}>{p.is_active ? 'Active' : 'Inactive'}</Badge>
                    </div>
                    <div className="mt-3 flex gap-4 text-sm">
                      <span>${p.base_price.toFixed(2)}/unit</span>
                      <span>MOQ: {p.moq}</span>
                      <span>Stock: {p.stock_quantity}</span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="orders" className="mt-4 space-y-4">
          <h2 className="font-display text-xl font-semibold">Orders</h2>
          {orders.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">No orders yet.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map(o => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.id}</TableCell>
                        <TableCell>{o.wholesaler_name}</TableCell>
                        <TableCell className="font-semibold">${o.total_amount.toFixed(2)}</TableCell>
                        <TableCell><Badge variant={o.status === 'Completed' ? 'default' : 'outline'}>{o.status}</Badge></TableCell>
                        <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Select defaultValue={o.status} onValueChange={(v) => toast.success(`Status updated to ${v} (demo)`)}>
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
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="referrals" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg flex items-center gap-2"><Settings className="h-5 w-5" /> Referral Reward Settings</CardTitle>
              <CardDescription>Set the reward referrers earn when a buyer they referred completes their first order with your products.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Reward Type</Label>
                  <Select value={rewardType} onValueChange={(v: 'fixed' | 'percentage') => setRewardType(v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                      <SelectItem value="percentage">Percentage of Order (%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Reward Value</Label>
                  <Input type="number" value={rewardValue} onChange={e => setRewardValue(e.target.value)} placeholder="0" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground">
                {rewardType === 'fixed'
                  ? `Referrers will earn $${rewardValue || '0'} per qualifying first order that includes your products.`
                  : `Referrers will earn ${rewardValue || '0'}% of the subtotal of your products in qualifying first orders.`}
              </p>
              <Button onClick={saveReward}>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
