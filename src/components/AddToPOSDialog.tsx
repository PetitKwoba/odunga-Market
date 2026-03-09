import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { PackagePlus, ShoppingBag, TrendingUp } from 'lucide-react';

interface AddToPOSDialogProps {
  orderId: string;
  ownerId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface OrderItemWithProduct {
  id: string;
  quantity: number;
  unit_price: number;
  product: {
    id: string;
    name: string;
    description: string | null;
    category: string;
    images: string[] | null;
  };
}

type ItemState = Record<string, { checked: boolean; sellPrice: string; quantity: string }>;

export default function AddToPOSDialog({ orderId, ownerId, open, onOpenChange }: AddToPOSDialogProps) {
  const [items, setItems] = useState<OrderItemWithProduct[]>([]);
  const [selected, setSelected] = useState<ItemState>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !orderId) return;
    setLoading(true);
    supabase
      .from('order_items')
      .select('id, quantity, unit_price, product:products(id, name, description, category, images)')
      .eq('order_id', orderId)
      .then(({ data }) => {
        if (data) {
          setItems(data as unknown as OrderItemWithProduct[]);
          const init: ItemState = {};
          (data as unknown as OrderItemWithProduct[]).forEach((item) => {
            init[item.id] = {
              checked: true,
              sellPrice: (Number(item.unit_price) * 1.3).toFixed(2),
              quantity: String(item.quantity),
            };
          });
          setSelected(init);
        }
        setLoading(false);
      });
  }, [open, orderId]);

  const toggleAll = (checked: boolean) => {
    setSelected(s => {
      const next = { ...s };
      Object.keys(next).forEach(k => { next[k] = { ...next[k], checked }; });
      return next;
    });
  };

  const checkedCount = Object.values(selected).filter(v => v.checked).length;

  const handleSubmit = async () => {
    const toAdd = items.filter(item => selected[item.id]?.checked);
    if (toAdd.length === 0) { toast.error('Select at least one item'); return; }

    setSubmitting(true);
    const inserts = toAdd.map(item => ({
      owner_id: ownerId,
      name: item.product.name,
      description: item.product.description || '',
      category: item.product.category || '',
      images: item.product.images || [],
      price: parseFloat(selected[item.id].sellPrice) || 0,
      stock_quantity: parseInt(selected[item.id].quantity) || item.quantity,
      is_active: true,
    }));

    const { error } = await supabase.from('pos_catalog_items').insert(inserts);
    if (error) {
      toast.error('Failed to add items: ' + error.message);
    } else {
      toast.success(`${inserts.length} item(s) added to your POS catalog!`);
      onOpenChange(false);
    }
    setSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <DialogTitle className="font-display flex items-center gap-2">
            <PackagePlus className="h-5 w-5 text-primary" />
            Receive to POS Catalog
          </DialogTitle>
          <DialogDescription>
            Add received items to your POS catalog with your own selling price.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="py-8 text-center text-muted-foreground text-sm">Loading order items…</div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-sm">No items found in this order.</div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{checkedCount} of {items.length} items selected</span>
                <div className="flex gap-2">
                  <button className="text-xs text-primary underline-offset-2 hover:underline" onClick={() => toggleAll(true)}>All</button>
                  <span className="text-muted-foreground">·</span>
                  <button className="text-xs text-muted-foreground underline-offset-2 hover:underline" onClick={() => toggleAll(false)}>None</button>
                </div>
              </div>

              {items.map(item => {
                const s = selected[item.id];
                const margin = s ? ((parseFloat(s.sellPrice) - Number(item.unit_price)) / Number(item.unit_price) * 100) : 0;
                return (
                  <div
                    key={item.id}
                    className={`rounded-lg border p-4 transition-colors ${s?.checked ? 'border-primary/40 bg-primary/5' : 'border-border bg-muted/20 opacity-60'}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox
                        checked={s?.checked ?? false}
                        onCheckedChange={(checked) =>
                          setSelected(prev => ({ ...prev, [item.id]: { ...prev[item.id], checked: !!checked } }))
                        }
                        className="mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate">{item.product.name}</p>
                          {item.product.category && (
                            <Badge variant="outline" className="text-xs shrink-0">{item.product.category}</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Cost price: <span className="font-mono">${Number(item.unit_price).toFixed(2)}</span> · Ordered qty: {item.quantity}
                        </p>

                        {s?.checked && (
                          <div className="grid grid-cols-2 gap-3 mt-3">
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Your Sell Price ($)</Label>
                              <Input
                                type="number" min="0" step="0.01"
                                value={s.sellPrice}
                                onChange={e => setSelected(prev => ({ ...prev, [item.id]: { ...prev[item.id], sellPrice: e.target.value } }))}
                                className="h-8 text-sm"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-xs text-muted-foreground">Stock to Add</Label>
                              <Input
                                type="number" min="1"
                                value={s.quantity}
                                onChange={e => setSelected(prev => ({ ...prev, [item.id]: { ...prev[item.id], quantity: e.target.value } }))}
                                className="h-8 text-sm"
                              />
                            </div>
                            {!isNaN(margin) && parseFloat(s.sellPrice) > 0 && (
                              <div className="col-span-2 flex items-center gap-1 text-xs">
                                <TrendingUp className="h-3 w-3 text-green-600" />
                                <span className={margin >= 0 ? 'text-green-600' : 'text-destructive'}>
                                  {margin >= 0 ? '+' : ''}{margin.toFixed(0)}% margin
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-4 border-t flex gap-2">
          <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="flex-1" onClick={handleSubmit} disabled={submitting || loading || checkedCount === 0}>
            <ShoppingBag className="mr-1.5 h-4 w-4" />
            {submitting ? 'Adding…' : `Add ${checkedCount} Item${checkedCount !== 1 ? 's' : ''} to POS`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
