import { useState } from 'react';
import { mockProducts, mockOrders, mockReferrals } from '@/lib/mock-data';
import { defaultProfile } from '@/lib/types';
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
import { User } from '@/lib/types';

function getAllUsers(): User[] {
  const stored = localStorage.getItem('waholo_all_users');
  if (stored) try {
    const parsed: User[] = JSON.parse(stored);
    return parsed.map(u => ({
      ...u,
      documents: u.documents || [],
      document_requests: u.document_requests || [],
      profile: u.profile ? { ...defaultProfile, ...u.profile } : { ...defaultProfile },
    }));
  } catch { /* */ }
  return [];
}

function saveAllUsers(users: User[]) {
  localStorage.setItem('waholo_all_users', JSON.stringify(users));
}

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>(getAllUsers);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ document_name: '', description: '' });

  const pendingUsers = users.filter(u => !u.is_approved && (u.role === 'producer' || u.role === 'wholesaler'));

  const refreshUsers = (updated: User[]) => {
    setUsers(updated);
    saveAllUsers(updated);
  };

  const handleApprove = (userId: string) => {
    const updated = users.map(u => u.id === userId ? { ...u, is_approved: true } : u);
    refreshUsers(updated);
    const sessionUser = localStorage.getItem('waholo_user');
    if (sessionUser) {
      const parsed = JSON.parse(sessionUser);
      if (parsed.id === userId) localStorage.setItem('waholo_user', JSON.stringify({ ...parsed, is_approved: true }));
    }
    toast.success('User approved successfully');
  };

  const handleReject = (userId: string) => {
    const updated = users.filter(u => u.id !== userId);
    refreshUsers(updated);
    toast.success('User rejected and removed');
  };

  const handleViewDocs = (user: User) => {
    setSelectedUser(user);
    setDocDialogOpen(true);
  };

  const handleRequestDocs = (user: User) => {
    setSelectedUser(user);
    setRequestForm({ document_name: '', description: '' });
    setRequestDialogOpen(true);
  };

  const submitDocRequest = () => {
    if (!selectedUser || !requestForm.document_name.trim()) {
      toast.error('Please enter a document name');
      return;
    }
    const updated = users.map(u => {
      if (u.id !== selectedUser.id) return u;
      return {
        ...u,
        document_requests: [
          ...u.document_requests,
          {
            id: 'dr' + Date.now(),
            document_name: requestForm.document_name.trim(),
            description: requestForm.description.trim(),
            requested_at: new Date().toISOString(),
            fulfilled: false,
          },
        ],
      };
    });
    refreshUsers(updated);
    setRequestDialogOpen(false);
    toast.success(`Document request sent to ${selectedUser.name}`);
    // Simulate email notification
    toast.info(`📧 Email sent to ${selectedUser.email}: "Please upload '${requestForm.document_name.trim()}' to your Waholo Market profile."`, { duration: 6000 });
  };

  const handleDocStatus = (userId: string, docId: string, status: 'approved' | 'rejected', note?: string) => {
    const updated = users.map(u => {
      if (u.id !== userId) return u;
      return {
        ...u,
        documents: u.documents.map(d => d.id === docId ? { ...d, status, note } : d),
      };
    });
    refreshUsers(updated);
    setSelectedUser(updated.find(u => u.id === userId) || null);
    toast.success(`Document ${status}`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
      <p className="mt-1 text-muted-foreground">Platform management</p>

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
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead>
                    <TableHead>Business</TableHead><TableHead>Country</TableHead><TableHead>Docs</TableHead>
                    <TableHead>Signed Up</TableHead><TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingUsers.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell>{u.email}</TableCell>
                      <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                      <TableCell>{u.business_name || '—'}</TableCell>
                      <TableCell>{u.country}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" onClick={() => handleViewDocs(u)} className="gap-1">
                          <FileText className="h-3.5 w-3.5" />
                          {u.documents.length}
                          {u.document_requests.filter(r => !r.fulfilled).length > 0 && (
                            <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 border-warning text-warning">
                              {u.document_requests.filter(r => !r.fulfilled).length} pending
                            </Badge>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleRequestDocs(u)} title="Request documents">
                            <Send className="mr-1 h-4 w-4" /> Request Docs
                          </Button>
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
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Country</TableHead><TableHead>Docs</TableHead><TableHead>Status</TableHead><TableHead>Credits</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
              <TableBody>
                {users.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.name}</TableCell>
                    <TableCell>{u.email}</TableCell>
                    <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                    <TableCell>{u.country}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleViewDocs(u)} className="gap-1">
                        <Eye className="h-3.5 w-3.5" /> {u.documents.length}
                      </Button>
                    </TableCell>
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

      {/* View Documents Dialog */}
      <Dialog open={docDialogOpen} onOpenChange={setDocDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Documents — {selectedUser?.name}
            </DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              {selectedUser.documents.length === 0 && selectedUser.document_requests.filter(r => !r.fulfilled).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No documents uploaded yet.</p>
              ) : null}

              {selectedUser.documents.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Uploaded Documents</Label>
                  {selectedUser.documents.map(doc => (
                    <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium">{doc.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{doc.file_name}</p>
                        <p className="text-xs text-muted-foreground">Uploaded {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        {doc.status === 'pending' ? (
                          <>
                            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => handleDocStatus(selectedUser.id, doc.id, 'approved')}>
                              <CheckCircle className="mr-1 h-3 w-3" /> Accept
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => handleDocStatus(selectedUser.id, doc.id, 'rejected', 'Document not valid')}>
                              <XCircle className="mr-1 h-3 w-3" /> Reject
                            </Button>
                          </>
                        ) : (
                          <Badge className={doc.status === 'approved' ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground'}>
                            {doc.status}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedUser.document_requests.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">Requested Documents</Label>
                  {selectedUser.document_requests.map(req => (
                    <div key={req.id} className="rounded-lg border p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">{req.document_name}</p>
                        <Badge variant={req.fulfilled ? 'default' : 'outline'}>
                          {req.fulfilled ? 'Fulfilled' : 'Awaiting'}
                        </Badge>
                      </div>
                      {req.description && <p className="text-xs text-muted-foreground mt-1">{req.description}</p>}
                      <p className="text-xs text-muted-foreground mt-1">Requested {new Date(req.requested_at).toLocaleDateString()}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { setDocDialogOpen(false); handleRequestDocs(selectedUser); }}>
                  <Send className="mr-1 h-4 w-4" /> Request More Docs
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Request Documents Dialog */}
      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Document from {selectedUser?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-name">Document Name</Label>
              <Input
                id="doc-name"
                placeholder="e.g. Tax Clearance Certificate"
                value={requestForm.document_name}
                onChange={e => setRequestForm(f => ({ ...f, document_name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="doc-desc">Description (optional)</Label>
              <Textarea
                id="doc-desc"
                placeholder="Explain what you need and why..."
                value={requestForm.description}
                onChange={e => setRequestForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitDocRequest}>
              <Send className="mr-1 h-4 w-4" /> Send Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
