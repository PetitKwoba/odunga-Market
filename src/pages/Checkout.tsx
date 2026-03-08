import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCart, getUnitPrice } from '@/lib/cart-context';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, ArrowLeft, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';

export default function Checkout() {
  const { items, updateQuantity, removeItem, clearCart, total } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [shipping, setShipping] = useState({ name: '', address: '', city: '', country: '', phone: '' });
  const [submitting, setSubmitting] = useState(false);

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

  const handleOrder = () => {
    if (!shipping.name || !shipping.address || !shipping.city || !shipping.country || !shipping.phone) {
      toast.error('Please fill in all shipping fields');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      clearCart();
      toast.success('Order placed successfully! 🎉');
      navigate('/dashboard/wholesaler');
      setSubmitting(false);
    }, 1000);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/products')}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Continue Shopping
      </Button>
      <h1 className="font-display text-3xl font-bold mb-6">Checkout</h1>

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Cart items */}
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Order Summary</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Subtotal</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map(item => {
                    const price = getUnitPrice(item.product, item.quantity);
                    return (
                      <TableRow key={item.product.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">{item.product.producer_name}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={item.product.moq}
                            value={item.quantity}
                            onChange={e => updateQuantity(item.product.id, parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>${price.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">${(price * item.quantity).toFixed(2)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeItem(item.product.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Shipping */}
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Shipping Details</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Full Name</Label><Input value={shipping.name} onChange={e => setShipping(s => ({ ...s, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Phone</Label><Input value={shipping.phone} onChange={e => setShipping(s => ({ ...s, phone: e.target.value }))} /></div>
              <div className="space-y-2 sm:col-span-2"><Label>Address</Label><Input value={shipping.address} onChange={e => setShipping(s => ({ ...s, address: e.target.value }))} /></div>
              <div className="space-y-2"><Label>City</Label><Input value={shipping.city} onChange={e => setShipping(s => ({ ...s, city: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Country</Label><Input value={shipping.country} onChange={e => setShipping(s => ({ ...s, country: e.target.value }))} /></div>
            </CardContent>
          </Card>
        </div>

        {/* Order total */}
        <div>
          <Card className="sticky top-20">
            <CardHeader><CardTitle className="font-display text-lg">Total</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items ({items.length})</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Shipping</span>
                <span className="text-muted-foreground">TBD</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-display font-bold text-lg">
                <span>Total</span>
                <span>${total.toFixed(2)}</span>
              </div>
              <Button className="w-full mt-2" size="lg" onClick={handleOrder} disabled={submitting}>
                {submitting ? 'Placing Order...' : 'Place Order'}
              </Button>
              <p className="text-xs text-center text-muted-foreground">Payment details will be arranged with the producer.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
