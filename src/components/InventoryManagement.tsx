import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Package, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, Plus, History } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  stock_quantity: number;
  category: string;
}

interface InventoryMovement {
  id: string;
  product_id: string;
  movement_type: string;
  quantity: number;
  previous_stock: number;
  new_stock: number;
  notes: string | null;
  created_at: string;
}

interface StockAlert {
  id: string;
  product_id: string;
  alert_type: string;
  threshold: number;
  is_resolved: boolean;
  created_at: string;
}

export default function InventoryManagement() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustmentOpen, setAdjustmentOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [adjustmentType, setAdjustmentType] = useState<'restock' | 'adjustment'>('restock');
  const [adjustmentQty, setAdjustmentQty] = useState('');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) return;
    fetchProducts();
    fetchAlerts();
  }, [user]);

  const fetchProducts = async () => {
    const { data } = await supabase
      .from('products')
      .select('id, name, stock_quantity, category')
      .eq('producer_id', user?.id)
      .order('name');
    if (data) setProducts(data);
  };

  const fetchAlerts = async () => {
    const { data } = await supabase
      .from('stock_alerts')
      .select('*')
      .eq('is_resolved', false)
      .order('created_at', { ascending: false });
    if (data) setAlerts(data);
  };

  const fetchMovements = async (productId: string) => {
    const { data } = await supabase
      .from('inventory_movements')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setMovements(data);
  };

  const handleAdjustment = async () => {
    if (!selectedProduct || !adjustmentQty) return;
    setLoading(true);

    const qty = parseInt(adjustmentQty);
    const newStock = adjustmentType === 'restock' 
      ? selectedProduct.stock_quantity + qty 
      : qty;

    try {
      // Update product stock
      const { error: productError } = await supabase
        .from('products')
        .update({ stock_quantity: newStock })
        .eq('id', selectedProduct.id);

      if (productError) throw productError;

      // Record movement
      const { error: movementError } = await supabase
        .from('inventory_movements')
        .insert({
          product_id: selectedProduct.id,
          movement_type: adjustmentType,
          quantity: adjustmentType === 'restock' ? qty : qty - selectedProduct.stock_quantity,
          previous_stock: selectedProduct.stock_quantity,
          new_stock: newStock,
          notes: adjustmentNotes || null,
          created_by: user?.id,
        });

      if (movementError) throw movementError;

      // Check for low stock alert
      if (newStock <= 10 && newStock > 0) {
        await supabase.from('stock_alerts').insert({
          product_id: selectedProduct.id,
          alert_type: 'low_stock',
          threshold: 10,
        });
      } else if (newStock === 0) {
        await supabase.from('stock_alerts').insert({
          product_id: selectedProduct.id,
          alert_type: 'out_of_stock',
          threshold: 0,
        });
      }

      toast.success('Stock updated successfully');
      setAdjustmentOpen(false);
      setAdjustmentQty('');
      setAdjustmentNotes('');
      fetchProducts();
      fetchAlerts();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resolveAlert = async (alertId: string) => {
    await supabase
      .from('stock_alerts')
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq('id', alertId);
    fetchAlerts();
    toast.success('Alert resolved');
  };

  const getAlertBadge = (type: string) => {
    switch (type) {
      case 'out_of_stock':
        return <Badge variant="destructive">Out of Stock</Badge>;
      case 'low_stock':
        return <Badge className="bg-amber-500">Low Stock</Badge>;
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const getMovementIcon = (type: string) => {
    switch (type) {
      case 'restock':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'sale':
      case 'order_deduction':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <RefreshCw className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const lowStockProducts = products.filter(p => p.stock_quantity <= 10);
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Products</p>
              <p className="font-display text-2xl font-bold">{products.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Low Stock</p>
              <p className="font-display text-2xl font-bold">{lowStockProducts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10 text-destructive">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Out of Stock</p>
              <p className="font-display text-2xl font-bold">{outOfStockProducts.length}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20 text-secondary">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Alerts</p>
              <p className="font-display text-2xl font-bold">{alerts.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Alerts */}
      {alerts.length > 0 && (
        <Card className="border-amber-500/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" /> Stock Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.slice(0, 5).map(alert => {
                const product = products.find(p => p.id === alert.product_id);
                return (
                  <div key={alert.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-3">
                      {getAlertBadge(alert.alert_type)}
                      <span className="font-medium">{product?.name || 'Unknown Product'}</span>
                      <span className="text-sm text-muted-foreground">
                        Stock: {product?.stock_quantity || 0}
                      </span>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => resolveAlert(alert.id)}>
                      Resolve
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
          <CardDescription>Manage your product stock levels</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map(product => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.name}</TableCell>
                  <TableCell>{product.category}</TableCell>
                  <TableCell>
                    <span className={`font-semibold ${product.stock_quantity === 0 ? 'text-destructive' : product.stock_quantity <= 10 ? 'text-amber-500' : ''}`}>
                      {product.stock_quantity}
                    </span>
                  </TableCell>
                  <TableCell>
                    {product.stock_quantity === 0 ? (
                      <Badge variant="destructive">Out of Stock</Badge>
                    ) : product.stock_quantity <= 10 ? (
                      <Badge className="bg-amber-500">Low Stock</Badge>
                    ) : (
                      <Badge variant="secondary">In Stock</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedProduct(product);
                          fetchMovements(product.id);
                          setHistoryOpen(true);
                        }}
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedProduct(product);
                          setAdjustmentOpen(true);
                        }}
                      >
                        <Plus className="mr-1 h-4 w-4" /> Adjust
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Adjustment Dialog */}
      <Dialog open={adjustmentOpen} onOpenChange={setAdjustmentOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Current Stock: <span className="font-semibold">{selectedProduct?.stock_quantity}</span></p>
            </div>
            <div className="space-y-2">
              <Label>Adjustment Type</Label>
              <Select value={adjustmentType} onValueChange={(v: 'restock' | 'adjustment') => setAdjustmentType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restock">Restock (Add)</SelectItem>
                  <SelectItem value="adjustment">Set Exact Quantity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{adjustmentType === 'restock' ? 'Quantity to Add' : 'New Stock Level'}</Label>
              <Input
                type="number"
                min="0"
                value={adjustmentQty}
                onChange={(e) => setAdjustmentQty(e.target.value)}
                placeholder="Enter quantity"
              />
              {adjustmentType === 'restock' && adjustmentQty && (
                <p className="text-sm text-muted-foreground">
                  New total: {(selectedProduct?.stock_quantity || 0) + parseInt(adjustmentQty || '0')}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={adjustmentNotes}
                onChange={(e) => setAdjustmentNotes(e.target.value)}
                placeholder="Reason for adjustment..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustmentOpen(false)}>Cancel</Button>
            <Button onClick={handleAdjustment} disabled={loading || !adjustmentQty}>
              {loading ? 'Updating...' : 'Update Stock'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Stock History - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[400px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Change</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Notes</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.map(m => (
                  <TableRow key={m.id}>
                    <TableCell className="text-sm">
                      {new Date(m.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getMovementIcon(m.movement_type)}
                        <span className="capitalize">{m.movement_type.replace('_', ' ')}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={m.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                        {m.quantity > 0 ? '+' : ''}{m.quantity}
                      </span>
                    </TableCell>
                    <TableCell>
                      {m.previous_stock} → {m.new_stock}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.notes || '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
