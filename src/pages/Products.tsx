import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useProducts, useCategories, ProductWithProducer } from '@/hooks/use-products';
import { mockProducts } from '@/lib/mock-data';
import { useAuth } from '@/lib/auth-context';
import { useWishlist } from '@/hooks/use-wishlist';
import { useCurrency } from '@/lib/currency-context';
import { useCart } from '@/lib/cart-context';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Package, Copy, SlidersHorizontal, X, ArrowUpDown, Heart, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { Product } from '@/lib/types';

type SortOption = 'newest' | 'price_low' | 'price_high' | 'name_az' | 'moq_low';

export default function Products() {
  const { user } = useAuth();
  const { isInWishlist, toggle: toggleWishlist } = useWishlist();
  const { format } = useCurrency();
  const { addItem } = useCart();
  const { data: dbProducts, isLoading, error } = useProducts();
  const { data: dbCategories } = useCategories();

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState<SortOption>('newest');
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [showFilters, setShowFilters] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);

  // Fall back to mock data if DB is empty / still loading
  const products: ProductWithProducer[] = useMemo(() => {
    if (dbProducts && dbProducts.length > 0) return dbProducts;
    if (isLoading) return [];
    // Fallback to mock data for now
    return mockProducts.map(p => ({
      id: p.id,
      producer_id: p.producer_id,
      name: p.name,
      description: p.description,
      category: p.category,
      images: p.images,
      moq: p.moq,
      base_price: p.base_price,
      bulk_pricing: p.bulk_pricing,
      stock_quantity: p.stock_quantity,
      lead_time_days: p.lead_time_days,
      is_active: p.is_active,
      created_at: '',
      updated_at: '',
      producer_name: p.producer_name,
      producer_country: p.producer_country,
    }));
  }, [dbProducts, isLoading]);

  const categories = useMemo(() => {
    if (dbCategories && dbCategories.length > 0) return dbCategories;
    return [...new Set(products.map(p => p.category))].filter(Boolean).sort();
  }, [dbCategories, products]);

  // Compute price bounds for slider
  const priceBounds = useMemo(() => {
    if (products.length === 0) return { min: 0, max: 1000 };
    const prices = products.map(p => p.base_price);
    return { min: Math.floor(Math.min(...prices)), max: Math.ceil(Math.max(...prices)) };
  }, [products]);

  const filtered = useMemo(() => {
    let result = products.filter(p => {
      if (category !== 'all' && p.category !== category) return false;
      if (inStockOnly && p.stock_quantity <= 0) return false;
      if (p.base_price < priceRange[0] || p.base_price > priceRange[1]) return false;
      if (search) {
        const q = search.toLowerCase();
        const matches =
          p.name.toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.producer_name.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });

    // Sort
    switch (sort) {
      case 'price_low':
        result.sort((a, b) => a.base_price - b.base_price);
        break;
      case 'price_high':
        result.sort((a, b) => b.base_price - a.base_price);
        break;
      case 'name_az':
        result.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'moq_low':
        result.sort((a, b) => a.moq - b.moq);
        break;
      case 'newest':
      default:
        // already sorted by created_at desc from DB
        break;
    }

    return result;
  }, [products, search, category, sort, priceRange, inStockOnly]);

  const canRefer = user && user.role === 'referrer';

  const copyRefLink = (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (user) {
      const link = `${window.location.origin}/products/${productId}?ref=${user.referral_code}`;
      navigator.clipboard.writeText(link);
      toast.success('Product referral link copied!');
    }
  };

  const addToCart = (p: ProductWithProducer, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const product: Product = {
      id: p.id,
      producer_id: p.producer_id,
      producer_name: p.producer_name,
      producer_country: p.producer_country,
      name: p.name,
      description: p.description || '',
      category: p.category,
      images: p.images || [],
      moq: p.moq,
      base_price: Number(p.base_price),
      bulk_pricing: Array.isArray(p.bulk_pricing) ? p.bulk_pricing : [],
      stock_quantity: p.stock_quantity,
      lead_time_days: p.lead_time_days,
      is_active: p.is_active,
    };
    addItem(product, p.moq);
    toast.success(`Added ${p.moq}x ${p.name} to cart`);
  };

  const activeFilterCount = [
    category !== 'all',
    inStockOnly,
    priceRange[0] > priceBounds.min || priceRange[1] < priceBounds.max,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setCategory('all');
    setInStockOnly(false);
    setPriceRange([priceBounds.min, priceBounds.max]);
    setSearch('');
    setSort('newest');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Browse Products</h1>
        <p className="mt-1 text-muted-foreground">Find bulk products from verified producers worldwide</p>
      </div>

      {/* Search + Sort Bar */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, category, producer..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex gap-2">
          <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
            <SelectTrigger className="w-44">
              <ArrowUpDown className="mr-1.5 h-3.5 w-3.5" />
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="price_low">Price: Low → High</SelectItem>
              <SelectItem value="price_high">Price: High → Low</SelectItem>
              <SelectItem value="name_az">Name: A → Z</SelectItem>
              <SelectItem value="moq_low">MOQ: Lowest</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant={showFilters ? 'default' : 'outline'}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="relative shrink-0"
            title="Advanced filters"
          >
            <SlidersHorizontal className="h-4 w-4" />
            {activeFilterCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[10px] font-bold text-secondary-foreground">
                {activeFilterCount}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Quick category chips */}
      <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
        <Badge
          variant={category === 'all' ? 'default' : 'secondary'}
          className="shrink-0 cursor-pointer select-none"
          onClick={() => setCategory('all')}
        >
          All
        </Badge>
        {categories.map(c => (
          <Badge
            key={c}
            variant={category === c ? 'default' : 'secondary'}
            className="shrink-0 cursor-pointer select-none"
            onClick={() => setCategory(category === c ? 'all' : c)}
          >
            {c}
          </Badge>
        ))}
        <Badge
          variant={inStockOnly ? 'default' : 'secondary'}
          className="shrink-0 cursor-pointer select-none ml-2 border-l border-border pl-2"
          onClick={() => setInStockOnly(v => !v)}
        >
          In Stock Only
        </Badge>
      </div>

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card className="mb-6 animate-in slide-in-from-top-2 duration-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-semibold text-sm">Advanced Filters</h3>
              {activeFilterCount > 0 && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1">
                  <X className="h-3 w-3" /> Clear all
                </Button>
              )}
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              {/* Price Range */}
              <div>
                <label className="mb-2 block text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Price Range: ${priceRange[0].toFixed(2)} – ${priceRange[1].toFixed(2)}
                </label>
                <Slider
                  min={priceBounds.min}
                  max={priceBounds.max}
                  step={0.5}
                  value={priceRange}
                  onValueChange={(v) => setPriceRange(v as [number, number])}
                  className="mt-3"
                />
              </div>

              {/* Stock Toggle */}
              <div className="flex items-start gap-3">
                <Checkbox
                  id="inStockOnly"
                  checked={inStockOnly}
                  onCheckedChange={(checked) => setInStockOnly(checked as boolean)}
                />
                <div className="grid gap-1 leading-none">
                  <label htmlFor="inStockOnly" className="text-sm font-medium cursor-pointer">
                    In Stock Only
                  </label>
                  <p className="text-xs text-muted-foreground">Hide products that are currently out of stock</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active filter chips */}
      {(category !== 'all' || search || inStockOnly || priceRange[0] > priceBounds.min || priceRange[1] < priceBounds.max) && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {search && (
            <Badge variant="secondary" className="gap-1 pr-1">
              Search: "{search}"
              <button onClick={() => setSearch('')} className="ml-1 rounded-full p-0.5 hover:bg-foreground/10">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {category !== 'all' && (
            <Badge variant="secondary" className="gap-1 pr-1">
              {category}
              <button onClick={() => setCategory('all')} className="ml-1 rounded-full p-0.5 hover:bg-foreground/10">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {inStockOnly && (
            <Badge variant="secondary" className="gap-1 pr-1">
              In Stock
              <button onClick={() => setInStockOnly(false)} className="ml-1 rounded-full p-0.5 hover:bg-foreground/10">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {(priceRange[0] > priceBounds.min || priceRange[1] < priceBounds.max) && (
            <Badge variant="secondary" className="gap-1 pr-1">
              ${priceRange[0].toFixed(0)} – ${priceRange[1].toFixed(0)}
              <button onClick={() => setPriceRange([priceBounds.min, priceBounds.max])} className="ml-1 rounded-full p-0.5 hover:bg-foreground/10">
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">{filtered.length} product{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Card key={i} className="overflow-hidden">
              <Skeleton className="aspect-[4/3] w-full" />
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
                <Skeleton className="h-4 w-20" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !isLoading && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Package className="h-12 w-12 mb-3" />
          <p>Failed to load products. Showing sample data.</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Package className="h-12 w-12 mb-3" />
          <p className="font-medium">No products match your filters</p>
          <p className="mt-1 text-sm">Try adjusting your search or filter criteria</p>
          {activeFilterCount > 0 && (
            <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3">
              Clear all filters
            </Button>
          )}
        </div>
      )}

      {/* Product Grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => (
            <Link key={p.id} to={`/products/${p.id}`}>
              <Card className="h-full overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5">
                <div className="aspect-[4/3] bg-muted flex items-center justify-center overflow-hidden relative">
                  {p.images && p.images.length > 0 && p.images[0] !== '/placeholder.svg' ? (
                    <img src={p.images[0]} alt={p.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <Package className="h-12 w-12 text-muted-foreground/40" />
                  )}
                  {user && (
                    <button
                      className="absolute top-2 right-2 rounded-full bg-background/80 backdrop-blur-sm p-1.5 transition-colors hover:bg-background"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(p.id); }}
                    >
                      <Heart className={`h-4 w-4 ${isInWishlist(p.id) ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
                    </button>
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold leading-tight truncate">{p.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground truncate">{p.producer_name} · {p.producer_country}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">{p.category}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-display text-lg font-bold">{format(p.base_price)}</span>
                    <span className="text-xs text-muted-foreground">/ unit · MOQ {p.moq}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">Lead time: {p.lead_time_days} days</p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 gap-1 text-xs"
                        onClick={(e) => addToCart(p, e)}
                      >
                        <ShoppingCart className="h-3 w-3" /> Add
                      </Button>
                      {canRefer && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 gap-1 text-xs text-secondary hover:text-secondary"
                          onClick={(e) => copyRefLink(p.id, e)}
                        >
                          <Copy className="h-3 w-3" /> Share
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
