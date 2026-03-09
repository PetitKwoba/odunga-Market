import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, getUnitPrice } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { useCurrency } from '@/lib/currency-context';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Trash2, ArrowLeft, ShoppingCart, Info, Tag, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { ShippingAddress } from '@/lib/types';

const PLATFORM_FEE_PERCENT = 5;

export default function Checkout() {
  const { items, updateQuantity, removeItem, clearCart, total } = useCart();
  const { user } = useAuth();
  const { format } = useCurrency();
  const navigate = useNavigate();
  const [shipping, setShipping] = useState({ name: '', address: '', city: '', country: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saveAsDefault, setSaveAsDefault] = useState(true);
  const [discountCode, setDiscountCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<{ id: string; code: string; type: string; value: number; amount: number } | null>(null);
  const [applyingCode, setApplyingCode] = useState(false);

  // Fetch user profile and last order to pre-fill shipping details
  useEffect(() => {
    const fetchShippingDetails = async () => {
      if (!user) return;

      try {
        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('name, phone, address, city, country')
          .eq('user_id', user.id)
          .single();

        // Fetch most recent order to get last used shipping address
        const { data: lastOrder } = await supabase
          .from('orders')
          .select('shipping_address')
          .eq('wholesaler_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Prioritize last order's shipping address, fallback to profile
        if (lastOrder?.shipping_address) {
          const addr = lastOrder.shipping_address as unknown as ShippingAddress;
          setShipping({
            name: addr.name || '',
            address: addr.address || '',
            city: addr.city || '',
            country: addr.country || '',
            phone: addr.phone || '',
          });
        } else if (profile) {
          setShipping({
            name: profile.name || '',
            address: profile.address || '',
            city: profile.city || '',
            country: profile.country || '',
            phone: profile.phone || '',
          });
        }
      } catch (error) {
        console.error('Error fetching shipping details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchShippingDetails();
  }, [user]);

  if (!user || user.role !== 'wholesaler') {
    return (
      <div className="container mx-auto flex flex-col items-center px-4 py-20">
        <p className="text-muted-foreground">Only wholesalers can checkout.</p>
        <Button variant="link" onClick={() => navigate('/products')}>Browse products</Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="container mx-auto flex flex-col items-center px-4 py-20">
        <ShoppingCart className="h-12 w-12 text-muted-foreground/40 mb-3" />
        <p className="text-muted-foreground">Your cart is empty.</p>
        <Button variant="link" onClick={() => navigate('/products')}>Browse products</Button>
      </div>
    );
  }

  const handleOrder = async () => {
    if (!shipping.name || !shipping.address || !shipping.city || !shipping.country || !shipping.phone) {
      toast.error('Please fill in all shipping fields');
      return;
    }
    setSubmitting(true);

    try {
      // Create order in DB
      const { data: order, error: orderError } = await supabase.from('orders').insert({
        wholesaler_id: user.id,
        total_amount: total,
        shipping_address: shipping,
        status: 'Pending',
        payment_status: 'pending',
      }).select().single();

      if (orderError || !order) {
        toast.error('Failed to create order: ' + (orderError?.message || 'Unknown error'));
        return;
      }

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        producer_id: item.product.producer_id,
        quantity: item.quantity,
        unit_price: getUnitPrice(item.product, item.quantity),
        subtotal: getUnitPrice(item.product, item.quantity) * item.quantity,
      }));

      const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
      if (itemsError) {
        toast.error('Failed to save order items: ' + itemsError.message);
        return;
      }

      // Save shipping details to profile for future use (if user opted in)
      if (saveAsDefault) {
        await supabase
          .from('profiles')
          .update({
            name: shipping.name,
            phone: shipping.phone,
            address: shipping.address,
            city: shipping.city,
            country: shipping.country,
          })
          .eq('user_id', user.id);
      }

      // Initialize Paystack payment
      const callbackUrl = `${window.location.origin}/payment/callback`;
      const { data: paystackData, error: paystackError } = await supabase.functions.invoke('paystack-initialize', {
        body: { order_id: order.id, callback_url: callbackUrl },
      });

      if (paystackError || !paystackData?.authorization_url) {
        toast.error('Payment initialization failed. Please try again.');
        return;
      }

      // Clear cart and redirect to Paystack
      clearCart();
      window.location.href = paystackData.authorization_url;
    } catch (err) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/products')}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Continue Shopping
      </Button>
      <h1 className="font-display text-3xl font-bold mb-6">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-start gap-3 p-4">
              <Info className="h-5 w-5 mt-0.5 text-primary shrink-0" />
              <div className="text-sm">
                <p className="font-medium text-foreground">How payments work on Waholo Market</p>
                <ul className="mt-1 space-y-1 text-muted-foreground">
                  <li>• Your payment is held securely by the platform.</li>
                  <li>• Producers are paid every <strong>Monday</strong>, minus referral fees and a {PLATFORM_FEE_PERCENT}% platform maintenance fee.</li>
                  <li>• The producer is responsible for arranging logistics and shipping to your address.</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Order Summary</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Price</TableHead><TableHead>Subtotal</TableHead><TableHead></TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.map(item => {
                    const price = getUnitPrice(item.product, item.quantity);
                    return (
                      <TableRow key={item.product.id}>
                        <TableCell>
                          <div><p className="font-medium">{item.product.name}</p><p className="text-xs text-muted-foreground">{item.product.producer_name}</p></div>
                        </TableCell>
                        <TableCell>
                          <Input type="number" min={item.product.moq} value={item.quantity} onChange={e => updateQuantity(item.product.id, parseInt(e.target.value) || 0)} className="w-20" />
                        </TableCell>
                        <TableCell>${price.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">${(price * item.quantity).toFixed(2)}</TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeItem(item.product.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Shipping Details</CardTitle>
              <p className="text-sm text-muted-foreground">The producer will arrange logistics to this address.</p>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input 
                  value={shipping.name} 
                  onChange={e => setShipping(s => ({ ...s, name: e.target.value }))} 
                  disabled={loading}
                  placeholder="John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input 
                  value={shipping.phone} 
                  onChange={e => setShipping(s => ({ ...s, phone: e.target.value }))} 
                  disabled={loading}
                  placeholder="+1234567890"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Input 
                  value={shipping.address} 
                  onChange={e => setShipping(s => ({ ...s, address: e.target.value }))} 
                  disabled={loading}
                  placeholder="123 Main Street"
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input 
                  value={shipping.city} 
                  onChange={e => setShipping(s => ({ ...s, city: e.target.value }))} 
                  disabled={loading}
                  placeholder="Lagos"
                />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Input 
                  value={shipping.country} 
                  onChange={e => setShipping(s => ({ ...s, country: e.target.value }))} 
                  disabled={loading}
                  placeholder="Nigeria"
                />
              </div>
              <div className="space-y-3 sm:col-span-2 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="saveDefault" 
                    checked={saveAsDefault} 
                    onCheckedChange={(checked) => setSaveAsDefault(checked as boolean)}
                  />
                  <Label 
                    htmlFor="saveDefault" 
                    className="text-sm font-normal cursor-pointer"
                  >
                    Save as my default shipping address for future orders
                  </Label>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="sticky top-20">
            <CardHeader><CardTitle className="font-display text-lg">Total</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Items ({items.length})</span><span>${total.toFixed(2)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Shipping</span><span className="text-muted-foreground">Arranged by producer</span></div>
              <div className="border-t pt-3 flex justify-between font-display font-bold text-lg"><span>Total</span><span>${total.toFixed(2)}</span></div>
              <Button className="w-full mt-2" size="lg" onClick={handleOrder} disabled={submitting}>
                {submitting ? 'Placing Order...' : 'Pay & Place Order'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Payment held by Waholo Market. Producers paid every Monday.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
