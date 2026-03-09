import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Plus, Percent, DollarSign, Trash2, Edit, Copy } from 'lucide-react';

interface DiscountCode {
  id: string;
  code: string;
  description: string | null;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_uses: number | null;
  used_count: number;
  valid_from: string;
  valid_until: string | null;
  is_active: boolean;
  applicable_to: string;
  created_at: string;
}

interface DiscountManagerProps {
  mode?: 'admin' | 'producer';
}

export default function DiscountManager({ mode = 'admin' }: DiscountManagerProps) {
  const { user } = useAuth();
  const [discounts, setDiscounts] = useState<DiscountCode[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editDiscount, setEditDiscount] = useState<DiscountCode | null>(null);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    code: '',
    description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '',
    min_order_amount: '0',
    max_uses: '',
    valid_until: '',
    applicable_to: 'all',
  });

  useEffect(() => {
    fetchDiscounts();
  }, []);

  const fetchDiscounts = async () => {
    const { data } = await supabase
      .from('discount_codes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setDiscounts(data as DiscountCode[]);
  };

  const generateCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm(f => ({ ...f, code }));
  };

  const handleCreate = async () => {
    if (!form.code || !form.discount_value) {
      toast.error('Please fill in required fields');
      return;
    }
    setLoading(true);

    try {
      const { error } = await supabase.from('discount_codes').insert({
        code: form.code.toUpperCase(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order_amount: parseFloat(form.min_order_amount) || 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_until: form.valid_until || null,
        applicable_to: form.applicable_to,
        created_by: user?.id,
      });

      if (error) throw error;

      toast.success('Discount code created!');
      setCreateOpen(false);
      resetForm();
      fetchDiscounts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!editDiscount) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('discount_codes').update({
        code: form.code.toUpperCase(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: parseFloat(form.discount_value),
        min_order_amount: parseFloat(form.min_order_amount) || 0,
        max_uses: form.max_uses ? parseInt(form.max_uses) : null,
        valid_until: form.valid_until || null,
        applicable_to: form.applicable_to,
      }).eq('id', editDiscount.id);

      if (error) throw error;

      toast.success('Discount code updated!');
      setEditDiscount(null);
      resetForm();
      fetchDiscounts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, is_active: boolean) => {
    await supabase.from('discount_codes').update({ is_active: !is_active }).eq('id', id);
    fetchDiscounts();
    toast.success(`Discount ${is_active ? 'deactivated' : 'activated'}`);
  };

  const deleteDiscount = async (id: string) => {
    if (!confirm('Are you sure you want to delete this discount code?')) return;
    await supabase.from('discount_codes').delete().eq('id', id);
    fetchDiscounts();
    toast.success('Discount code deleted');
  };

  const resetForm = () => {
    setForm({
      code: '',
      description: '',
      discount_type: 'percentage',
      discount_value: '',
      min_order_amount: '0',
      max_uses: '',
      valid_until: '',
      applicable_to: 'all',
    });
  };

  const openEdit = (d: DiscountCode) => {
    setEditDiscount(d);
    setForm({
      code: d.code,
      description: d.description || '',
      discount_type: d.discount_type,
      discount_value: String(d.discount_value),
      min_order_amount: String(d.min_order_amount),
      max_uses: d.max_uses ? String(d.max_uses) : '',
      valid_until: d.valid_until ? d.valid_until.split('T')[0] : '',
      applicable_to: d.applicable_to,
    });
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success('Code copied!');
  };

  const totalUsage = discounts.reduce((sum, d) => sum + d.used_count, 0);
  const activeCount = discounts.filter(d => d.is_active).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold">Discount Codes</h2>
          <p className="text-sm text-muted-foreground">Create and manage promotional codes</p>
        </div>
        <Button onClick={() => { resetForm(); setCreateOpen(true); }}>
          <Plus className="mr-1 h-4 w-4" /> Create Code
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Codes</p>
              <p className="font-display text-2xl font-bold">{discounts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20 text-secondary">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active</p>
              <p className="font-display text-2xl font-bold">{activeCount}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
              <Copy className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Uses</p>
              <p className="font-display text-2xl font-bold">{totalUsage}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Discounts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Discount</TableHead>
                <TableHead>Min Order</TableHead>
                <TableHead>Usage</TableHead>
                <TableHead>Valid Until</TableHead>
                <TableHead>Status</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {discounts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-12 text-center text-muted-foreground">
                    No discount codes yet
                  </TableCell>
                </TableRow>
              ) : (
                discounts.map(d => (
                  <TableRow key={d.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-muted px-2 py-1 font-mono text-sm">{d.code}</code>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyCode(d.code)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      {d.description && <p className="text-xs text-muted-foreground mt-1">{d.description}</p>}
                    </TableCell>
                    <TableCell>
                      {d.discount_type === 'percentage' ? (
                        <span className="font-semibold">{d.discount_value}% off</span>
                      ) : (
                        <span className="font-semibold">${d.discount_value} off</span>
                      )}
                    </TableCell>
                    <TableCell>${d.min_order_amount}</TableCell>
                    <TableCell>
                      {d.used_count}{d.max_uses ? ` / ${d.max_uses}` : ''}
                    </TableCell>
                    <TableCell>
                      {d.valid_until ? new Date(d.valid_until).toLocaleDateString() : 'No expiry'}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={d.is_active}
                        onCheckedChange={() => toggleActive(d.id, d.is_active)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(d)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteDiscount(d.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={createOpen || !!editDiscount} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setEditDiscount(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editDiscount ? 'Edit Discount Code' : 'Create Discount Code'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Code</Label>
              <div className="flex gap-2">
                <Input
                  value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="SUMMER2025"
                  className="font-mono"
                />
                <Button type="button" variant="outline" onClick={generateCode}>Generate</Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Summer sale discount"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Discount Type</Label>
                <Select value={form.discount_type} onValueChange={v => setForm(f => ({ ...f, discount_type: v as any }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (%)</SelectItem>
                    <SelectItem value="fixed">Fixed Amount ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  value={form.discount_value}
                  onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                  placeholder={form.discount_type === 'percentage' ? '10' : '50'}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Min Order Amount</Label>
                <Input
                  type="number"
                  value={form.min_order_amount}
                  onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label>Max Uses (optional)</Label>
                <Input
                  type="number"
                  value={form.max_uses}
                  onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Valid Until (optional)</Label>
              <Input
                type="date"
                value={form.valid_until}
                onChange={e => setForm(f => ({ ...f, valid_until: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Applicable To</Label>
              <Select value={form.applicable_to} onValueChange={v => setForm(f => ({ ...f, applicable_to: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Orders</SelectItem>
                  <SelectItem value="first_order">First Order Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setEditDiscount(null); }}>Cancel</Button>
            <Button onClick={editDiscount ? handleUpdate : handleCreate} disabled={loading}>
              {loading ? 'Saving...' : editDiscount ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
