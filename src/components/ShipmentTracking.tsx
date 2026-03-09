import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Truck, Package, MapPin, Calendar, ExternalLink, Plus, CheckCircle2 } from 'lucide-react';

interface Shipment {
  id: string;
  order_id: string;
  carrier: string;
  tracking_number: string | null;
  tracking_url: string | null;
  status: string;
  estimated_delivery: string | null;
  actual_delivery: string | null;
  shipped_at: string | null;
  notes: string | null;
  created_at: string;
}

interface Order {
  id: string;
  total_amount: number;
  status: string;
  shipping_address: any;
  created_at: string;
}

const CARRIERS = [
  { value: 'dhl', label: 'DHL', urlTemplate: 'https://www.dhl.com/track?trackingNumber=' },
  { value: 'fedex', label: 'FedEx', urlTemplate: 'https://www.fedex.com/fedextrack/?trknbr=' },
  { value: 'ups', label: 'UPS', urlTemplate: 'https://www.ups.com/track?tracknum=' },
  { value: 'usps', label: 'USPS', urlTemplate: 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' },
  { value: 'custom', label: 'Custom / Other', urlTemplate: '' },
];

const STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'secondary' },
  { value: 'picked_up', label: 'Picked Up', color: 'default' },
  { value: 'in_transit', label: 'In Transit', color: 'default' },
  { value: 'out_for_delivery', label: 'Out for Delivery', color: 'default' },
  { value: 'delivered', label: 'Delivered', color: 'default' },
  { value: 'failed', label: 'Failed', color: 'destructive' },
  { value: 'returned', label: 'Returned', color: 'destructive' },
];

