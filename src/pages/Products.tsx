import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { mockProducts } from '@/lib/mock-data';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Search, Package } from 'lucide-react';

export default function Products() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const categories = useMemo(() => ['all', ...new Set(mockProducts.map(p => p.category))], []);

  const filtered = useMemo(() => {
    return mockProducts.filter(p => {
      if (!p.is_active) return false;
      if (category !== 'all' && p.category !== category) return false;
      if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [search, category]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold">Browse Products</h1>
        <p className="mt-1 text-muted-foreground">Find bulk products from verified producers worldwide</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search products..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map(c => (
              <SelectItem key={c} value={c}>{c === 'all' ? 'All Categories' : c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Package className="h-12 w-12 mb-3" />
          <p>No products found.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map(p => (
            <Link key={p.id} to={`/products/${p.id}`}>
              <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                <div className="aspect-[4/3] bg-muted flex items-center justify-center">
                  <Package className="h-12 w-12 text-muted-foreground/40" />
                </div>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display font-semibold leading-tight">{p.name}</h3>
                      <p className="mt-0.5 text-xs text-muted-foreground">{p.producer_name} · {p.producer_country}</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0 text-xs">{p.category}</Badge>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                  <div className="mt-3 flex items-baseline gap-2">
                    <span className="font-display text-lg font-bold">${p.base_price.toFixed(2)}</span>
                    <span className="text-xs text-muted-foreground">/ unit · MOQ {p.moq}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Lead time: {p.lead_time_days} days</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
