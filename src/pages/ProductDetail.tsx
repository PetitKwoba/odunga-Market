import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useProducts, ProductWithProducer } from '@/hooks/use-products';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { useCurrency } from '@/lib/currency-context';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, ArrowLeft, ShoppingCart, Shield, Clock, Boxes, Copy, Share2, Heart } from 'lucide-react';
import { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Product, BulkTier } from '@/lib/types';
import ProductReviews from '@/components/ProductReviews';
import StoreReviews from '@/components/StoreReviews';
import ProductImageGallery from '@/components/ProductImageGallery';
import { useWishlist } from '@/hooks/use-wishlist';

export default function ProductDetail() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { addItem } = useCart();
  const { format } = useCurrency();
  const { data: products, isLoading } = useProducts();
  const [qty, setQty] = useState('');
  const { isInWishlist, toggle: toggleWishlist } = useWishlist();

  const refCode = searchParams.get('ref') || '';
  useEffect(() => {
    if (refCode && id) {
      const existing = JSON.parse(sessionStorage.getItem('waholo_product_refs') || '{}');
      existing[id] = refCode;
      sessionStorage.setItem('waholo_product_refs', JSON.stringify(existing));
    }
  }, [refCode, id]);

  const product = useMemo(() => (products || []).find(p => p.id === id), [products, id]);

  if (isLoading) {
    return <div className="container mx-auto flex items-center justify-center px-4 py-20"><p className="text-muted-foreground">Loading...</p></div>;
  }

  if (!product) {
    return (
      <div className="container mx-auto flex flex-col items-center justify-center px-4 py-20">
        <p className="text-muted-foreground">Product not found.</p>
        <Button variant="link" onClick={() => navigate('/products')}>Browse products</Button>
      </div>
    );
  }

  const bulkPricing: BulkTier[] = Array.isArray(product.bulk_pricing) ? product.bulk_pricing as BulkTier[] : [];

  const cartProduct: Product = {
    id: product.id,
    producer_id: product.producer_id,
    producer_name: product.producer_name,
    producer_country: product.producer_country,
    name: product.name,
    description: product.description || '',
    category: product.category,
    images: product.images || [],
    moq: product.moq,
    base_price: Number(product.base_price),
    bulk_pricing: bulkPricing,
    stock_quantity: product.stock_quantity,
    lead_time_days: product.lead_time_days,
    is_active: product.is_active,
  };

  const handleAddToCart = () => {
    const quantity = parseInt(qty);
    if (!quantity || quantity < product.moq) {
      toast.error(`Minimum order quantity is ${product.moq}`);
      return;
    }
    addItem(cartProduct, quantity);
    toast.success(`Added ${quantity}x ${product.name} to cart`);
    setQty('');
  };

  const productRefLink = user?.referral_code
    ? `${window.location.origin}/products/${product.id}?ref=${user.referral_code}`
    : null;

  const copyProductRefLink = () => {
    if (productRefLink) {
      navigator.clipboard.writeText(productRefLink);
      toast.success('Product referral link copied!');
    }
  };

  const isReferrer = user && user.role === 'referrer';
  const basePrice = Number(product.base_price);

  return (
    <div className="container mx-auto px-4 py-8">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate('/products')}>
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to Products
      </Button>

      {refCode && !user && (
        <Card className="mb-4 border-secondary/50 bg-secondary/5">
          <CardContent className="flex items-center gap-2 p-3 text-sm">
            <Share2 className="h-4 w-4 text-secondary" />
            <span>You were referred! <Button variant="link" className="h-auto p-0" onClick={() => navigate(`/signup?ref=${refCode}`)}>Sign up as a Wholesaler</Button> to place an order.</span>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-8 lg:grid-cols-2">
        {product.images && product.images.length > 0 && product.images[0] !== '/placeholder.svg' ? (
          <ProductImageGallery images={product.images} productName={product.name} />
        ) : (
          <div className="aspect-square rounded-xl bg-muted flex items-center justify-center">
            <Package className="h-20 w-20 text-muted-foreground/30" />
          </div>
        )}

        <div>
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2">
              <Badge variant="secondary">{product.category}</Badge>
              {product.stock_quantity > 0 && <Badge className="bg-success text-success-foreground">In Stock</Badge>}
            </div>
            {user && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => toggleWishlist(product.id)}
                title={isInWishlist(product.id) ? 'Remove from wishlist' : 'Add to wishlist'}
              >
                <Heart className={`h-5 w-5 ${isInWishlist(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
              </Button>
            )}
          </div>
          <h1 className="mt-3 font-display text-3xl font-bold">{product.name}</h1>
          <p className="mt-1 text-muted-foreground">{product.producer_name} · {product.producer_country}</p>

          {/* Compact store rating inline */}
          <div className="mt-2">
            <StoreReviews storeId={product.producer_id} compact />
          </div>

          <p className="mt-4 text-foreground/80">{product.description}</p>

          <div className="mt-6 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold">{format(basePrice)}</span>
            <span className="text-muted-foreground">/ unit</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1"><Boxes className="h-4 w-4" /> MOQ: {product.moq}</span>
            <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> Lead: {product.lead_time_days} days</span>
            <span className="flex items-center gap-1"><Shield className="h-4 w-4" /> Verified Producer</span>
          </div>

          {bulkPricing.length > 0 && (
            <Card className="mt-6">
              <CardContent className="p-4">
                <h3 className="font-display font-semibold mb-2">Bulk Pricing</h3>
                <Table>
                  <TableHeader><TableRow><TableHead>Quantity</TableHead><TableHead>Price / Unit</TableHead><TableHead>Savings</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {bulkPricing.map((tier, i) => (
                      <TableRow key={i}>
                        <TableCell>{tier.min_qty}{tier.max_qty ? ` – ${tier.max_qty}` : '+'}</TableCell>
                        <TableCell className="font-semibold">{format(tier.price)}</TableCell>
                        <TableCell className="text-success">
                          {tier.price < basePrice ? `-${((1 - tier.price / basePrice) * 100).toFixed(0)}%` : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 flex items-end gap-3">
            <div className="flex-1">
              <label className="mb-1 block text-sm font-medium">Quantity (min {product.moq})</label>
              <Input type="number" min={product.moq} value={qty} onChange={e => setQty(e.target.value)} placeholder={`${product.moq}`} />
            </div>
            <Button onClick={handleAddToCart} className="gap-1"><ShoppingCart className="h-4 w-4" /> Add to Cart</Button>
          </div>
          {!user && (
            <p className="mt-2 text-xs text-muted-foreground">
              No account needed — you can checkout as a guest. <Button variant="link" className="h-auto p-0 text-xs" onClick={() => navigate(`/signup${refCode ? `?ref=${refCode}` : ''}`)}>Sign up</Button> to track orders.
            </p>
          )}

          {isReferrer && productRefLink && (
            <Card className="mt-4 border-secondary/30 bg-secondary/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2"><Share2 className="h-4 w-4 text-secondary" /><span className="text-sm font-medium">Share & Earn</span></div>
                <p className="text-xs text-muted-foreground mb-2">Share this product link. When someone buys through your link, you earn a commission!</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs truncate">{productRefLink}</code>
                  <Button onClick={copyProductRefLink} size="sm" variant="outline"><Copy className="mr-1 h-3 w-3" /> Copy</Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Reviews Section - Tabbed for Product & Store */}
      <div className="mt-12">
        <Tabs defaultValue="product-reviews">
          <TabsList>
            <TabsTrigger value="product-reviews">Product Reviews</TabsTrigger>
            <TabsTrigger value="store-reviews">Store Reviews</TabsTrigger>
          </TabsList>
          <TabsContent value="product-reviews" className="mt-4">
            <ProductReviews 
              productId={product.id} 
              producerId={product.producer_id}
              showWriteReview={user?.role === 'wholesaler'}
            />
          </TabsContent>
          <TabsContent value="store-reviews" className="mt-4">
            <StoreReviews
              storeId={product.producer_id}
              storeName={product.producer_name}
              showWriteReview={user?.role === 'wholesaler'}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
