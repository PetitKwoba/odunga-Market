import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/lib/currency-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FileText, Plus, Send, Download, Eye, DollarSign, Clock, CheckCircle2 } from 'lucide-react';

interface B2BInvoice {
  id: string;
  invoice_number: string;
  producer_id: string;
  order_id: string | null;
  wholesaler_id: string;
  wholesaler_name: string;
  wholesaler_email: string | null;
  items: any[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  discount_amount: number;
  total: number;
  currency: string;
  status: string;
  payment_terms: string;
  due_date: string | null;
  notes: string | null;
  created_at: string;
}

const STATUS_CONFIG: Record<string, { label: string; variant: any }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  sent: { label: 'Sent', variant: 'default' },
  paid: { label: 'Paid', variant: 'default' },
  overdue: { label: 'Overdue', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
};

const PAYMENT_TERMS = [
  { value: 'due_on_receipt', label: 'Due on Receipt' },
  { value: 'net_15', label: 'Net 15' },
  { value: 'net_30', label: 'Net 30' },
  { value: 'net_60', label: 'Net 60' },
];

export default function B2BInvoicing() {
  const { user } = useAuth();
  const { format, currency } = useCurrency();
  const [invoices, setInvoices] = useState<B2BInvoice[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<B2BInvoice | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    order_id: '',
    wholesaler_name: '',
    wholesaler_email: '',
    items: [] as { description: string; quantity: number; unit_price: number }[],
    tax_rate: '0',
    discount_amount: '0',
    payment_terms: 'due_on_receipt',
    due_date: '',
    notes: '',
  });

