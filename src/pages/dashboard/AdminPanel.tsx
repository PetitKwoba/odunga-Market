import { useState } from 'react';
import { mockUsers, mockProducts, mockOrders, mockReferrals } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Package, ShoppingCart, Link2, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { User } from '@/lib/types';

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>(() => {
    const stored = localStorage.getItem('waholo_all_users');
    return stored ? JSON.parse(stored) : mockUsers;
  });

  const pendingUsers = users.filter(u => !u.is_approved && (u.role === 'producer' || u.role === 'wholesaler'));

  const handleApprove = (userId: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, is_approved: true } : u);
    setUsers(updated);
    localStorage.setItem('waholo_all_users', JSON.stringify(updated));
    // Also update the user's own session if they're logged in
    const sessionUser = localStorage.getItem('waholo_user');
    if (sessionUser) {
      const parsed = JSON.parse(sessionUser);
      if (parsed.id === userId) {
        localStorage.setItem('waholo_user', JSON.stringify({ ...parsed, is_approved: true }));
      }
    }
    toast.success('User approved successfully');
  };

  const handleReject = (userId: string) => {
    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    localStorage.setItem('waholo_all_users', JSON.stringify(updated));
    toast.success('User rejected and removed');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
      <p className="mt-1 text-muted-foreground">Platform management</p>

      {/* Pending approvals banner */}
      {pendingUsers.length > 0 && (
        <Card className="mt-4 border-warning/50 bg-warning/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-warning" />
            <p className="font-medium">{pendingUsers.length} user(s) pending approval</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[
          { icon: <Users className="h-5 w-5" />, label: 'Users', value: users.length },
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

      <Tabs defaultValue="pending" className="mt-6">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Approval {pendingUsers.length > 0 && <Badge className="ml-1.5 bg-warning text-warning-foreground">{pendingUsers.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card><CardContent className="p-0">
            {pendingUsers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
                <CheckCircle className="h-8 w-8" />
                <p>No pending approvals</p>
              </div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Business</TableHead><TableHead>Country</TableHead><TableHead>Signed Up</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {pendingUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                      <TableCell>{u.business_name || '—'}</TableCell>
                      <TableCell>{u.country}</TableCell>
                      <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" onClick={() => handleApprove(u.id)}>
                            <CheckCircle className="mr-1 h-4 w-4" /> Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => handleReject(u.id)}>
                            <XCircle className="mr-1 h-4 w-4" /> Reject
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Country</TableHead><TableHead>Status</TableHead><TableHead>Credits</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                    <TableCell>{u.country}</TableCell>
                    <TableCell>
                      {u.is_approved
                        ? <Badge className="bg-success text-success-foreground">Approved</Badge>
                        : <Badge className="bg-warning text-warning-foreground">Pending</Badge>}
                    </TableCell>
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
