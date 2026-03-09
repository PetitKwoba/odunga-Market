import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { RotateCcw, Package, CheckCircle2, XCircle, Clock, DollarSign } from 'lucide-react';

interface ReturnRequest {
  id: string;
  order_id: string;
  rma_number: string;
  status: string;
  return_type: string;
  reason: string;
  items: any[];
  refund_amount: number;
  restocking_fee: number;
  producer_notes: string | null;
  created_at: string;
}

const RETURN_TYPES = [
  { value: 'defective', label: 'Defective Product' },
  { value: 'wrong_item', label: 'Wrong Item Received' },
  { value: 'damaged', label: 'Damaged in Transit' },
  { value: 'not_as_described', label: 'Not as Described' },
  { value: 'buyers_remorse', label: "Buyer's Remorse" },
  { value: 'other', label: 'Other' },
];

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending Review', color: 'secondary', icon: Clock },
  approved: { label: 'Approved', color: 'default', icon: CheckCircle2 },
  rejected: { label: 'Rejected', color: 'destructive', icon: XCircle },
  received: { label: 'Item Received', color: 'default', icon: Package },
  refunded: { label: 'Refunded', color: 'default', icon: DollarSign },
  restocked: { label: 'Restocked', color: 'default', icon: RotateCcw },
};

export default function ReturnsManagement({ mode = 'wholesaler' }: { mode?: 'wholesaler' | 'producer' }) {
  const { user } = useAuth();
  const [returns, setReturns] = useState<ReturnRequest[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedReturn, setSelectedReturn] = useState<ReturnRequest | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    order_id: '',
    return_type: 'defective',
    reason: '',
  });

  useEffect(() => {
    if (!user) return;
    fetchReturns();
    if (mode === 'wholesaler') fetchOrders();
  }, [user, mode]);

  const fetchReturns = async () => {
    const query = supabase.from('returns').select('*').order('created_at', { ascending: false });
    const { data } = await query;
    if (data) setReturns(data as ReturnRequest[]);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, total_amount, status, created_at')
      .eq('wholesaler_id', user?.id)
      .eq('status', 'Completed')
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  const generateRMA = () => {
    const prefix = 'RMA';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  };

  const handleCreate = async () => {
    if (!form.order_id || !form.reason) {
      toast.error('Please select an order and provide a reason');
      return;
    }
    setLoading(true);

    try {
      // Get order items for this order
      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity, unit_price, subtotal')
        .eq('order_id', form.order_id);

      const { error } = await supabase.from('returns').insert({
        order_id: form.order_id,
        wholesaler_id: user?.id,
        rma_number: generateRMA(),
        return_type: form.return_type,
        reason: form.reason,
        items: orderItems || [],
        refund_amount: 0,
      });

      if (error) throw error;

      toast.success('Return request submitted! RMA number generated.');
      setCreateOpen(false);
      setForm({ order_id: '', return_type: 'defective', reason: '' });
      fetchReturns();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (returnId: string, status: string, notes?: string) => {
    setLoading(true);
    try {
      const updates: any = { status };
      if (status === 'approved') updates.approved_at = new Date().toISOString();
      if (status === 'received') updates.received_at = new Date().toISOString();
      if (status === 'refunded') updates.refunded_at = new Date().toISOString();
      if (notes) updates.producer_notes = notes;

      const { error } = await supabase.from('returns').update(updates).eq('id', returnId);
      if (error) throw error;

      toast.success(`Return ${status}`);
      setDetailOpen(false);
      fetchReturns();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
    const Icon = config.icon;
    return (
      <Badge variant={config.color as any} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Returns & Refunds</h2>
          <p className="text-sm text-muted-foreground">
            {mode === 'wholesaler' ? 'Request returns for your orders' : 'Manage return requests from customers'}
          </p>
        </div>
        {mode === 'wholesaler' && (
          <Button onClick={() => setCreateOpen(true)}>
            <RotateCcw className="mr-1 h-4 w-4" /> Request Return
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        {['pending', 'approved', 'refunded', 'rejected'].map(status => {
          const count = returns.filter(r => r.status === status).length;
          const config = STATUS_CONFIG[status];
          const Icon = config.icon;
          return (
            <Card key={status}>
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{config.label}</p>
                  <p className="font-display text-2xl font-bold">{count}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Returns Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RMA #</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Refund</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {returns.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No return requests yet
                  </TableCell>
                </TableRow>
              ) : (
                returns.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.rma_number}</TableCell>
                    <TableCell className="font-mono text-xs">{r.order_id.slice(0, 8)}...</TableCell>
                    <TableCell className="capitalize">{r.return_type.replace('_', ' ')}</TableCell>
                    <TableCell>{getStatusBadge(r.status)}</TableCell>
                    <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>${Number(r.refund_amount).toFixed(2)}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedReturn(r); setDetailOpen(true); }}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Return Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request a Return</DialogTitle>
            <DialogDescription>
              Select the order you want to return and provide a reason.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Order</Label>
              <Select value={form.order_id} onValueChange={v => setForm(f => ({ ...f, order_id: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an order" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.id.slice(0, 8)}... - ${Number(o.total_amount).toFixed(2)} ({new Date(o.created_at).toLocaleDateString()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Return Type</Label>
              <Select value={form.return_type} onValueChange={v => setForm(f => ({ ...f, return_type: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RETURN_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason for Return</Label>
              <Textarea
                value={form.reason}
                onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                placeholder="Please describe the issue in detail..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Submitting...' : 'Submit Return Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Return Details - {selectedReturn?.rma_number}</DialogTitle>
          </DialogHeader>
          {selectedReturn && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p>{getStatusBadge(selectedReturn.status)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Type</p>
                  <p className="capitalize">{selectedReturn.return_type.replace('_', ' ')}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Reason</p>
                  <p>{selectedReturn.reason}</p>
                </div>
                {selectedReturn.producer_notes && (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Producer Notes</p>
                    <p>{selectedReturn.producer_notes}</p>
                  </div>
                )}
              </div>

              {mode === 'producer' && selectedReturn.status === 'pending' && (
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => handleStatusUpdate(selectedReturn.id, 'rejected')}
                    disabled={loading}
                  >
                    <XCircle className="mr-1 h-4 w-4" /> Reject
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => handleStatusUpdate(selectedReturn.id, 'approved')}
                    disabled={loading}
                  >
                    <CheckCircle2 className="mr-1 h-4 w-4" /> Approve
                  </Button>
                </div>
              )}

              {mode === 'producer' && selectedReturn.status === 'approved' && (
                <Button
                  className="w-full"
                  onClick={() => handleStatusUpdate(selectedReturn.id, 'received')}
                  disabled={loading}
                >
                  <Package className="mr-1 h-4 w-4" /> Mark as Received
                </Button>
              )}

              {mode === 'producer' && selectedReturn.status === 'received' && (
                <Button
                  className="w-full"
                  onClick={() => handleStatusUpdate(selectedReturn.id, 'refunded')}
                  disabled={loading}
                >
                  <DollarSign className="mr-1 h-4 w-4" /> Issue Refund
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
