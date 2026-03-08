import { mockUsers, mockProducts, mockOrders, mockReferrals } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Package, ShoppingCart, Link2 } from 'lucide-react';

export default function AdminPanel() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
      <p className="mt-1 text-muted-foreground">Platform management</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[
          { icon: <Users className="h-5 w-5" />, label: 'Users', value: mockUsers.length },
          { icon: <Package className="h-5 w-5" />, label: 'Products', value: mockProducts.length },
          { icon: <ShoppingCart className="h-5 w-5" />, label: 'Orders', value: mockOrders.length },
          { icon: <Link2 className="h-5 w-5" />, label: 'Referrals', value: mockReferrals.length },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{s.icon}</div>
              <div><p className="text-sm text-muted-foreground">{s.label}</p><p className="font-display text-2xl font-bold">{s.value}</p></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="users" className="mt-6">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="mt-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Country</TableHead><TableHead>Credits</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
              <TableBody>
                {mockUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                    <TableCell>{u.country}</TableCell>
                    <TableCell>${u.referral_credits.toFixed(2)}</TableCell>
                    <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Producer</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>MOQ</TableHead><TableHead>Stock</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
              <TableBody>
                {mockProducts.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.producer_name}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>${p.base_price.toFixed(2)}</TableCell>
                    <TableCell>{p.moq}</TableCell>
                    <TableCell>{p.stock_quantity}</TableCell>
                    <TableCell>{p.is_active ? <Badge className="bg-success text-success-foreground">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Buyer</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Payment</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {mockOrders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id}</TableCell>
                    <TableCell>{o.wholesaler_name}</TableCell>
                    <TableCell className="font-semibold">${o.total_amount.toFixed(2)}</TableCell>
                    <TableCell><Badge variant={o.status === 'Completed' ? 'default' : 'outline'}>{o.status}</Badge></TableCell>
                    <TableCell><Badge variant={o.payment_status === 'paid' ? 'default' : 'outline'}>{o.payment_status}</Badge></TableCell>
                    <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="referrals" className="mt-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Referrer</TableHead><TableHead>Referred</TableHead><TableHead>Role</TableHead><TableHead>Date</TableHead><TableHead>Rewarded</TableHead><TableHead>Credits</TableHead></TableRow></TableHeader>
              <TableBody>
                {mockReferrals.map(r => (
                  <TableRow key={r.id}>
                    <TableCell>{r.referrer_user_id}</TableCell>
                    <TableCell>{r.referred_user_name}</TableCell>
                    <TableCell><Badge variant="outline">{r.referred_user_role}</Badge></TableCell>
                    <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>{r.rewarded ? <Badge className="bg-success text-success-foreground">Yes</Badge> : <Badge variant="outline">No</Badge>}</TableCell>
                    <TableCell className="font-semibold">${r.reward_credits_awarded.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
