import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router-dom';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Package, ShoppingCart, Users, ArrowRight, Store, Sparkles } from 'lucide-react';

const ONBOARDING_KEY = 'waholo_onboarding_seen';

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: { label: string; path: string };
}

const PRODUCER_STEPS: Step[] = [
  { icon: <Package className="h-6 w-6" />, title: 'Add Your Products', description: 'List your products with pricing, images, and bulk tiers to start receiving orders.', action: { label: 'Go to Dashboard', path: '/dashboard/producer' } },
  { icon: <Store className="h-6 w-6" />, title: 'Set Up Your Store', description: 'Add your logo, shipping regions, and minimum order rules to attract buyers.' },
  { icon: <Users className="h-6 w-6" />, title: 'Invite Your Team', description: 'Add team members with specific roles like order handler or delivery person.' },
  { icon: <Sparkles className="h-6 w-6" />, title: 'Get Discovered', description: 'Your products appear in the marketplace immediately. Wholesalers can find and order from you.' },
];

const WHOLESALER_STEPS: Step[] = [
  { icon: <ShoppingCart className="h-6 w-6" />, title: 'Browse Products', description: 'Explore products from verified producers worldwide. Compare prices and bulk discounts.', action: { label: 'Browse Products', path: '/products' } },
  { icon: <Package className="h-6 w-6" />, title: 'Place Your First Order', description: 'Add products to cart, choose quantities, and checkout securely with Paystack.' },
  { icon: <Users className="h-6 w-6" />, title: 'Refer & Earn', description: 'Share your referral link to earn commissions on every sale.' },
  { icon: <Store className="h-6 w-6" />, title: 'Use Your POS', description: 'Manage your own retail sales with the built-in POS system.' },
];

const REFERRER_STEPS: Step[] = [
  { icon: <Users className="h-6 w-6" />, title: 'Share Your Link', description: 'Copy your unique referral link and share it with potential wholesalers.', action: { label: 'Go to Dashboard', path: '/dashboard/referrer' } },
  { icon: <ShoppingCart className="h-6 w-6" />, title: 'They Sign Up & Order', description: 'When someone signs up through your link and places an order, you earn a commission.' },
  { icon: <Sparkles className="h-6 w-6" />, title: 'Track Earnings', description: 'View all your referrals and earned commissions in your dashboard.' },
];

export default function OnboardingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!user) return;
    const seen = localStorage.getItem(`${ONBOARDING_KEY}_${user.id}`);
    if (!seen) {
      const timer = setTimeout(() => setOpen(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  const handleDismiss = () => {
    if (user) localStorage.setItem(`${ONBOARDING_KEY}_${user.id}`, 'true');
    setOpen(false);
  };

  if (!user) return null;

  const steps = user.role === 'producer' ? PRODUCER_STEPS
    : user.role === 'wholesaler' ? WHOLESALER_STEPS
    : REFERRER_STEPS;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleDismiss(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            Welcome to OdungaMarket, {user.name}! 🎉
          </DialogTitle>
          <DialogDescription>
            Here's how to get started as a <Badge variant="secondary" className="ml-1 capitalize">{user.role}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Progress dots */}
          <div className="flex justify-center gap-2 mb-6">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentStep(i)}
                className={`h-2 rounded-full transition-all ${i === currentStep ? 'w-8 bg-primary' : 'w-2 bg-muted-foreground/30'}`}
              />
            ))}
          </div>

          <Card className="border-primary/20">
            <CardContent className="p-6 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                {step.icon}
              </div>
              <div>
                <h3 className="font-display text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </div>
              {step.action && (
                <Button
                  onClick={() => {
                    handleDismiss();
                    navigate(step.action!.path);
                  }}
                  className="gap-1"
                >
                  {step.action.label} <ArrowRight className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={handleDismiss}>Skip</Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={() => setCurrentStep(currentStep - 1)}>Previous</Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={handleDismiss}>
                <CheckCircle2 className="mr-1 h-4 w-4" /> Get Started
              </Button>
            ) : (
              <Button size="sm" onClick={() => setCurrentStep(currentStep + 1)}>
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
