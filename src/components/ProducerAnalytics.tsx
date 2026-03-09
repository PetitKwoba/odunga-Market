import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useCurrency } from '@/lib/currency-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Package, Users, Star, ShoppingCart, DollarSign } from 'lucide-react';

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', '#10b981', '#f59e0b', '#8b5cf6'];

export default function ProducerAnalytics() {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [products, setProducts] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      supabase.from('products').select('*').eq('producer_id', user.id),
      supabase.from('order_items').select('*, orders(status, created_at, wholesaler_id)').eq('producer_id', user.id),
      supabase.from('product_reviews').select('*').in('product_id', []),
    ]).then(async ([prodRes, itemRes]) => {
      const prods = prodRes.data || [];
      setProducts(prods);
      setOrderItems(itemRes.data || []);

      if (prods.length > 0) {
        const { data: revs } = await supabase.from('product_reviews').select('*').in('product_id', prods.map(p => p.id));
        setReviews(revs || []);
      }
      setLoading(false);
    });
  }, [user]);

  const stats = useMemo(() => {
    const completedItems = orderItems.filter((i: any) => i.orders?.status === 'Completed');
    const totalRevenue = completedItems.reduce((s: number, i: any) => s + Number(i.subtotal), 0);
    const totalOrders = new Set(orderItems.map((i: any) => i.order_id)).size;
    const uniqueCustomers = new Set(orderItems.map((i: any) => i.orders?.wholesaler_id).filter(Boolean)).size;
    const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    const totalUnitsSold = completedItems.reduce((s: number, i: any) => s + i.quantity, 0);

    return { totalRevenue, totalOrders, uniqueCustomers, avgRating, totalUnitsSold, reviewCount: reviews.length };
  }, [orderItems, reviews]);

  const productPerformance = useMemo(() => {
    const perfMap = new Map<string, { name: string; revenue: number; units: number; orders: number }>();
    products.forEach(p => perfMap.set(p.id, { name: p.name, revenue: 0, units: 0, orders: 0 }));
    orderItems.filter((i: any) => i.orders?.status === 'Completed').forEach((i: any) => {
      const perf = perfMap.get(i.product_id);
      if (perf) {
        perf.revenue += Number(i.subtotal);
        perf.units += i.quantity;
        perf.orders += 1;
      }
    });
    return Array.from(perfMap.values()).sort((a, b) => b.revenue - a.revenue);
  }, [products, orderItems]);

  const monthlySales = useMemo(() => {
    const months = new Map<string, number>();
    orderItems.filter((i: any) => i.orders?.status === 'Completed').forEach((i: any) => {
      const date = new Date(i.orders.created_at);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.set(key, (months.get(key) || 0) + Number(i.subtotal));
    });
    return Array.from(months.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([month, revenue]) => ({ month, revenue }));
  }, [orderItems]);

  const categoryBreakdown = useMemo(() => {
    const cats = new Map<string, number>();
    orderItems.filter((i: any) => i.orders?.status === 'Completed').forEach((i: any) => {
      const product = products.find(p => p.id === i.product_id);
      const cat = product?.category || 'Other';
      cats.set(cat, (cats.get(cat) || 0) + Number(i.subtotal));
    });
    return Array.from(cats.entries()).map(([name, value]) => ({ name, value }));
  }, [products, orderItems]);

  if (loading) {
    return <div className="flex items-center justify-center py-12 text-muted-foreground">Loading analytics...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><DollarSign className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Revenue</p><p className="font-display text-lg font-bold">{format(stats.totalRevenue)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><ShoppingCart className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Orders</p><p className="font-display text-lg font-bold">{stats.totalOrders}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Package className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Units Sold</p><p className="font-display text-lg font-bold">{stats.totalUnitsSold}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Customers</p><p className="font-display text-lg font-bold">{stats.uniqueCustomers}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><Star className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Avg Rating</p><p className="font-display text-lg font-bold">{stats.avgRating.toFixed(1)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"><TrendingUp className="h-5 w-5" /></div>
            <div><p className="text-xs text-muted-foreground">Products</p><p className="font-display text-lg font-bold">{products.length}</p></div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Monthly Sales Trend */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Sales Trend</CardTitle><CardDescription>Monthly revenue over time</CardDescription></CardHeader>
          <CardContent>
            {monthlySales.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No sales data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={monthlySales}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(v: number) => format(v)} />
                  <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))' }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Revenue by Category</CardTitle></CardHeader>
          <CardContent>
            {categoryBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={categoryBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {categoryBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => format(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Products Table */}
      <Card>
        <CardHeader><CardTitle className="text-lg">Product Performance</CardTitle><CardDescription>Ranked by revenue</CardDescription></CardHeader>
        <CardContent className="p-0">
          {productPerformance.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No products yet</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">Units Sold</TableHead>
                  <TableHead className="text-right">Orders</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {productPerformance.map((p, i) => (
                  <TableRow key={i}>
                    <TableCell><Badge variant="outline">{i + 1}</Badge></TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-right">{format(p.revenue)}</TableCell>
                    <TableCell className="text-right">{p.units}</TableCell>
                    <TableCell className="text-right">{p.orders}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
