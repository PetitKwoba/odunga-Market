import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, ShoppingCart, Package, TrendingUp } from 'lucide-react';

interface Props {
  orders: any[];
  products: any[];
  profiles: any[];
  posTransactions: any[];
  payouts: any[];
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--secondary))', 'hsl(var(--accent))', 'hsl(var(--muted))'];

export default function AdminAnalytics({ orders, products, profiles, posTransactions, payouts }: Props) {
  const [selectedStore, setSelectedStore] = useState<string>('all');
  const [selectedProduct, setSelectedProduct] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('30');

  const producers = profiles.filter(p => products.some(pr => pr.producer_id === p.user_id));

  // Filter data based on selections
  const filteredData = useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(dateRange));

    let filteredOrders = orders.filter(o => new Date(o.created_at) >= cutoffDate);
    let filteredPos = posTransactions.filter(t => new Date(t.created_at) >= cutoffDate);
    let filteredPayouts = payouts.filter(p => new Date(p.created_at) >= cutoffDate);

    if (selectedStore !== 'all') {
      filteredOrders = filteredOrders.filter(o => 
        o.order_items?.some((item: any) => item.producer_id === selectedStore)
      );
      filteredPos = filteredPos.filter(t => t.owner_id === selectedStore);
      filteredPayouts = filteredPayouts.filter(p => p.producer_id === selectedStore);
    }

    if (selectedProduct !== 'all') {
      filteredOrders = filteredOrders.filter(o =>
        o.order_items?.some((item: any) => item.product_id === selectedProduct)
      );
    }

    return { orders: filteredOrders, pos: filteredPos, payouts: filteredPayouts };
  }, [orders, posTransactions, payouts, selectedStore, selectedProduct, dateRange]);

  // Calculate metrics
  const totalRevenue = useMemo(() => {
    const orderRevenue = filteredData.orders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const posRevenue = filteredData.pos.reduce((sum, t) => sum + Number(t.total || 0), 0);
    return orderRevenue + posRevenue;
  }, [filteredData]);

  const totalOrders = filteredData.orders.length + filteredData.pos.length;

  const totalPlatformFees = useMemo(() => 
    filteredData.payouts.reduce((sum, p) => sum + Number(p.platform_fee || 0), 0),
    [filteredData]
  );

  const topProducts = useMemo(() => {
    const productSales: Record<string, { name: string; count: number; revenue: number }> = {};

    filteredData.orders.forEach(order => {
      order.order_items?.forEach((item: any) => {
        if (!productSales[item.product_id]) {
          const product = products.find(p => p.id === item.product_id);
          productSales[item.product_id] = {
            name: product?.name || 'Unknown',
            count: 0,
            revenue: 0
          };
        }
        productSales[item.product_id].count += item.quantity || 0;
        productSales[item.product_id].revenue += Number(item.subtotal || 0);
      });
    });

    return Object.entries(productSales)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredData, products]);

  const topStores = useMemo(() => {
    const storeRevenue: Record<string, { name: string; revenue: number; orders: number }> = {};

    filteredData.orders.forEach(order => {
      order.order_items?.forEach((item: any) => {
        if (!storeRevenue[item.producer_id]) {
          const producer = profiles.find(p => p.user_id === item.producer_id);
          storeRevenue[item.producer_id] = {
            name: producer?.business_name || producer?.name || 'Unknown',
            revenue: 0,
            orders: 0
          };
        }
        storeRevenue[item.producer_id].revenue += Number(item.subtotal || 0);
      });
    });

    filteredData.orders.forEach(order => {
      order.order_items?.forEach((item: any) => {
        if (storeRevenue[item.producer_id]) {
          storeRevenue[item.producer_id].orders += 1;
        }
      });
    });

    filteredData.pos.forEach(t => {
      if (!storeRevenue[t.owner_id]) {
        const owner = profiles.find(p => p.user_id === t.owner_id);
        storeRevenue[t.owner_id] = {
          name: owner?.business_name || owner?.name || 'Unknown',
          revenue: 0,
          orders: 0
        };
      }
      storeRevenue[t.owner_id].revenue += Number(t.total || 0);
      storeRevenue[t.owner_id].orders += 1;
    });

    return Object.entries(storeRevenue)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [filteredData, profiles]);

  const dailyRevenue = useMemo(() => {
    const days: Record<string, number> = {};
    
    filteredData.orders.forEach(o => {
      const date = new Date(o.created_at).toLocaleDateString();
      days[date] = (days[date] || 0) + Number(o.total_amount || 0);
    });

    filteredData.pos.forEach(t => {
      const date = new Date(t.created_at).toLocaleDateString();
      days[date] = (days[date] || 0) + Number(t.total || 0);
    });

    return Object.entries(days)
      .map(([date, revenue]) => ({ date, revenue }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(-14);
  }, [filteredData]);

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>Store</Label>
              <Select value={selectedStore} onValueChange={setSelectedStore}>
                <SelectTrigger>
                  <SelectValue placeholder="All Stores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Stores</SelectItem>
                  {producers.map(p => (
                    <SelectItem key={p.user_id} value={p.user_id}>
                      {p.business_name || p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Product</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="All Products" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date Range</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="font-display text-2xl font-bold">${totalRevenue.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
              <ShoppingCart className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Orders</p>
              <p className="font-display text-2xl font-bold">{totalOrders}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Platform Fees</p>
              <p className="font-display text-2xl font-bold">${totalPlatformFees.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted/10 text-muted-foreground">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
              <p className="font-display text-2xl font-bold">
                ${totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : '0.00'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={dailyRevenue}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" />
              <YAxis stroke="hsl(var(--muted-foreground))" />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))', 
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top Products and Stores */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Stores by Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topStores}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
                <YAxis stroke="hsl(var(--muted-foreground))" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'hsl(var(--card))', 
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px'
                  }}
                />
                <Bar dataKey="revenue" fill="hsl(var(--secondary))" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
