import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { useProducts } from '@/hooks/use-products';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Link2, DollarSign, Users, Package, Share2, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import ReferrerWalletTab from '@/components/referrer/ReferrerWalletTab';

export default function ReferrerDashboard() {
  const { user } = useAuth();
  const { data: products } = useProducts();
  const [referrals, setReferrals] = useState<any[]>([]);
  const [productSales, setProductSales] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from('referrals').select('*').eq('referrer_user_id', user.id).then(({ data }) => {
      if (data) setReferrals(data);
    });
    supabase.from('product_referral_sales').select('*').eq('referrer_user_id', user.id).then(({ data }) => {
      if (data) setProductSales(data);
    });
  }, [user]);

  if (!user) return null;

  const referralLink = `${window.location.origin}/signup?ref=${user.referral_code}`;
  const totalProductCommission = productSales.reduce((s, sale) => s + Number(sale.commission_earned), 0);

  const copyLink = (link: string, label?: string) => {
    navigator.clipboard.writeText(link);
    toast.success(`${label || 'Link'} copied!`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Referral Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Share product links, earn rewards when your referrals buy.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20 text-secondary"><DollarSign className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Total Credits</p><p className="font-display text-2xl font-bold">${user.referral_credits.toFixed(2)}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">People Referred</p><p className="font-display text-2xl font-bold">{referrals.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20 text-success"><Package className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Product Sales</p><p className="font-display text-2xl font-bold">{productSales.length}</p></div></CardContent></Card>
        <Card><CardContent className="flex items-center gap-3 p-4"><div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20 text-secondary"><Share2 className="h-5 w-5" /></div><div><p className="text-sm text-muted-foreground">Commission</p><p className="font-display text-2xl font-bold">${totalProductCommission.toFixed(2)}</p></div></CardContent></Card>
      </div>

      <Tabs defaultValue="products" className="mt-6">
        <TabsList>
          <TabsTrigger value="products">Product Links</TabsTrigger>
          <TabsTrigger value="sales">My Sales</TabsTrigger>
          <TabsTrigger value="referrals">Referred Users</TabsTrigger>
          <TabsTrigger value="wallet"><Wallet className="h-4 w-4 mr-1" />Wallet</TabsTrigger>
        </TabsList>
        <TabsContent value="wallet" className="mt-4"><ReferrerWalletTab /></TabsContent>

        <TabsContent value="products" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Your Product Referral Links</CardTitle>
              <CardDescription>Share these links. When someone signs up via your link and buys, you earn a commission.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">General Signup Link</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs truncate">{referralLink}</code>
                  <Button onClick={() => copyLink(referralLink, 'Signup link')} size="sm" variant="outline"><Copy className="mr-1 h-3 w-3" /> Copy</Button>
                </div>
              </div>
              <p className="text-sm font-medium mb-3">Product-specific links:</p>
              <div className="space-y-2">
                {(products || []).map(product => {
                  const link = `${window.location.origin}/products/${product.id}?ref=${user.referral_code}`;
                  return (
                    <div key={product.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted"><Package className="h-5 w-5 text-muted-foreground" /></div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.producer_name} · ${Number(product.base_price).toFixed(2)}/unit</p>
                      </div>
                      <Button onClick={() => copyLink(link, `${product.name} link`)} size="sm" variant="outline" className="shrink-0 gap-1"><Copy className="h-3 w-3" /> Copy Link</Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Product Sales & Commissions</CardTitle></CardHeader>
            <CardContent>
              {productSales.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No sales yet. Share your product links to start earning!</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>Product</TableHead><TableHead>Qty</TableHead><TableHead>Subtotal</TableHead><TableHead>Commission</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {productSales.map((sale: any) => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.product_id.slice(0, 8)}...</TableCell>
                        <TableCell>{sale.quantity}</TableCell>
                        <TableCell>${Number(sale.subtotal).toFixed(2)}</TableCell>
                        <TableCell className="font-semibold text-success">${Number(sale.commission_earned).toFixed(2)}</TableCell>
                        <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="referrals" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Referred Users</CardTitle></CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No referrals yet. Share your link!</p>
              ) : (
                <Table>
                  <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Date</TableHead><TableHead>Rewarded</TableHead><TableHead>Credits</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {referrals.map((r: any) => (
                      <TableRow key={r.id}>
                        <TableCell>{r.referred_user_id.slice(0, 8)}...</TableCell>
                        <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{r.rewarded ? <Badge className="bg-success text-success-foreground">Yes</Badge> : <Badge variant="outline">Pending</Badge>}</TableCell>
                        <TableCell className="font-semibold">${Number(r.reward_credits_awarded).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
