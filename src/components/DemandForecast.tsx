import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { TrendingUp, Sparkles, RefreshCw, AlertTriangle, ArrowUp, ArrowDown } from 'lucide-react';

interface ProductForecast {
  product_id: string;
  product_name: string;
  current_stock: number;
  avg_monthly_sales: number;
  predicted_demand: number;
  confidence: 'high' | 'medium' | 'low';
  trend: 'up' | 'down' | 'stable';
  recommendation: string;
  reorder_point: number;
  days_until_stockout: number | null;
}

export default function DemandForecast() {
  const { user } = useAuth();
  const [forecasts, setForecasts] = useState<ProductForecast[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const generateForecast = async () => {
    if (!user) return;
    setLoading(true);

    try {
      // Fetch sales data and products
      const { data: products } = await supabase
        .from('products')
        .select('id, name, stock_quantity')
        .eq('producer_id', user.id);

      const { data: orderItems } = await supabase
        .from('order_items')
        .select('product_id, quantity, order_id, orders!inner(created_at, status)')
        .eq('producer_id', user.id);

      if (!products || products.length === 0) {
        toast.error('No products found');
        return;
      }

      // Prepare sales summary for AI
      const salesSummary = products.map(p => {
        const productSales = (orderItems || []).filter(oi => oi.product_id === p.id);
        const totalSold = productSales.reduce((sum, oi) => sum + oi.quantity, 0);
        const orderCount = productSales.length;
        return {
          product_id: p.id,
          name: p.name,
          stock: p.stock_quantity,
          total_sold: totalSold,
          order_count: orderCount,
        };
      });

      // Call AI for demand forecasting
      const { data, error } = await supabase.functions.invoke('ai-demand-forecast', {
        body: { products: salesSummary },
      });

      if (error) {
        // Handle rate limiting
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          toast.error('Rate limited. Please try again in a moment.');
          return;
        }
        throw error;
      }

      if (data?.forecasts) {
        setForecasts(data.forecasts);
        setLastUpdated(new Date());
        toast.success('Forecast generated!');
      }
    } catch (error: any) {
      console.error('Forecast error:', error);
      toast.error('Failed to generate forecast. Try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Auto-generate on mount if user is producer
    if (user?.role === 'producer') {
      generateForecast();
    }
  }, [user]);

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case 'high': return <Badge className="bg-green-500">High</Badge>;
      case 'medium': return <Badge className="bg-amber-500">Medium</Badge>;
      case 'low': return <Badge variant="secondary">Low</Badge>;
      default: return <Badge variant="outline">{confidence}</Badge>;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUp className="h-4 w-4 text-green-500" />;
      case 'down': return <ArrowDown className="h-4 w-4 text-red-500" />;
      default: return <span className="text-muted-foreground">—</span>;
    }
  };

  const atRiskProducts = forecasts.filter(f => f.days_until_stockout !== null && f.days_until_stockout <= 14);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-secondary" />
            AI Demand Forecasting
          </h2>
          <p className="text-sm text-muted-foreground">
            Powered by Lovable AI · Predicts demand based on your sales history
          </p>
        </div>
        <Button onClick={generateForecast} disabled={loading}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Analyzing...' : 'Refresh Forecast'}
        </Button>
      </div>

      {lastUpdated && (
        <p className="text-xs text-muted-foreground">
          Last updated: {lastUpdated.toLocaleString()}
        </p>
      )}

      {/* Risk Alert */}
      {atRiskProducts.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-700 dark:text-amber-400">Stock Alert</p>
              <p className="text-sm text-muted-foreground">
                {atRiskProducts.length} product{atRiskProducts.length !== 1 ? 's' : ''} may run out within 14 days
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && forecasts.length === 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Card key={i}>
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-20 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Forecasts */}
      {forecasts.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forecasts.map(f => (
            <Card key={f.product_id} className={f.days_until_stockout !== null && f.days_until_stockout <= 7 ? 'border-destructive/50' : ''}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="font-display text-base">{f.product_name}</CardTitle>
                  {getTrendIcon(f.trend)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Current Stock</p>
                    <p className="font-semibold">{f.current_stock}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Predicted Demand</p>
                    <p className="font-semibold">{f.predicted_demand}/mo</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Reorder Point</p>
                    <p className="font-semibold">{f.reorder_point}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Confidence</p>
                    {getConfidenceBadge(f.confidence)}
                  </div>
                </div>
                
                {f.days_until_stockout !== null && (
                  <div className={`rounded-lg p-2 text-center text-sm ${
                    f.days_until_stockout <= 7 ? 'bg-destructive/10 text-destructive' :
                    f.days_until_stockout <= 14 ? 'bg-amber-500/10 text-amber-600' :
                    'bg-muted'
                  }`}>
                    {f.days_until_stockout <= 0 ? '⚠️ Out of stock!' : `~${f.days_until_stockout} days until stockout`}
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground border-t pt-2">
                  💡 {f.recommendation}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && forecasts.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
            <p>No forecast data available</p>
            <p className="text-sm mt-1">Click "Refresh Forecast" to generate predictions</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