export default function ShipmentTracking({ mode = 'producer' }: { mode?: 'producer' | 'wholesaler' }) {
  const { user } = useAuth();
  const [shipments, setShipments] = useState<(Shipment & { order?: Order })[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    order_id: '',
    carrier: 'dhl',
    tracking_number: '',
    tracking_url: '',
    estimated_delivery: '',
    notes: '',
  });
  const [updateStatus, setUpdateStatus] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchShipments();
    if (mode === 'producer') fetchOrders();
  }, [user, mode]);

  const fetchShipments = async () => {
    let query = supabase.from('shipments').select('*').order('created_at', { ascending: false });
    const { data } = await query;
    
    if (data && data.length > 0) {
      const orderIds = [...new Set(data.map(s => s.order_id))];
      const { data: ordersData } = await supabase.from('orders').select('*').in('id', orderIds);
      
      setShipments(data.map(s => ({
        ...s,
        order: ordersData?.find(o => o.id === s.order_id),
      })));
    } else {
      setShipments([]);
    }
  };

  const fetchOrders = async () => {
    // Fetch orders that don't have shipments yet
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('order_id')
      .eq('producer_id', user?.id);

    if (orderItems && orderItems.length > 0) {
      const orderIds = [...new Set(orderItems.map(oi => oi.order_id))];
      const { data } = await supabase
        .from('orders')
        .select('*')
        .in('id', orderIds)
        .in('status', ['Confirmed', 'Shipped']);
      if (data) setOrders(data);
    }
  };

  const handleCreateShipment = async () => {
    if (!formData.order_id || !formData.carrier) {
      toast.error('Please fill required fields');
      return;
    }
    setLoading(true);

    try {
      const carrier = CARRIERS.find(c => c.value === formData.carrier);
      let trackingUrl = formData.tracking_url;
      
      if (!trackingUrl && formData.tracking_number && carrier?.urlTemplate) {
        trackingUrl = carrier.urlTemplate + formData.tracking_number;
      }

      const { error } = await supabase.from('shipments').insert({
        order_id: formData.order_id,
        carrier: formData.carrier,
        tracking_number: formData.tracking_number || null,
        tracking_url: trackingUrl || null,
        estimated_delivery: formData.estimated_delivery || null,
        notes: formData.notes || null,
        status: 'pending',
      });

      if (error) throw error;

      // Update order status to Shipped
      await supabase.from('orders').update({ status: 'Shipped' }).eq('id', formData.order_id);

      toast.success('Shipment created');
      setCreateOpen(false);
      setFormData({ order_id: '', carrier: 'dhl', tracking_number: '', tracking_url: '', estimated_delivery: '', notes: '' });
      fetchShipments();
      fetchOrders();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedShipment || !updateStatus) return;
    setLoading(true);

    try {
      const updates: any = { status: updateStatus };
      
      if (updateStatus === 'picked_up' || updateStatus === 'in_transit') {
        updates.shipped_at = new Date().toISOString();
      } else if (updateStatus === 'delivered') {
        updates.actual_delivery = new Date().toISOString();
        // Update order status
        await supabase.from('orders').update({ status: 'Completed' }).eq('id', selectedShipment.order_id);
      }

      const { error } = await supabase
        .from('shipments')
        .update(updates)
        .eq('id', selectedShipment.id);

      if (error) throw error;

      toast.success('Shipment status updated');
      setUpdateOpen(false);
      fetchShipments();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const opt = STATUS_OPTIONS.find(s => s.value === status);
    if (status === 'delivered') {
      return <Badge className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Delivered</Badge>;
    }
    return <Badge variant={opt?.color as any || 'secondary'}>{opt?.label || status}</Badge>;
  };

  const pendingShipments = shipments.filter(s => s.status === 'pending');
  const inTransitShipments = shipments.filter(s => ['picked_up', 'in_transit', 'out_for_delivery'].includes(s.status));
  const deliveredShipments = shipments.filter(s => s.status === 'delivered');

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Shipments</p>
              <p className="font-display text-2xl font-bold">{shipments.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="font-display text-2xl font-bold">{pendingShipments.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">In Transit</p>
              <p className="font-display text-2xl font-bold">{inTransitShipments.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10 text-green-500">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Delivered</p>
              <p className="font-display text-2xl font-bold">{deliveredShipments.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shipments Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Shipments</CardTitle>
            <CardDescription>Track and manage order shipments</CardDescription>
          </div>
          {mode === 'producer' && (
            <Button onClick={() => setCreateOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Create Shipment
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Carrier</TableHead>
                <TableHead>Tracking</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Est. Delivery</TableHead>
                {mode === 'producer' && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {shipments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No shipments found
                  </TableCell>
                </TableRow>
              ) : (
                shipments.map(s => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <p className="font-mono text-xs">{s.order_id.slice(0, 8)}...</p>
                      <p className="text-xs text-muted-foreground">
                        ${s.order?.total_amount?.toFixed(2)}
                      </p>
                    </TableCell>
                    <TableCell className="capitalize">{s.carrier}</TableCell>
                    <TableCell>
                      {s.tracking_number ? (
                        <div className="flex items-center gap-2">
                          <code className="text-xs">{s.tracking_number}</code>
                          {s.tracking_url && (
                            <a href={s.tracking_url} target="_blank" rel="noopener noreferrer">
                              <ExternalLink className="h-4 w-4 text-primary" />
                            </a>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(s.status)}</TableCell>
                    <TableCell>
                      {s.actual_delivery ? (
                        <div>
                          <p className="text-sm">{new Date(s.actual_delivery).toLocaleDateString()}</p>
                          <p className="text-xs text-green-600">Delivered</p>
                        </div>
                      ) : s.estimated_delivery ? (
                        new Date(s.estimated_delivery).toLocaleDateString()
                      ) : '-'}
                    </TableCell>
                    {mode === 'producer' && (
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedShipment(s);
                            setUpdateStatus(s.status);
                            setUpdateOpen(true);
                          }}
                          disabled={s.status === 'delivered'}
                        >
                          Update
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Shipment Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Shipment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Order *</Label>
              <Select value={formData.order_id} onValueChange={v => setFormData({ ...formData, order_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select order" />
                </SelectTrigger>
                <SelectContent>
                  {orders.map(o => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.id.slice(0, 8)}... - ${o.total_amount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Carrier *</Label>
              <Select value={formData.carrier} onValueChange={v => setFormData({ ...formData, carrier: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARRIERS.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tracking Number</Label>
              <Input
                value={formData.tracking_number}
                onChange={e => setFormData({ ...formData, tracking_number: e.target.value })}
                placeholder="Enter tracking number"
              />
            </div>
            {formData.carrier === 'custom' && (
              <div className="space-y-2">
                <Label>Tracking URL</Label>
                <Input
                  value={formData.tracking_url}
                  onChange={e => setFormData({ ...formData, tracking_url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
            )}
            <div className="space-y-2">
              <Label>Estimated Delivery</Label>
              <Input
                type="date"
                value={formData.estimated_delivery}
                onChange={e => setFormData({ ...formData, estimated_delivery: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={formData.notes}
                onChange={e => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateShipment} disabled={loading}>
              {loading ? 'Creating...' : 'Create Shipment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Update Status Dialog */}
      <Dialog open={updateOpen} onOpenChange={setUpdateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Shipment Status</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={updateStatus} onValueChange={setUpdateStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUpdateOpen(false)}>Cancel</Button>
            <Button onClick={handleUpdateStatus} disabled={loading}>
              {loading ? 'Updating...' : 'Update Status'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
