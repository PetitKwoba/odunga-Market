import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { session } = useAuth();
  const [status, setStatus] = useState<'verifying' | 'success' | 'failed'>('verifying');
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    const reference = searchParams.get('reference') || searchParams.get('trxref');
    if (!reference || !session) return;

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('paystack-verify', {
          body: { reference },
        });

        if (error) throw error;

        if (data.status === 'success') {
          setStatus('success');
          setOrderId(data.order_id);
        } else {
          setStatus('failed');
        }
      } catch {
        setStatus('failed');
      }
    };

    verify();
  }, [searchParams, session]);

  return (
    <div className="container mx-auto flex items-center justify-center px-4 py-20">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          {status === 'verifying' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <h2 className="font-display text-xl font-bold">Verifying Payment...</h2>
              <p className="text-sm text-muted-foreground">Please wait while we confirm your payment with Paystack.</p>
            </>
          )}
          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-500" />
              <h2 className="font-display text-xl font-bold">Payment Successful! 🎉</h2>
              <p className="text-sm text-muted-foreground">Your order has been confirmed. The producer will arrange shipping.</p>
              <Button className="mt-2" onClick={() => navigate('/dashboard/wholesaler')}>
                View My Orders
              </Button>
            </>
          )}
          {status === 'failed' && (
            <>
              <XCircle className="h-12 w-12 text-destructive" />
              <h2 className="font-display text-xl font-bold">Payment Failed</h2>
              <p className="text-sm text-muted-foreground">Something went wrong. Please try again or contact support.</p>
              <div className="flex gap-2 mt-2">
                <Button variant="outline" onClick={() => navigate('/checkout')}>Back to Checkout</Button>
                <Button onClick={() => navigate('/dashboard/wholesaler')}>My Dashboard</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