  useEffect(() => {
    if (!user) return;
    fetchInvoices();
    fetchOrders();
  }, [user]);

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from('b2b_invoices')
      .select('*')
      .eq('producer_id', user?.id)
      .order('created_at', { ascending: false });
    if (data) setInvoices(data as B2BInvoice[]);
  };

  const fetchOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, total_amount, wholesaler_id, created_at, status')
      .eq('status', 'Completed')
      .order('created_at', { ascending: false });
    if (data) setOrders(data);
  };

  const generateInvoiceNumber = () => {
    const prefix = 'INV';
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${date}-${random}`;
  };

  const addItem = () => {
    setForm(f => ({
      ...f,
      items: [...f.items, { description: '', quantity: 1, unit_price: 0 }],
    }));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setForm(f => ({
      ...f,
      items: f.items.map((item, i) => i === index ? { ...item, [field]: value } : item),
    }));
  };

  const removeItem = (index: number) => {
    setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== index) }));
  };

  const calculateTotals = () => {
    const subtotal = form.items.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);
    const taxAmount = subtotal * (parseFloat(form.tax_rate) / 100);
    const total = subtotal + taxAmount - parseFloat(form.discount_amount || '0');
    return { subtotal, taxAmount, total };
  };

  const handleCreate = async () => {
    if (!form.wholesaler_name || form.items.length === 0) {
      toast.error('Please add customer name and at least one item');
      return;
    }
    setLoading(true);

    try {
      const { subtotal, taxAmount, total } = calculateTotals();
      
      // Get wholesaler ID from order if selected
      let wholesaler_id = user?.id; // fallback
      if (form.order_id) {
        const order = orders.find(o => o.id === form.order_id);
        if (order) wholesaler_id = order.wholesaler_id;
      }

      const { error } = await supabase.from('b2b_invoices').insert({
        invoice_number: generateInvoiceNumber(),
        producer_id: user?.id,
        order_id: form.order_id || null,
        wholesaler_id,
        wholesaler_name: form.wholesaler_name,
        wholesaler_email: form.wholesaler_email || null,
        items: form.items,
        subtotal,
        tax_rate: parseFloat(form.tax_rate),
        tax_amount: taxAmount,
        discount_amount: parseFloat(form.discount_amount || '0'),
        total,
        currency: currency.code,
        payment_terms: form.payment_terms,
        due_date: form.due_date || null,
        notes: form.notes || null,
      });

      if (error) throw error;

      toast.success('Invoice created!');
      setCreateOpen(false);
      resetForm();
      fetchInvoices();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    const updates: any = { status };
    if (status === 'paid') updates.paid_at = new Date().toISOString();
    
    await supabase.from('b2b_invoices').update(updates).eq('id', id);
    fetchInvoices();
    toast.success(`Invoice marked as ${status}`);
  };

  const resetForm = () => {
    setForm({
      order_id: '',
      wholesaler_name: '',
      wholesaler_email: '',
      items: [],
      tax_rate: '0',
      discount_amount: '0',
      payment_terms: 'due_on_receipt',
      due_date: '',
      notes: '',
    });
  };

  const { subtotal, taxAmount, total } = calculateTotals();

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + Number(i.total), 0);
  const pendingAmount = invoices.filter(i => i.status === 'sent').reduce((s, i) => s + Number(i.total), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">B2B Invoices</h2>
          <p className="text-sm text-muted-foreground">Create and manage invoices for your wholesale customers</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Create Invoice
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Invoices</p>
              <p className="font-display text-2xl font-bold">{invoices.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20 text-secondary">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Paid</p>
              <p className="font-display text-2xl font-bold">{format(totalRevenue)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Pending</p>
              <p className="font-display text-2xl font-bold">{format(pendingAmount)}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Overdue</p>
              <p className="font-display text-2xl font-bold">
                {invoices.filter(i => i.status === 'overdue').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Date</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No invoices yet
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                    <TableCell>
                      <p className="font-medium">{inv.wholesaler_name}</p>
                      {inv.wholesaler_email && <p className="text-xs text-muted-foreground">{inv.wholesaler_email}</p>}
                    </TableCell>
                    <TableCell className="font-semibold">{format(inv.total)}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_CONFIG[inv.status]?.variant || 'secondary'}>
                        {STATUS_CONFIG[inv.status]?.label || inv.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{inv.due_date ? new Date(inv.due_date).toLocaleDateString() : '-'}</TableCell>
                    <TableCell className="text-sm">{new Date(inv.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setViewInvoice(inv)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        {inv.status === 'draft' && (
                          <Button variant="ghost" size="icon" onClick={() => updateStatus(inv.id, 'sent')}>
                            <Send className="h-4 w-4" />
                          </Button>
                        )}
                        {inv.status === 'sent' && (
                          <Button variant="ghost" size="icon" onClick={() => updateStatus(inv.id, 'paid')}>
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create Invoice Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Customer Name *</Label>
                <Input
                  value={form.wholesaler_name}
                  onChange={e => setForm(f => ({ ...f, wholesaler_name: e.target.value }))}
                  placeholder="Company Name"
                />
              </div>
              <div className="space-y-2">
                <Label>Customer Email</Label>
                <Input
                  type="email"
                  value={form.wholesaler_email}
                  onChange={e => setForm(f => ({ ...f, wholesaler_email: e.target.value }))}
                  placeholder="email@company.com"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Link to Order (optional)</Label>
                <Select value={form.order_id} onValueChange={v => setForm(f => ({ ...f, order_id: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select order" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {orders.map(o => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.id.slice(0, 8)}... - ${Number(o.total_amount).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Payment Terms</Label>
                <Select value={form.payment_terms} onValueChange={v => setForm(f => ({ ...f, payment_terms: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_TERMS.map(t => (
                      <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Line Items</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus className="mr-1 h-3 w-3" /> Add Item
                </Button>
              </div>
              {form.items.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No items added yet</p>
              ) : (
                <div className="space-y-2">
                  {form.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center">
                      <Input
                        className="col-span-6"
                        placeholder="Description"
                        value={item.description}
                        onChange={e => updateItem(i, 'description', e.target.value)}
                      />
                      <Input
                        className="col-span-2"
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 0)}
                      />
                      <Input
                        className="col-span-3"
                        type="number"
                        placeholder="Price"
                        value={item.unit_price}
                        onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="col-span-1"
                        onClick={() => removeItem(i)}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Tax Rate (%)</Label>
                <Input
                  type="number"
                  value={form.tax_rate}
                  onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Discount</Label>
                <Input
                  type="number"
                  value={form.discount_amount}
                  onChange={e => setForm(f => ({ ...f, discount_amount: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Due Date</Label>
                <Input
                  type="date"
                  value={form.due_date}
                  onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="Payment instructions, thank you message, etc."
              />
            </div>

            {/* Totals */}
            <div className="border-t pt-4 space-y-2 text-right">
              <p className="text-sm">Subtotal: <span className="font-semibold">{format(subtotal)}</span></p>
              <p className="text-sm">Tax ({form.tax_rate}%): <span className="font-semibold">{format(taxAmount)}</span></p>
              {parseFloat(form.discount_amount) > 0 && (
                <p className="text-sm">Discount: <span className="font-semibold text-destructive">-{format(parseFloat(form.discount_amount))}</span></p>
              )}
              <p className="text-lg font-bold">Total: {format(total)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={loading}>
              {loading ? 'Creating...' : 'Create Invoice'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Invoice Dialog */}
      <Dialog open={!!viewInvoice} onOpenChange={(open) => !open && setViewInvoice(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Invoice {viewInvoice?.invoice_number}</DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Customer</p>
                  <p className="font-medium">{viewInvoice.wholesaler_name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <Badge variant={STATUS_CONFIG[viewInvoice.status]?.variant || 'secondary'}>
                    {STATUS_CONFIG[viewInvoice.status]?.label || viewInvoice.status}
                  </Badge>
                </div>
              </div>
              <div className="border rounded-lg p-3">
                <p className="text-xs text-muted-foreground mb-2">Items</p>
                {(viewInvoice.items as any[]).map((item: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm py-1">
                    <span>{item.description} × {item.quantity}</span>
                    <span>{format(item.quantity * item.unit_price)}</span>
                  </div>
                ))}
              </div>
              <div className="text-right space-y-1">
                <p>Subtotal: {format(viewInvoice.subtotal)}</p>
                <p>Tax: {format(viewInvoice.tax_amount)}</p>
                {viewInvoice.discount_amount > 0 && <p>Discount: -{format(viewInvoice.discount_amount)}</p>}
                <p className="font-bold text-lg">Total: {format(viewInvoice.total)}</p>
              </div>
              {viewInvoice.notes && (
                <div>
                  <p className="text-muted-foreground text-xs">Notes</p>
                  <p className="text-sm">{viewInvoice.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
