import { useParams, useNavigate } from 'react-router-dom';
import { mockProducts, mockProducerProfiles } from '@/lib/mock-data';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, ArrowLeft, ShoppingCart, Shield, Clock, Boxes } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();
  const product = mockProducts.find(p => p.id === id);
  const [qty, setQty] = useState('');

  if (!product) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center px-4 py-20">
        <p className="text-muted-foreground">Product not found.</p>
        <Button variant="link" onClick={() => navigate('/products')}>Browse products</Button>
      </div>
    );
  }

  const producer = mockProducerProfiles.find(p => p.user_id === product.producer_id);

  const handleAddToCart = () => {
    const quantity = parseInt(qty);
    if (!quantity || quantity < product.moq) {
      toast.error(`Minimum order quantity is ${product.moq}`);
      return;
    }
    addItem(product, quantity);
    toast.success(`Added ${quantity}x ${product.name} to cart`);
    setQty('');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/products')}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Products
      </Button>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* Image */}
        <div className="aspect-square rounded-xl bg-muted flex items-center justify-center">
          <Package className="h-20 w-20 text-muted-foreground/30" />
        </div>

        {/* Info */}
        <div>
          <div className="flex items-start gap-2">
            <Badge variant="secondary">{product.category}</Badge>
            {product.stock_quantity > 0 && <Badge className="bg-success text-success-foreground">In Stock</Badge>}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold">{product.name}</h1>
          <p className="mt-1 text-muted-foreground">{product.producer_name} · {product.producer_country}</p>

          <p className="mt-4 text-foreground/80">{product.description}</p>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold">${product.base_price.toFixed(2)}</span>
            <span className="text-muted-foreground">/ unit</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Boxes className="h-4 w-4" /> MOQ: {product.moq}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Lead: {product.lead_time_days} days</span>
            <span className="flex items-center gap-1"><Shield className="h-4 w-4" /> Verified Producer</span>
          </div>

          {/* Bulk pricing */}
          <Card className="mt-6">
            <CardContent className="p-4">
              <h3 className="font-display font-semibold mb-2">Bulk Pricing</h3>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Price / Unit</TableHead>
                    <TableHead>Savings</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {product.bulk_pricing.map((tier, i) => (
                    <TableRow key={i}>
                      <TableCell>{tier.min_qty}{tier.max_qty ? ` – ${tier.max_qty}` : '+'}</TableCell>
                      <TableCell className="font-semibold">${tier.price.toFixed(2)}</TableCell>
                      <TableCell className="text-success">
                        {tier.price < product.base_price
                          ? `-${((1 - tier.price / product.base_price) * 100).toFixed(0)}%`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Add to cart */}
          {user?.role === 'wholesaler' ? (
            <div className="mt-6 flex items-end gap-3">
              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium">Quantity (min {product.moq})</label>
                <Input type="number" min={product.moq} value={qty} onChange={e => setQty(e.target.value)} placeholder={`${product.moq}`} />
              </div>
              <Button onClick={handleAddToCart} className="gap-1">
                <ShoppingCart className="h-4 w-4" /> Add to Cart
              </Button>
            </div>
          ) : (
            <div className="mt-6 rounded-lg border bg-muted/50 p-4 text-center text-sm text-muted-foreground">
              {user ? 'Only wholesalers can place orders.' : (
                <>
                  <Button variant="link" onClick={() => navigate('/signup?role=wholesaler')}>Sign up as a Wholesaler</Button> to place orders.
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
