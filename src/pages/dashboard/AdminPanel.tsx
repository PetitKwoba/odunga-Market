import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Users, Package, ShoppingCart, Link2, CheckCircle, XCircle, Clock, FileText, Send, Eye } from 'lucide-react';
import { toast } from 'sonner';

interface Profile {
  user_id: string;
  name: string;
  email: string;
  business_name: string | null;
  country: string;
  referral_code: string;
  referral_credits: number;
  is_approved: boolean;
  created_at: string;
}

interface UserDoc {
  id: string;
  user_id: string;
  name: string;
  file_name: string;
  status: string;
  uploaded_at: string;
  note: string | null;
}

interface UserRoleRow {
  user_id: string;
  role: string;
}

export default function AdminPanel() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<UserRoleRow[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDocs, setUserDocs] = useState<UserDoc[]>([]);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ document_name: '', description: '' });

  useEffect(() => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setProfiles(data as Profile[]); });
    supabase.from('user_roles').select('*').then(({ data }) => { if (data) setRoles(data as UserRoleRow[]); });
    supabase.from('products').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setProducts(data); });
    supabase.from('orders').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setOrders(data); });
    supabase.from('referrals').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setReferrals(data); });
  }, []);

  const getRoleForUser = (userId: string) => roles.find(r => r.user_id === userId)?.role || 'unknown';

  const usersWithRoles = profiles.map(p => ({ ...p, role: getRoleForUser(p.user_id) }));
  const pendingUsers = usersWithRoles.filter(u => !u.is_approved && (u.role === 'producer' || u.role === 'wholesaler'));

  const handleApprove = async (userId: string) => {
    const { error } = await supabase.from('profiles').update({ is_approved: true }).eq('user_id', userId);
    if (error) { toast.error('Failed: ' + error.message); return; }
    setProfiles(prev => prev.map(p => p.user_id === userId ? { ...p, is_approved: true } : p));
    toast.success('User approved');
  };

  const handleViewDocs = async (userId: string) => {
    setSelectedUserId(userId);
    const { data } = await supabase.from('user_documents').select('*').eq('user_id', userId).order('uploaded_at', { ascending: false });
    setUserDocs((data || []) as UserDoc[]);
    setDocDialogOpen(true);
  };

  const handleRequestDocs = (userId: string) => {
    setSelectedUserId(userId);
    setRequestForm({ document_name: '', description: '' });
    setRequestDialogOpen(true);
  };

  const submitDocRequest = async () => {
    if (!selectedUserId || !requestForm.document_name.trim()) { toast.error('Document name required'); return; }
    const { error } = await supabase.from('document_requests').insert({
      user_id: selectedUserId,
      document_name: requestForm.document_name.trim(),
      description: requestForm.description.trim() || null,
    });
    if (error) { toast.error('Failed: ' + error.message); return; }
    setRequestDialogOpen(false);
    const userName = profiles.find(p => p.user_id === selectedUserId)?.name;
    toast.success(`Document request sent to ${userName}`);
  };

  const handleDocStatus = async (docId: string, status: 'approved' | 'rejected') => {
    const { error } = await supabase.from('user_documents').update({ status }).eq('id', docId);
    if (error) { toast.error('Failed'); return; }
    setUserDocs(prev => prev.map(d => d.id === docId ? { ...d, status } : d));
    toast.success(`Document ${status}`);
  };

  const selectedProfile = profiles.find(p => p.user_id === selectedUserId);

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
      <p className="mt-1 text-muted-foreground">Platform management</p>

      {pendingUsers.length > 0 && (
        <Card className="mt-4 border-secondary/50 bg-secondary/5">
          <CardContent className="flex items-center gap-3 p-4">
            <Clock className="h-5 w-5 text-secondary" />
            <p className="font-medium">{pendingUsers.length} user(s) pending approval</p>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        {[
          { icon: <Users className="h-5 w-5" />, label: 'Users', value: profiles.length },
          { icon: <Package className="h-5 w-5" />, label: 'Products', value: products.length },
          { icon: <ShoppingCart className="h-5 w-5" />, label: 'Orders', value: orders.length },
          { icon: <Link2 className="h-5 w-5" />, label: 'Referrals', value: referrals.length },
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
            Pending Approval {pendingUsers.length > 0 && <Badge className="ml-1.5 bg-secondary text-secondary-foreground">{pendingUsers.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card><CardContent className="p-0">
            {pendingUsers.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground"><CheckCircle className="h-8 w-8" /><p>No pending approvals</p></div>
            ) : (
              <Table>
                <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Business</TableHead><TableHead>Country</TableHead><TableHead>Docs</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
                <TableBody>
                  {pendingUsers.map(u => (
                    <TableRow key={u.user_id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                      <TableCell>{u.business_name || '—'}</TableCell>
                      <TableCell>{u.country}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewDocs(u.user_id)} className="gap-1"><FileText className="h-3.5 w-3.5" /> View</Button>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleRequestDocs(u.user_id)}><Send className="mr-1 h-4 w-4" /> Request Docs</Button>
                          <Button size="sm" onClick={() => handleApprove(u.user_id)}><CheckCircle className="mr-1 h-4 w-4" /> Approve</Button>
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
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Country</TableHead><TableHead>Status</TableHead><TableHead>Credits</TableHead><TableHead>Docs</TableHead></TableRow></TableHeader>
              <TableBody>
                {usersWithRoles.map(u => (
                  <TableRow key={u.user_id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                    <TableCell>{u.country}</TableCell>
                    <TableCell>{u.is_approved ? <Badge className="bg-success text-success-foreground">Approved</Badge> : <Badge className="bg-secondary text-secondary-foreground">Pending</Badge>}</TableCell>
                    <TableCell>${Number(u.referral_credits).toFixed(2)}</TableCell>
                    <TableCell><Button variant="ghost" size="sm" onClick={() => handleViewDocs(u.user_id)}><Eye className="h-3.5 w-3.5" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <Card><CardContent className="p-0">
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Category</TableHead><TableHead>Price</TableHead><TableHead>MOQ</TableHead><TableHead>Stock</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.category}</TableCell>
                    <TableCell>${Number(p.base_price).toFixed(2)}</TableCell>
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
              <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Total</TableHead><TableHead>Status</TableHead><TableHead>Payment</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
              <TableBody>
                {orders.map(o => (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}...</TableCell>
                    <TableCell className="font-semibold">${Number(o.total_amount).toFixed(2)}</TableCell>
                    <TableCell><Badge variant={o.status === 'Completed' ? 'default' : 'outline'}>{o.status}</Badge></TableCell>
                    <TableCell><Badge variant={o.payment_status === 'paid' ? 'default' : 'outline'}>{o.payment_status}</Badge></TableCell>
                    <TableCell>{new Date(o.created_at).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* View Documents Dialog */}
      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Documents — {selectedProfile?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {userDocs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded.</p>
            ) : (
              userDocs.map(doc => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{doc.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {doc.status === 'pending' ? (
                      <>
                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleDocStatus(doc.id, 'approved')}><CheckCircle className="mr-1 h-3 w-3" /> Accept</Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => handleDocStatus(doc.id, 'rejected')}><XCircle className="mr-1 h-3 w-3" /> Reject</Button>
                      </>
                    ) : (
                      <Badge className={doc.status === 'approved' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}>{doc.status}</Badge>
                    )}
                  </div>
                </div>
              ))
            )}
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={() => { setDocDialogOpen(false); if (selectedUserId) handleRequestDocs(selectedUserId); }}>
                <Send className="mr-1 h-4 w-4" /> Request More Docs
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Documents Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Document from {selectedProfile?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="doc-name">Document Name</Label><Input id="doc-name" placeholder="e.g. Tax Clearance Certificate" value={requestForm.document_name} onChange={e => setRequestForm(f => ({ ...f, document_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="doc-desc">Description (optional)</Label><Textarea id="doc-desc" placeholder="Explain what you need..." value={requestForm.description} onChange={e => setRequestForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitDocRequest}><Send className="mr-1 h-4 w-4" /> Send Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
