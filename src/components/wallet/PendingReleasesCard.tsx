import { useAuth } from '@/lib/auth-context';
import { useCurrency } from '@/lib/currency-context';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Clock } from 'lucide-react';

interface Props {
  userType: 'producer' | 'referrer';
}

/** Lists order_items whose funds are still held in pending balance, with release dates. */
export default function PendingReleasesCard({ userType }: Props) {
  const { user } = useAuth();
  const { format } = useCurrency();
  const [items, setItems] = useState<any[]>([]);
  const [windowDays, setWindowDays] = useState(7);

  useEffect(() => {
    if (!user) return;
    const sb: any = supabase;
    const col = userType === 'producer' ? 'producer_id' : 'referrer_id';
    const amountCol = userType === 'producer' ? 'producer_net' : 'referrer_fee';
    Promise.all([
      sb.from('order_items')
        .select(`id, order_id, paid_at, ${amountCol}, quantity, subtotal`)
        .eq(col, user.id)
        .not('paid_at', 'is', null)
        .is('funds_released_at', null)
        .order('paid_at', { ascending: true })
        .limit(50),
      sb.from('platform_settings').select('value').eq('key', 'return_window_days').maybeSingle(),
    ]).then(([r, s]: any[]) => {
      setItems(r.data || []);
      if (s.data?.value) setWindowDays(Number(s.data.value));
    });
  }, [user, userType]);

  if (items.length === 0) return null;
  const amountCol = userType === 'producer' ? 'producer_net' : 'referrer_fee';

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Clock className="h-5 w-5" /> Pending releases</CardTitle>
        <CardDescription>
          Each sale is held for <strong>{windowDays} days</strong> after payment to cover the buyer's return window.
          Once the window passes with no return request, funds move from <em>Pending</em> to <em>Available</em> automatically.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader><TableRow>
            <TableHead>Order</TableHead><TableHead>Paid</TableHead>
            <TableHead>Releases on</TableHead><TableHead>Status</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {items.map(it => {
              const paid = new Date(it.paid_at);
              const release = new Date(paid.getTime() + windowDays * 86400000);
              const daysLeft = Math.max(0, Math.ceil((release.getTime() - Date.now()) / 86400000));
              return (
                <TableRow key={it.id}>
                  <TableCell className="font-mono text-xs">{String(it.order_id).slice(0, 8)}</TableCell>
                  <TableCell className="text-xs">{paid.toLocaleDateString()}</TableCell>
                  <TableCell className="text-xs">{release.toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge variant={daysLeft === 0 ? 'default' : 'outline'}>
                      {daysLeft === 0 ? 'Ready' : `${daysLeft}d left`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-medium">{format(Number(it[amountCol] || 0))}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
