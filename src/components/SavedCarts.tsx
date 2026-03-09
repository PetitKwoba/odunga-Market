import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { BookmarkPlus, ShoppingCart, Trash2, Clock, Save } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SavedCart {
  id: string;
  name: string;
  items: Array<{ product_id: string; product_name: string; quantity: number; price: number }>;
  created_at: string;
  updated_at: string;
}

export default function SavedCarts() {
  const { user } = useAuth();
  const { items: cartItems, addItem } = useCart();
  const [carts, setCarts] = useState<SavedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveOpen, setSaveOpen] = useState(false);
  const [cartName, setCartName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchCarts();
  }, [user]);

  const fetchCarts = async () => {
    const { data, error } = await supabase
      .from('saved_carts')
      .select('*')
      .eq('user_id', user!.id)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setCarts(data.map(c => ({ ...c, items: (c.items as any) || [] })));
    }
    setLoading(false);
  };

  const saveCurrentCart = async () => {
    if (!cartName.trim()) {
      toast.error('Please enter a name for this template');
      return;
    }
    if (cartItems.length === 0) {
      toast.error('Your cart is empty');
      return;
    }

    setSaving(true);
    const items = cartItems.map(item => ({
      product_id: item.product.id,
      product_name: item.product.name,
      quantity: item.quantity,
      price: item.product.base_price,
    }));

    const { error } = await supabase.from('saved_carts').insert({
      user_id: user!.id,
      name: cartName.trim().substring(0, 100),
      items,
    });

    if (error) {
      toast.error('Failed to save cart template');
    } else {
      toast.success('Cart template saved!');
      setCartName('');
      setSaveOpen(false);
      fetchCarts();
    }
    setSaving(false);
  };

  const loadCart = async (cart: SavedCart) => {
    // Fetch current product data for each item
    const productIds = cart.items.map(i => i.product_id);
    const { data: products } = await supabase
      .from('products')
      .select('*')
      .in('id', productIds)
      .eq('is_active', true);

    if (!products || products.length === 0) {
      toast.error('Products in this template are no longer available');
      return;
    }

    let added = 0;
    for (const item of cart.items) {
      const product = products.find(p => p.id === item.product_id);
      if (product) {
        addItem({
          ...product,
          bulk_pricing: (product.bulk_pricing as any) || [],
          producer_name: '',
          producer_country: '',
        }, item.quantity);
        added++;
      }
    }

    toast.success(`Added ${added} item(s) to cart from "${cart.name}"`);
  };

  const deleteCart = async (id: string) => {
    const { error } = await supabase.from('saved_carts').delete().eq('id', id);
    if (!error) {
      setCarts(prev => prev.filter(c => c.id !== id));
      toast.success('Template deleted');
    }
  };

  if (!user) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <BookmarkPlus className="h-4 w-4" /> Order Templates
            </CardTitle>
            <CardDescription>Save and reuse your frequent orders</CardDescription>
          </div>
          <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="outline" className="gap-1" disabled={cartItems.length === 0}>
                <Save className="h-3 w-3" /> Save Current Cart
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Save Cart as Template</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    placeholder="e.g., Weekly Restock Order"
                    value={cartName}
                    onChange={e => setCartName(e.target.value)}
                    maxLength={100}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  This will save your current {cartItems.length} item(s) as a reusable template.
                </p>
                <Button onClick={saveCurrentCart} disabled={saving} className="w-full">
                  {saving ? 'Saving...' : 'Save Template'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading templates...</p>
        ) : carts.length === 0 ? (
          <div className="py-6 text-center text-sm text-muted-foreground">
            <BookmarkPlus className="mx-auto mb-2 h-8 w-8 text-muted-foreground/30" />
            <p>No saved templates yet</p>
            <p className="text-xs mt-1">Add items to your cart and save as a template</p>
          </div>
        ) : (
          <div className="space-y-2">
            {carts.map(cart => (
              <div
                key={cart.id}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-accent/5"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{cart.name}</p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Badge variant="secondary" className="text-xs">{cart.items.length} items</Badge>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(cart.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0 ml-2">
                  <Button size="sm" variant="outline" onClick={() => loadCart(cart)} className="gap-1">
                    <ShoppingCart className="h-3 w-3" /> Load
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => deleteCart(cart.id)}>
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
