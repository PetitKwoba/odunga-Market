import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Plus, Package, Receipt, ShoppingCart, Trash2, Search, DollarSign, FileText, Download, Pencil, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { generateInvoicePDF } from './InvoicePDF';

interface CatalogItem {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock_quantity: number;
  sku: string;
  is_active: boolean;
}

interface CartLineItem {
  item: CatalogItem;
  quantity: number;
}

interface Invoice {
  id: string;
  client_name: string;
  client_email: string;
  client_phone: string;
  items: any[];
  subtotal: number;
  tax: number;
  total: number;
  status: string;
  invoice_number: string;
  due_date: string | null;
  notes: string;
  created_at: string;
}

interface Transaction {
  id: string;
  customer_name: string;
  items: any[];
  total: number;
  payment_method: string;
  created_at: string;
  notes: string | null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES' }).format(amount);
}

const DEFAULT_TAX_RATE = 16; // Kenya VAT

export default function POSDashboard() {
  const { user } = useAuth();
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [cart, setCart] = useState<CartLineItem[]>([]);
  const [search, setSearch] = useState('');
  const [addItemOpen, setAddItemOpen] = useState(false);
  const [editItemOpen, setEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const [customerName, setCustomerName] = useState('Walk-in');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [transactionCode, setTransactionCode] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Tax config
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE);
  const [taxLabel, setTaxLabel] = useState('VAT');

  // New item form
  const [itemForm, setItemForm] = useState({ name: '', description: '', category: '', price: '', stock_quantity: '', sku: '' });
  // Edit item form
  const [editForm, setEditForm] = useState({ name: '', description: '', category: '', price: '', stock_quantity: '', sku: '' });
  // Invoice form
  const [invoiceForm, setInvoiceForm] = useState({ client_name: '', client_email: '', client_phone: '', notes: '', due_date: '' });

  // Branding info
  const [branding, setBranding] = useState<{ business_name: string; logo_url: string | null; phone: string; email: string; address: string; city: string; country: string }>({
    business_name: '', logo_url: null, phone: '', email: '', address: '', city: '', country: '',
  });

  useEffect(() => {
    if (!user) return;
    fetchCatalog();
    fetchTransactions();
    fetchInvoices();
    fetchBranding();
    // Load tax settings from localStorage
    const savedTax = localStorage.getItem(`pos_tax_${user.id}`);
    if (savedTax) {
      try {
        const t = JSON.parse(savedTax);
        setTaxEnabled(t.enabled ?? true);
        setTaxRate(t.rate ?? DEFAULT_TAX_RATE);
        setTaxLabel(t.label ?? 'VAT');
      } catch {}
    }
  }, [user]);

  // Save tax settings
  useEffect(() => {
    if (!user) return;
    localStorage.setItem(`pos_tax_${user.id}`, JSON.stringify({ enabled: taxEnabled, rate: taxRate, label: taxLabel }));
  }, [taxEnabled, taxRate, taxLabel, user]);

  const fetchBranding = async () => {
    const { data } = await supabase.from('profiles').select('business_name, logo_url, phone, email, address, city, country').eq('user_id', user!.id).single();
    if (data) setBranding({
      business_name: data.business_name || data.email || 'My Business',
      logo_url: data.logo_url,
      phone: data.phone || '',
      email: data.email || '',
      address: data.address || '',
      city: data.city || '',
      country: data.country || '',
    });
  };

  const fetchCatalog = async () => {
    const { data } = await supabase.from('pos_catalog_items').select('*').eq('owner_id', user!.id).order('name');
    if (data) setCatalog(data as CatalogItem[]);
  };

  const fetchTransactions = async () => {
    const { data } = await supabase.from('pos_transactions').select('*').eq('owner_id', user!.id).order('created_at', { ascending: false }).limit(50);
    if (data) setTransactions(data as Transaction[]);
  };

  const fetchInvoices = async () => {
    const { data } = await supabase.from('pos_invoices').select('*').eq('owner_id', user!.id).order('created_at', { ascending: false });
    if (data) setInvoices(data as Invoice[]);
  };

  const addCatalogItem = async () => {
    if (!itemForm.name || !itemForm.price) { toast.error('Name and price required'); return; }
    const { error } = await supabase.from('pos_catalog_items').insert({
      owner_id: user!.id,
      name: itemForm.name,
      description: itemForm.description,
      category: itemForm.category,
      price: parseFloat(itemForm.price),
      stock_quantity: parseInt(itemForm.stock_quantity) || 0,
      sku: itemForm.sku,
    });
    if (error) { toast.error('Failed to add item'); return; }
    toast.success('Item added');
    setItemForm({ name: '', description: '', category: '', price: '', stock_quantity: '', sku: '' });
    setAddItemOpen(false);
    fetchCatalog();
  };

  const openEditItem = (item: CatalogItem) => {
    setEditingItem(item);
    setEditForm({
      name: item.name,
      description: item.description || '',
      category: item.category || '',
      price: item.price.toString(),
      stock_quantity: item.stock_quantity.toString(),
      sku: item.sku || '',
    });
    setEditItemOpen(true);
  };

  const updateCatalogItem = async () => {
    if (!editingItem || !editForm.name || !editForm.price) { toast.error('Name and price required'); return; }
    const { error } = await supabase.from('pos_catalog_items').update({
      name: editForm.name,
      description: editForm.description,
      category: editForm.category,
      price: parseFloat(editForm.price),
      stock_quantity: parseInt(editForm.stock_quantity) || 0,
      sku: editForm.sku,
    }).eq('id', editingItem.id);
    if (error) { toast.error('Failed to update item'); return; }
    toast.success('Item updated');
    setEditItemOpen(false);
    setEditingItem(null);
    fetchCatalog();
  };

  const deleteCatalogItem = async (id: string) => {
    const { error } = await supabase.from('pos_catalog_items').delete().eq('id', id);
    if (error) { toast.error('Failed to delete item'); return; }
    toast.success('Item deleted');
    setDeleteConfirmId(null);
    // Remove from cart if present
    setCart(prev => prev.filter(c => c.item.id !== id));
    fetchCatalog();
  };

  const addToCart = (item: CatalogItem) => {
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      return [...prev, { item, quantity: 1 }];
    });
  };

  const updateCartQty = (itemId: string, qty: number) => {
    if (qty <= 0) { setCart(prev => prev.filter(c => c.item.id !== itemId)); return; }
    setCart(prev => prev.map(c => c.item.id === itemId ? { ...c, quantity: qty } : c));
  };

  const cartSubtotal = cart.reduce((s, c) => s + c.item.price * c.quantity, 0);
  const cartTax = taxEnabled ? cartSubtotal * (taxRate / 100) : 0;
  const cartTotal = cartSubtotal + cartTax;

  const completeSale = async () => {
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    const items = cart.map(c => ({ name: c.item.name, quantity: c.quantity, price: c.item.price, subtotal: c.item.price * c.quantity }));
    const { error } = await supabase.from('pos_transactions').insert({
      owner_id: user!.id,
      customer_name: customerName || 'Walk-in',
      items,
      subtotal: cartSubtotal,
      tax: cartTax,
      total: cartTotal,
      payment_method: paymentMethod,
      notes: transactionCode ? `Ref: ${transactionCode}` : '',
    });
    if (error) { toast.error('Failed to record sale'); return; }

    for (const c of cart) {
      await supabase.from('pos_catalog_items').update({ stock_quantity: Math.max(0, c.item.stock_quantity - c.quantity) }).eq('id', c.item.id);
    }

    toast.success('Sale completed! 🎉');
    setCart([]);
    setCustomerName('Walk-in');
    setTransactionCode('');
    fetchCatalog();
    fetchTransactions();
  };

  const createInvoice = async () => {
    if (cart.length === 0) { toast.error('Add items to cart first'); return; }
    if (!invoiceForm.client_name) { toast.error('Client name required'); return; }
    const items = cart.map(c => ({ name: c.item.name, quantity: c.quantity, price: c.item.price, subtotal: c.item.price * c.quantity }));
    const invNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

    const { error } = await supabase.from('pos_invoices').insert({
      owner_id: user!.id,
      client_name: invoiceForm.client_name,
      client_email: invoiceForm.client_email,
      client_phone: invoiceForm.client_phone,
      items,
      subtotal: cartSubtotal,
      tax: cartTax,
      total: cartTotal,
      invoice_number: invNumber,
      due_date: invoiceForm.due_date || null,
      notes: invoiceForm.notes,
      status: 'sent',
    });
    if (error) { toast.error('Failed to create invoice'); return; }
    toast.success(`Invoice ${invNumber} created`);
    setCart([]);
    setInvoiceOpen(false);
    setInvoiceForm({ client_name: '', client_email: '', client_phone: '', notes: '', due_date: '' });
    fetchInvoices();
  };

  const updateInvoiceStatus = async (id: string, status: string) => {
    const { error } = await supabase.from('pos_invoices').update({ status }).eq('id', id);
    if (error) toast.error('Failed to update');
    else { toast.success('Invoice updated'); fetchInvoices(); }
  };

  const downloadInvoicePDF = async (inv: Invoice) => {
    const logoPublicUrl = branding.logo_url
      ? supabase.storage.from('avatars').getPublicUrl(branding.logo_url).data.publicUrl
      : null;

    await generateInvoicePDF({
      invoice_number: inv.invoice_number,
      client_name: inv.client_name,
      client_email: inv.client_email,
      client_phone: inv.client_phone,
      due_date: inv.due_date,
      notes: inv.notes,
      items: inv.items as any[],
      subtotal: Number(inv.subtotal),
      tax: Number(inv.tax),
      total: Number(inv.total),
      created_at: inv.created_at,
      business_name: branding.business_name,
      logo_url: logoPublicUrl,
      phone: branding.phone,
      email: branding.email,
      address: branding.address,
      city: branding.city,
      country: branding.country,
    });
  };

  const filteredCatalog = catalog.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase()) ||
    (item.sku || '').toLowerCase().includes(search.toLowerCase()) ||
    (item.category || '').toLowerCase().includes(search.toLowerCase())
  );

  if (!user) return null;

  const todaySales = transactions
    .filter(t => new Date(t.created_at).toDateString() === new Date().toDateString())
    .reduce((s, t) => s + Number(t.total), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Point of Sale</h2>
          <p className="text-sm text-muted-foreground">Manage private catalog, in-person sales & invoices</p>
        </div>
        <Badge variant="outline" className="gap-1.5 px-3 py-1.5">
          <DollarSign className="h-3.5 w-3.5" />
          Today: {formatCurrency(todaySales)}
        </Badge>
      </div>

      <Tabs defaultValue="terminal">
        <TabsList>
          <TabsTrigger value="terminal"><ShoppingCart className="mr-1 h-4 w-4" /> Sales Terminal</TabsTrigger>
          <TabsTrigger value="catalog"><Package className="mr-1 h-4 w-4" /> Catalog</TabsTrigger>
          <TabsTrigger value="invoices"><FileText className="mr-1 h-4 w-4" /> Invoices</TabsTrigger>
          <TabsTrigger value="history"><Receipt className="mr-1 h-4 w-4" /> History</TabsTrigger>
          <TabsTrigger value="settings"><Settings className="mr-1 h-4 w-4" /> Tax Settings</TabsTrigger>
        </TabsList>

        {/* ─── SALES TERMINAL ─── */}
        <TabsContent value="terminal" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
                </div>
                <Button variant="outline" onClick={() => setAddItemOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add Item</Button>
              </div>
              {filteredCatalog.length === 0 ? (
                <Card><CardContent className="py-8 text-center text-muted-foreground">
                  {catalog.length === 0 ? 'No catalog items yet. Add your first item!' : 'No items match your search.'}
                </CardContent></Card>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredCatalog.map(item => (
                    <Card key={item.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => addToCart(item)}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="font-semibold text-sm">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.category || 'Uncategorized'}</p>
                          </div>
                          <p className="font-display font-bold text-sm">{formatCurrency(item.price)}</p>
                        </div>
                        <div className="mt-2 flex justify-between text-xs text-muted-foreground">
                          <span>Stock: {item.stock_quantity}</span>
                          {item.sku && <span>SKU: {item.sku}</span>}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Cart */}
            <Card className="h-fit sticky top-20">
              <CardHeader className="py-3 px-4 border-b">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" /> Cart ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs">Customer</Label>
                  <Input value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Walk-in" className="h-8 text-sm" />
                </div>

                {cart.length === 0 ? (
                  <p className="text-center text-sm text-muted-foreground py-4">Tap products to add</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {cart.map(c => (
                      <div key={c.item.id} className="flex items-center gap-2 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-medium">{c.item.name}</p>
                          <p className="text-xs text-muted-foreground">{formatCurrency(c.item.price)}</p>
                        </div>
                        <Input type="number" min={1} value={c.quantity} onChange={e => updateCartQty(c.item.id, parseInt(e.target.value) || 0)} className="w-14 h-7 text-center text-xs" />
                        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => updateCartQty(c.item.id, 0)}>
                          <Trash2 className="h-3 w-3 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal</span>
                    <span>{formatCurrency(cartSubtotal)}</span>
                  </div>
                  {taxEnabled && (
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>{taxLabel} ({taxRate}%)</span>
                      <span>{formatCurrency(cartTax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-display font-bold text-lg">
                    <span>Total</span>
                    <span>{formatCurrency(cartTotal)}</span>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="mpesa">M-Pesa</SelectItem>
                        <SelectItem value="card">Card</SelectItem>
                        <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Transaction / Reference Code</Label>
                    <Input
                      value={transactionCode}
                      onChange={e => setTransactionCode(e.target.value)}
                      placeholder="e.g. M-Pesa code, receipt #"
                      className="h-8 text-sm"
                    />
                  </div>
                  <Button className="w-full" onClick={completeSale} disabled={cart.length === 0}>
                    Complete Sale
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => setInvoiceOpen(true)} disabled={cart.length === 0}>
                    <FileText className="mr-1 h-4 w-4" /> Create Invoice Instead
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── CATALOG ─── */}
        <TabsContent value="catalog" className="mt-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-semibold">Private Catalog ({catalog.length} items)</h3>
            <Button onClick={() => setAddItemOpen(true)}><Plus className="mr-1 h-4 w-4" /> Add Item</Button>
          </div>
          {catalog.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No items in your private catalog.</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalog.map(item => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>{item.category || '-'}</TableCell>
                      <TableCell className="font-mono text-xs">{item.sku || '-'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(item.price)}</TableCell>
                      <TableCell className="text-right">{item.stock_quantity}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditItem(item)} title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setDeleteConfirmId(item.id)} title="Delete">
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ─── INVOICES ─── */}
        <TabsContent value="invoices" className="mt-4 space-y-4">
          <h3 className="font-display font-semibold">Invoices ({invoices.length})</h3>
          {invoices.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No invoices yet. Create one from the sales terminal.</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map(inv => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-mono text-sm">{inv.invoice_number}</TableCell>
                      <TableCell>{inv.client_name}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(Number(inv.total))}</TableCell>
                      <TableCell>
                        <Badge variant={inv.status === 'paid' ? 'default' : inv.status === 'overdue' ? 'destructive' : 'outline'}>
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(inv.created_at).toLocaleDateString('en-KE')}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => downloadInvoicePDF(inv)} title="Download PDF">
                            <Download className="h-4 w-4" />
                          </Button>
                          <Select defaultValue={inv.status} onValueChange={v => updateInvoiceStatus(inv.id, v)}>
                            <SelectTrigger className="w-24 h-8 text-xs"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {['draft', 'sent', 'paid', 'overdue', 'cancelled'].map(s => (
                                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ─── HISTORY ─── */}
        <TabsContent value="history" className="mt-4 space-y-4">
          <h3 className="font-display font-semibold">Sales History</h3>
          {transactions.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">No sales yet.</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Ref Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {transactions.map(tx => (
                    <TableRow key={tx.id}>
                      <TableCell>{new Date(tx.created_at).toLocaleString('en-KE', { dateStyle: 'short', timeStyle: 'short' })}</TableCell>
                      <TableCell>{tx.customer_name}</TableCell>
                      <TableCell className="text-sm">{(tx.items as any[]).map(i => `${i.name} x${i.quantity}`).join(', ')}</TableCell>
                      <TableCell className="text-right font-semibold">{formatCurrency(Number(tx.total))}</TableCell>
                      <TableCell><Badge variant="outline">{tx.payment_method}</Badge></TableCell>
                      <TableCell className="font-mono text-xs">{tx.notes?.replace('Ref: ', '') || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent></Card>
          )}
        </TabsContent>

        {/* ─── TAX SETTINGS ─── */}
        <TabsContent value="settings" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Tax / VAT Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">Enable Tax</p>
                  <p className="text-xs text-muted-foreground">Automatically apply tax to sales and invoices</p>
                </div>
                <Switch checked={taxEnabled} onCheckedChange={setTaxEnabled} />
              </div>
              {taxEnabled && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Tax Label</Label>
                      <Input value={taxLabel} onChange={e => setTaxLabel(e.target.value)} placeholder="e.g. VAT, GST, Sales Tax" />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Rate (%)</Label>
                      <Input type="number" min={0} max={100} step={0.5} value={taxRate} onChange={e => setTaxRate(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                  <div className="rounded-lg border bg-muted/50 p-3">
                    <p className="text-sm">
                      <strong>Preview:</strong> A {formatCurrency(1000)} item will have {formatCurrency(1000 * taxRate / 100)} {taxLabel} added, totalling {formatCurrency(1000 + 1000 * taxRate / 100)}.
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Item Dialog */}
      <Dialog open={addItemOpen} onOpenChange={setAddItemOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Catalog Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Name *</Label><Input value={itemForm.name} onChange={e => setItemForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label>Price (KES) *</Label><Input type="number" value={itemForm.price} onChange={e => setItemForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Stock Qty</Label><Input type="number" value={itemForm.stock_quantity} onChange={e => setItemForm(f => ({ ...f, stock_quantity: e.target.value }))} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label>Category</Label><Input value={itemForm.category} onChange={e => setItemForm(f => ({ ...f, category: e.target.value }))} /></div>
              <div className="space-y-1"><Label>SKU</Label><Input value={itemForm.sku} onChange={e => setItemForm(f => ({ ...f, sku: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={itemForm.description} onChange={e => setItemForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddItemOpen(false)}>Cancel</Button>
            <Button onClick={addCatalogItem}>Add Item</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
      <Dialog open={editItemOpen} onOpenChange={setEditItemOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Catalog Item</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Name *</Label><Input value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label>Price (KES) *</Label><Input type="number" value={editForm.price} onChange={e => setEditForm(f => ({ ...f, price: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Stock Qty</Label><Input type="number" value={editForm.stock_quantity} onChange={e => setEditForm(f => ({ ...f, stock_quantity: e.target.value }))} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label>Category</Label><Input value={editForm.category} onChange={e => setEditForm(f => ({ ...f, category: e.target.value }))} /></div>
              <div className="space-y-1"><Label>SKU</Label><Input value={editForm.sku} onChange={e => setEditForm(f => ({ ...f, sku: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Description</Label><Textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditItemOpen(false)}>Cancel</Button>
            <Button onClick={updateCatalogItem}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm Dialog */}
      <Dialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Item</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete this catalog item? This action cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteConfirmId && deleteCatalogItem(deleteConfirmId)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Dialog */}
      <Dialog open={invoiceOpen} onOpenChange={setInvoiceOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1"><Label>Client Name *</Label><Input value={invoiceForm.client_name} onChange={e => setInvoiceForm(f => ({ ...f, client_name: e.target.value }))} /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1"><Label>Client Email</Label><Input type="email" value={invoiceForm.client_email} onChange={e => setInvoiceForm(f => ({ ...f, client_email: e.target.value }))} /></div>
              <div className="space-y-1"><Label>Client Phone</Label><Input value={invoiceForm.client_phone} onChange={e => setInvoiceForm(f => ({ ...f, client_phone: e.target.value }))} /></div>
            </div>
            <div className="space-y-1"><Label>Due Date</Label><Input type="date" value={invoiceForm.due_date} onChange={e => setInvoiceForm(f => ({ ...f, due_date: e.target.value }))} /></div>
            <div className="space-y-1"><Label>Notes</Label><Textarea value={invoiceForm.notes} onChange={e => setInvoiceForm(f => ({ ...f, notes: e.target.value }))} /></div>
            <div className="border-t pt-2 space-y-1">
              <p className="text-sm font-semibold">Items ({cart.length}):</p>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {cart.map(c => (
                  <div key={c.item.id} className="flex justify-between text-xs text-muted-foreground">
                    <span>{c.item.name} × {c.quantity}</span>
                    <span>{formatCurrency(c.item.price * c.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-xs pt-1"><span>Subtotal</span><span>{formatCurrency(cartSubtotal)}</span></div>
              {taxEnabled && <div className="flex justify-between text-xs text-muted-foreground"><span>{taxLabel} ({taxRate}%)</span><span>{formatCurrency(cartTax)}</span></div>}
              <p className="text-sm font-bold pt-1">Total: {formatCurrency(cartTotal)}</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInvoiceOpen(false)}>Cancel</Button>
            <Button onClick={createInvoice}>Create Invoice</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
