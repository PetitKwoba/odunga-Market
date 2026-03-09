import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Users, Package, ShoppingCart, Link2, CheckCircle, Clock, FileText, Send, Eye, BarChart3, Settings as SettingsIcon, ScrollText, AlertTriangle, CheckCircle2, Power, UserCog, Ban, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import AdminAnalytics from '@/components/AdminAnalytics';
import SearchableTable from '@/components/admin/SearchableTable';
import BulkActions from '@/components/admin/BulkActions';
import UserActionDialog from '@/components/admin/UserActionDialog';
import PlatformSettings from '@/components/admin/PlatformSettings';
import AuditLogs from '@/components/admin/AuditLogs';
import DisputeManagement from '@/components/admin/DisputeManagement';
import AdminRealtimeAlerts from '@/components/admin/AdminRealtimeAlerts';
import SupportManagement from '@/components/admin/SupportManagement';

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
  const [payouts, setPayouts] = useState<any[]>([]);
  const [posTransactions, setPosTransactions] = useState<any[]>([]);
  const [posInvoices, setPosInvoices] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [orderMessages, setOrderMessages] = useState<any[]>([]);
  
  // Selection states
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  
  // Dialogs
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [userDocs, setUserDocs] = useState<UserDoc[]>([]);
  const [docDialogOpen, setDocDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({ document_name: '', description: '' });
  const [userActionDialog, setUserActionDialog] = useState<{ action: 'change_role' | 'suspend' | null; userId: string; userName: string; currentRole?: string }>({ action: null, userId: '', userName: '' });

  const fetchData = () => {
    supabase.from('profiles').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setProfiles(data as Profile[]); });
    supabase.from('user_roles').select('*').then(({ data }) => { if (data) setRoles(data as UserRoleRow[]); });
    supabase.from('products').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setProducts(data); });
    supabase.from('orders').select('*, order_items(*)').order('created_at', { ascending: false }).then(({ data }) => { if (data) setOrders(data); });
    supabase.from('referrals').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setReferrals(data); });
    supabase.from('payouts').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setPayouts(data); });
    supabase.from('pos_transactions').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setPosTransactions(data); });
    supabase.from('pos_invoices').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setPosInvoices(data); });
    supabase.from('store_team_members').select('*').order('added_at', { ascending: false }).then(({ data }) => { if (data) setTeamMembers(data); });
    supabase.from('order_messages').select('*').order('created_at', { ascending: false }).then(({ data }) => { if (data) setOrderMessages(data); });
  };

  useEffect(() => { fetchData(); }, []);

  const getRoleForUser = (userId: string) => roles.find(r => r.user_id === userId)?.role || 'unknown';
  const usersWithRoles = profiles.map(p => ({ ...p, role: getRoleForUser(p.user_id) }));
  const pendingUsers = usersWithRoles.filter(u => !u.is_approved && (u.role === 'producer' || u.role === 'wholesaler'));

  const logAudit = async (action: string, target_type: string, target_id: string | null, details: any) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('audit_logs').insert({ admin_id: user.id, action, target_type, target_id, details });
    }
  };

  // Bulk approve users
  const handleBulkApprove = async () => {
    const ids = Array.from(selectedUsers);
    for (const id of ids) {
      await supabase.from('profiles').update({ is_approved: true }).eq('user_id', id);
      await logAudit('approve_user', 'user', id, { user_name: profiles.find(p => p.user_id === id)?.name });
    }
    setProfiles(prev => prev.map(p => ids.includes(p.user_id) ? { ...p, is_approved: true } : p));
    setSelectedUsers(new Set());
    toast.success(`${ids.length} user(s) approved`);
  };

  // Toggle single product
  const handleToggleProduct = async (productId: string, currentStatus: boolean) => {
    const newStatus = !currentStatus;
    await supabase.from('products').update({ is_active: newStatus }).eq('id', productId);
    await logAudit('toggle_product', 'product', productId, { is_active: newStatus, product_name: products.find(p => p.id === productId)?.name });
    setProducts(prev => prev.map(p => p.id === productId ? { ...p, is_active: newStatus } : p));
    toast.success(`Product ${newStatus ? 'activated' : 'deactivated'}`);
  };

  // Bulk toggle products
  const handleBulkToggleProducts = async (activate: boolean) => {
    const ids = Array.from(selectedProducts);
    for (const id of ids) {
      await supabase.from('products').update({ is_active: activate }).eq('id', id);
      await logAudit('bulk_toggle_product', 'product', id, { is_active: activate });
    }
    setProducts(prev => prev.map(p => ids.includes(p.id) ? { ...p, is_active: activate } : p));
    setSelectedProducts(new Set());
    toast.success(`${ids.length} product(s) ${activate ? 'activated' : 'deactivated'}`);
  };

  // Update order status
  const handleOrderStatus = async (orderId: string, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    await logAudit('update_order_status', 'order', orderId, { status });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
    toast.success('Order status updated');
  };

  // Mark payout as paid
  const handlePayoutPaid = async (payoutId: string) => {
    const now = new Date().toISOString();
    await supabase.from('payouts').update({ status: 'paid', paid_at: now }).eq('id', payoutId);
    await logAudit('mark_payout_paid', 'payout', payoutId, { paid_at: now });
    setPayouts(prev => prev.map(p => p.id === payoutId ? { ...p, status: 'paid', paid_at: now } : p));
    toast.success('Payout marked as paid');
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
      <div className="flex items-center justify-between mb-2">
        <div>
          <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
          <p className="mt-1 text-muted-foreground">Platform management</p>
        </div>
        <AdminRealtimeAlerts />
      </div>

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

      <Tabs defaultValue="analytics" className="mt-6">
        <TabsList className="flex flex-wrap">
          <TabsTrigger value="analytics"><BarChart3 className="mr-1.5 h-4 w-4" /> Analytics</TabsTrigger>
          <TabsTrigger value="pending">
            Pending {pendingUsers.length > 0 && <Badge className="ml-1.5 bg-secondary text-secondary-foreground">{pendingUsers.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="disputes"><AlertTriangle className="mr-1.5 h-4 w-4" /> Disputes</TabsTrigger>
          <TabsTrigger value="support"><MessageCircle className="mr-1.5 h-4 w-4" /> Support</TabsTrigger>
          <TabsTrigger value="referrals">Referrals</TabsTrigger>
          <TabsTrigger value="pos">POS</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="team">Team</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
          <TabsTrigger value="audit"><ScrollText className="mr-1.5 h-4 w-4" /> Audit</TabsTrigger>
          <TabsTrigger value="settings"><SettingsIcon className="mr-1.5 h-4 w-4" /> Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="analytics" className="mt-4">
          <AdminAnalytics orders={orders} products={products} profiles={profiles} posTransactions={posTransactions} payouts={payouts} />
        </TabsContent>

        <TabsContent value="pending" className="mt-4">
          <BulkActions
            selectedCount={selectedUsers.size}
            actions={[
              { label: 'Approve', icon: <CheckCircle2 className="h-4 w-4" />, onClick: handleBulkApprove }
            ]}
          />
          <SearchableTable
            data={pendingUsers}
            columns={[
              { key: 'name', label: 'Name', render: u => <span className="font-medium">{u.name}</span>, exportValue: u => u.name },
              { key: 'email', label: 'Email', render: u => u.email },
              { key: 'role', label: 'Role', render: u => <Badge variant="outline">{u.role}</Badge> },
              { key: 'business_name', label: 'Business', render: u => u.business_name || '—' },
              { key: 'country', label: 'Country', render: u => u.country },
            ]}
            keyExtractor={u => u.user_id}
            selectable
            selectedIds={selectedUsers}
            onSelectionChange={setSelectedUsers}
            actions={u => (
              <div className="flex gap-2 justify-end">
                <Button variant="ghost" size="sm" onClick={() => handleViewDocs(u.user_id)}><FileText className="h-3.5 w-3.5" /></Button>
                <Button size="sm" variant="outline" onClick={() => handleRequestDocs(u.user_id)}><Send className="mr-1 h-4 w-4" /> Docs</Button>
              </div>
            )}
            emptyMessage="No pending approvals"
            exportFileName="pending-users"
          />
        </TabsContent>

        <TabsContent value="users" className="mt-4">
          <SearchableTable
            data={usersWithRoles}
            columns={[
              { key: 'name', label: 'Name', render: u => <span className="font-medium">{u.name}</span> },
              { key: 'email', label: 'Email', render: u => u.email },
              { key: 'role', label: 'Role', render: u => <Badge variant="outline">{u.role}</Badge> },
              { key: 'country', label: 'Country', render: u => u.country },
              { key: 'is_approved', label: 'Status', render: u => u.is_approved ? <Badge className="bg-success text-success-foreground">Approved</Badge> : <Badge className="bg-secondary text-secondary-foreground">Pending</Badge>, exportValue: u => u.is_approved ? 'Approved' : 'Pending' },
              { key: 'referral_credits', label: 'Credits', render: u => `$${Number(u.referral_credits).toFixed(2)}`, exportValue: u => String(u.referral_credits) },
            ]}
            keyExtractor={u => u.user_id}
            actions={u => (
              <div className="flex gap-1.5 justify-end">
                <Button variant="ghost" size="sm" onClick={() => handleViewDocs(u.user_id)}><Eye className="h-3.5 w-3.5" /></Button>
                <Button variant="outline" size="sm" onClick={() => setUserActionDialog({ action: 'change_role', userId: u.user_id, userName: u.name, currentRole: u.role })}><UserCog className="mr-1 h-3.5 w-3.5" /> Role</Button>
                <Button variant="outline" size="sm" onClick={() => setUserActionDialog({ action: 'suspend', userId: u.user_id, userName: u.name })}><Ban className="mr-1 h-3.5 w-3.5" /> Suspend</Button>
              </div>
            )}
            exportFileName="users"
          />
        </TabsContent>

        <TabsContent value="products" className="mt-4">
          <BulkActions
            selectedCount={selectedProducts.size}
            actions={[
              { label: 'Activate', icon: <CheckCircle2 className="h-4 w-4" />, onClick: () => handleBulkToggleProducts(true) },
              { label: 'Deactivate', icon: <Ban className="h-4 w-4" />, onClick: () => handleBulkToggleProducts(false), variant: 'outline' }
            ]}
          />
          <SearchableTable
            data={products}
            columns={[
              { key: 'name', label: 'Name', render: p => <span className="font-medium">{p.name}</span> },
              { key: 'category', label: 'Category', render: p => p.category },
              { key: 'base_price', label: 'Price', render: p => `$${Number(p.base_price).toFixed(2)}`, exportValue: p => String(p.base_price) },
              { key: 'moq', label: 'MOQ', render: p => p.moq, exportValue: p => String(p.moq) },
              { key: 'stock_quantity', label: 'Stock', render: p => p.stock_quantity, exportValue: p => String(p.stock_quantity) },
              { key: 'is_active', label: 'Active', render: p => p.is_active ? <Badge className="bg-success text-success-foreground">Yes</Badge> : <Badge variant="outline">No</Badge>, exportValue: p => p.is_active ? 'Yes' : 'No' },
            ]}
            keyExtractor={p => p.id}
            selectable
            selectedIds={selectedProducts}
            onSelectionChange={setSelectedProducts}
            actions={p => (
              <Button size="sm" variant="outline" onClick={() => handleToggleProduct(p.id, p.is_active)}>
                <Power className="mr-1 h-3.5 w-3.5" /> {p.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            )}
            exportFileName="products"
          />
        </TabsContent>

        <TabsContent value="orders" className="mt-4">
          <SearchableTable
            data={orders}
            columns={[
              { key: 'id', label: 'ID', render: o => <span className="font-mono text-xs">{o.id.slice(0, 8)}...</span>, exportValue: o => o.id },
              { key: 'total_amount', label: 'Total', render: o => <span className="font-semibold">${Number(o.total_amount).toFixed(2)}</span>, exportValue: o => String(o.total_amount) },
              { key: 'status', label: 'Status', render: o => <Badge variant={o.status === 'Completed' ? 'default' : 'outline'}>{o.status}</Badge> },
              { key: 'payment_status', label: 'Payment', render: o => <Badge variant={o.payment_status === 'paid' ? 'default' : 'outline'}>{o.payment_status}</Badge> },
              { key: 'created_at', label: 'Date', render: o => new Date(o.created_at).toLocaleDateString(), exportValue: o => new Date(o.created_at).toISOString() },
            ]}
            keyExtractor={o => o.id}
            actions={o => (
              <div className="flex gap-1.5 justify-end">
                <Button size="sm" variant="outline" onClick={() => handleOrderStatus(o.id, 'Processing')}>Processing</Button>
                <Button size="sm" variant="outline" onClick={() => handleOrderStatus(o.id, 'Completed')}>Complete</Button>
              </div>
            )}
            exportFileName="orders"
          />
        </TabsContent>

        <TabsContent value="payouts" className="mt-4">
          <SearchableTable
            data={payouts}
            columns={[
              { key: 'producer_id', label: 'Producer', render: p => <span className="font-medium">{profiles.find(pr => pr.user_id === p.producer_id)?.name || '—'}</span>, exportValue: p => profiles.find(pr => pr.user_id === p.producer_id)?.name || p.producer_id },
              { key: 'order_id', label: 'Order', render: p => <span className="font-mono text-xs">{p.order_id.slice(0, 8)}...</span>, exportValue: p => p.order_id },
              { key: 'gross_amount', label: 'Gross', render: p => `$${Number(p.gross_amount).toFixed(2)}`, exportValue: p => String(p.gross_amount) },
              { key: 'platform_fee', label: 'Fee', render: p => <span className="text-destructive">-${Number(p.platform_fee).toFixed(2)}</span>, exportValue: p => String(p.platform_fee) },
              { key: 'net_amount', label: 'Net', render: p => <span className="font-semibold text-success">${Number(p.net_amount).toFixed(2)}</span>, exportValue: p => String(p.net_amount) },
              { key: 'status', label: 'Status', render: p => <Badge variant={p.status === 'paid' ? 'default' : 'outline'}>{p.status}</Badge> },
              { key: 'paid_at', label: 'Paid', render: p => p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—', exportValue: p => p.paid_at || '' },
            ]}
            keyExtractor={p => p.id}
            actions={p => p.status !== 'paid' && (
              <Button size="sm" onClick={() => handlePayoutPaid(p.id)}>
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Mark Paid
              </Button>
            )}
            exportFileName="payouts"
          />
        </TabsContent>

        <TabsContent value="disputes" className="mt-4">
          <DisputeManagement profiles={profiles} />
        </TabsContent>

        <TabsContent value="support" className="mt-4">
          <SupportManagement />
        </TabsContent>

        <TabsContent value="referrals" className="mt-4">
          <SearchableTable
            data={referrals}
            columns={[
              { key: 'referrer_user_id', label: 'Referrer', render: r => <span className="font-medium">{profiles.find(p => p.user_id === r.referrer_user_id)?.name || '—'}</span>, exportValue: r => profiles.find(p => p.user_id === r.referrer_user_id)?.name || r.referrer_user_id },
              { key: 'referred_user_id', label: 'Referred User', render: r => profiles.find(p => p.user_id === r.referred_user_id)?.name || '—', exportValue: r => profiles.find(p => p.user_id === r.referred_user_id)?.name || r.referred_user_id },
              { key: 'reward_credits_awarded', label: 'Credits', render: r => <span className="font-semibold text-success">${Number(r.reward_credits_awarded).toFixed(2)}</span>, exportValue: r => String(r.reward_credits_awarded) },
              { key: 'rewarded', label: 'Rewarded', render: r => r.rewarded ? <Badge className="bg-success text-success-foreground">Yes</Badge> : <Badge variant="outline">No</Badge>, exportValue: r => r.rewarded ? 'Yes' : 'No' },
              { key: 'first_order_id', label: 'First Order', render: r => r.first_order_id ? <span className="font-mono text-xs">{r.first_order_id.slice(0, 8)}...</span> : '—', exportValue: r => r.first_order_id || '' },
              { key: 'created_at', label: 'Date', render: r => new Date(r.created_at).toLocaleDateString(), exportValue: r => new Date(r.created_at).toISOString() },
            ]}
            keyExtractor={r => r.id}
            exportFileName="referrals"
          />
        </TabsContent>

        <TabsContent value="pos" className="mt-4">
          <SearchableTable
            data={posTransactions}
            columns={[
              { key: 'owner_id', label: 'Owner', render: t => <span className="font-medium">{profiles.find(p => p.user_id === t.owner_id)?.name || '—'}</span>, exportValue: t => profiles.find(p => p.user_id === t.owner_id)?.name || t.owner_id },
              { key: 'customer_name', label: 'Customer', render: t => t.customer_name || 'Walk-in' },
              { key: 'total', label: 'Total', render: t => <span className="font-semibold">${Number(t.total).toFixed(2)}</span>, exportValue: t => String(t.total) },
              { key: 'payment_method', label: 'Payment', render: t => <Badge>{t.payment_method}</Badge> },
              { key: 'created_at', label: 'Date', render: t => new Date(t.created_at).toLocaleDateString(), exportValue: t => new Date(t.created_at).toISOString() },
            ]}
            keyExtractor={t => t.id}
            exportFileName="pos-transactions"
          />
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <SearchableTable
            data={posInvoices}
            columns={[
              { key: 'invoice_number', label: 'Invoice #', render: i => <span className="font-mono">{i.invoice_number}</span> },
              { key: 'owner_id', label: 'Owner', render: i => <span className="font-medium">{profiles.find(p => p.user_id === i.owner_id)?.name || '—'}</span>, exportValue: i => profiles.find(p => p.user_id === i.owner_id)?.name || i.owner_id },
              { key: 'client_name', label: 'Client', render: i => i.client_name },
              { key: 'total', label: 'Total', render: i => <span className="font-semibold">${Number(i.total).toFixed(2)}</span>, exportValue: i => String(i.total) },
              { key: 'status', label: 'Status', render: i => <Badge variant={i.status === 'paid' ? 'default' : 'outline'}>{i.status}</Badge> },
              { key: 'due_date', label: 'Due', render: i => i.due_date ? new Date(i.due_date).toLocaleDateString() : '—', exportValue: i => i.due_date || '' },
            ]}
            keyExtractor={i => i.id}
            exportFileName="invoices"
          />
        </TabsContent>

        <TabsContent value="team" className="mt-4">
          <SearchableTable
            data={teamMembers}
            columns={[
              { key: 'producer_id', label: 'Store', render: m => <span className="font-medium">{profiles.find(p => p.user_id === m.producer_id)?.name || '—'}</span>, exportValue: m => profiles.find(p => p.user_id === m.producer_id)?.name || m.producer_id },
              { key: 'name', label: 'Name', render: m => m.name },
              { key: 'email', label: 'Email', render: m => m.email },
              { key: 'role', label: 'Role', render: m => <Badge variant="outline">{m.custom_role_name || m.role}</Badge> },
              { key: 'is_active', label: 'Active', render: m => m.is_active ? <Badge className="bg-success text-success-foreground">Yes</Badge> : <Badge variant="outline">No</Badge>, exportValue: m => m.is_active ? 'Yes' : 'No' },
              { key: 'added_at', label: 'Added', render: m => new Date(m.added_at).toLocaleDateString(), exportValue: m => new Date(m.added_at).toISOString() },
            ]}
            keyExtractor={m => m.id}
            exportFileName="team-members"
          />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <SearchableTable
            data={orderMessages}
            columns={[
              { key: 'order_id', label: 'Order', render: msg => <span className="font-mono text-xs">{msg.order_id.slice(0, 8)}...</span>, exportValue: msg => msg.order_id },
              { key: 'sender_id', label: 'Sender', render: msg => <span className="font-medium">{profiles.find(p => p.user_id === msg.sender_id)?.name || '—'}</span>, exportValue: msg => profiles.find(p => p.user_id === msg.sender_id)?.name || msg.sender_id },
              { key: 'message', label: 'Message', render: msg => <span className="max-w-xs truncate inline-block">{msg.message}</span> },
              { key: 'is_flagged', label: 'Flagged', render: msg => msg.is_flagged ? <Badge className="bg-destructive text-destructive-foreground">Yes</Badge> : <Badge variant="outline">No</Badge>, exportValue: msg => msg.is_flagged ? 'Yes' : 'No' },
              { key: 'created_at', label: 'Date', render: msg => new Date(msg.created_at).toLocaleDateString(), exportValue: msg => new Date(msg.created_at).toISOString() },
            ]}
            keyExtractor={msg => msg.id}
            exportFileName="messages"
          />
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <AuditLogs profiles={profiles} />
        </TabsContent>

        <TabsContent value="settings" className="mt-4">
          <PlatformSettings />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
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
                        <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={() => handleDocStatus(doc.id, 'rejected')}>Reject</Button>
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
                <Send className="mr-1 h-4 w-4" /> Request More
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Request Document — {selectedProfile?.name}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label htmlFor="doc-name">Document Name</Label><Input id="doc-name" placeholder="e.g. Tax Clearance" value={requestForm.document_name} onChange={e => setRequestForm(f => ({ ...f, document_name: e.target.value }))} /></div>
            <div className="space-y-2"><Label htmlFor="doc-desc">Description</Label><Textarea id="doc-desc" placeholder="Details..." value={requestForm.description} onChange={e => setRequestForm(f => ({ ...f, description: e.target.value }))} rows={3} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRequestDialogOpen(false)}>Cancel</Button>
            <Button onClick={submitDocRequest}><Send className="mr-1 h-4 w-4" /> Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UserActionDialog
        open={!!userActionDialog.action}
        onOpenChange={() => setUserActionDialog({ action: null, userId: '', userName: '' })}
        action={userActionDialog.action}
        userId={userActionDialog.userId}
        userName={userActionDialog.userName}
        currentRole={userActionDialog.currentRole}
        onComplete={fetchData}
      />
    </div>
  );
}
