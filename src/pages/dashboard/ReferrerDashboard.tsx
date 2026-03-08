import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { mockReferrals, mockProductReferralSales, mockProducts } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Copy, Link2, DollarSign, Users, Package, Share2 } from 'lucide-react';
import { toast } from 'sonner';

export default function ReferrerDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const referralLink = `${window.location.origin}/signup?ref=${user.referral_code}`;
  const referrals = mockReferrals.filter(r => r.referrer_user_id === user.id);
  const productSales = mockProductReferralSales.filter(s => s.referrer_user_id === user.id);
  const totalProductCommission = productSales.reduce((s, sale) => s + sale.commission_earned, 0);

  const copyLink = (link: string, label?: string) => {
    navigator.clipboard.writeText(link);
    toast.success(`${label || 'Link'} copied!`);
  };

  const generateProductLink = (productId: string) => {
    return `${window.location.origin}/products/${productId}?ref=${user.referral_code}`;
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Referral Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Share product links, earn rewards when your referrals buy.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20 text-secondary"><DollarSign className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Total Credits</p><p className="font-display text-2xl font-bold">${user.referral_credits.toFixed(2)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Users className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">People Referred</p><p className="font-display text-2xl font-bold">{referrals.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20 text-success"><Package className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Product Sales</p><p className="font-display text-2xl font-bold">{productSales.length}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20 text-secondary"><Share2 className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Product Commission</p><p className="font-display text-2xl font-bold">${totalProductCommission.toFixed(2)}</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="products" className="mt-6">
        <TabsList>
          <TabsTrigger value="products">Product Links</TabsTrigger>
          <TabsTrigger value="sales">My Sales</TabsTrigger>
          <TabsTrigger value="referrals">Referred Users</TabsTrigger>
        </TabsList>

        {/* Product referral links */}
        <TabsContent value="products" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Your Product Referral Links</CardTitle>
              <CardDescription>Share these links for specific products. When someone signs up via your link and buys, you earn a commission.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* General signup link */}
              <div className="mb-4 rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-medium text-muted-foreground mb-1">General Signup Link</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-xs truncate">{referralLink}</code>
                  <Button onClick={() => copyLink(referralLink, 'Signup link')} size="sm" variant="outline"><Copy className="mr-1 h-3 w-3" /> Copy</Button>
                </div>
              </div>

              <p className="text-sm font-medium mb-3">Product-specific links:</p>
              <div className="space-y-2">
                {mockProducts.filter(p => p.is_active).map(product => {
                  const link = generateProductLink(product.id);
                  return (
                    <div key={product.id} className="flex items-center gap-3 rounded-lg border p-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <Package className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.producer_name} · ${product.base_price.toFixed(2)}/unit</p>
                      </div>
                      <Button
                        onClick={() => copyLink(link, `${product.name} link`)}
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1"
                      >
                        <Copy className="h-3 w-3" /> Copy Link
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Product sales */}
        <TabsContent value="sales" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Product Sales & Commissions</CardTitle>
              <CardDescription>Sales made through your product referral links.</CardDescription>
            </CardHeader>
            <CardContent>
              {productSales.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No sales yet. Share your product links to start earning!</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Producer</TableHead>
                      <TableHead>Buyer</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>Commission</TableHead>
                      <TableHead>Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productSales.map(sale => (
                      <TableRow key={sale.id}>
                        <TableCell className="font-medium">{sale.product_name}</TableCell>
                        <TableCell className="text-muted-foreground">{sale.producer_name}</TableCell>
                        <TableCell>{sale.buyer_name}</TableCell>
                        <TableCell>{sale.quantity}</TableCell>
                        <TableCell>${sale.subtotal.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold text-success">${sale.commission_earned.toFixed(2)}</TableCell>
                        <TableCell>{new Date(sale.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Referred users */}
        <TabsContent value="referrals" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="font-display text-lg">Referred Users</CardTitle></CardHeader>
            <CardContent>
              {referrals.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No referrals yet. Share your link to get started!</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Signed Up</TableHead>
                      <TableHead>First Order</TableHead>
                      <TableHead>Credits Earned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {referrals.map(r => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div><p className="font-medium">{r.referred_user_name}</p><p className="text-xs text-muted-foreground">{r.referred_user_email_masked}</p></div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{r.referred_user_role}</Badge></TableCell>
                        <TableCell className="text-sm">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                        <TableCell>{r.rewarded ? <Badge className="bg-success text-success-foreground">Completed</Badge> : <Badge variant="outline">Pending</Badge>}</TableCell>
                        <TableCell className="font-semibold">${r.reward_credits_awarded.toFixed(2)}</TableCell>
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
