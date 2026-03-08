import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Factory, Store, Users, ArrowRight, Shield, Globe, TrendingUp } from 'lucide-react';

export default function Landing() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-primary px-4 py-20 text-primary-foreground md:py-32">
        <div className="container relative z-10 mx-auto max-w-4xl text-center">
          <h1 className="font-display text-4xl font-bold tracking-tight md:text-6xl">
            The Global B2B Marketplace
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90 md:text-xl">
            Connect producers with wholesalers worldwide. Buy in bulk, sell globally, and earn rewards by referring buyers.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90" asChild>
              <Link to="/signup?role=producer">Sign up as Producer <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
            <Button size="lg" variant="outline" className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/signup?role=wholesaler">Sign up as Wholesaler</Link>
            </Button>
            <Button size="lg" variant="ghost" className="text-primary-foreground hover:bg-primary-foreground/10" asChild>
              <Link to="/signup?role=referrer">Become a Referrer</Link>
            </Button>
          </div>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,hsl(38_80%_55%/0.15),transparent_60%)]" />
      </section>

      {/* How it works */}
      <section id="how-it-works" className="px-4 py-16 md:py-24">
        <div className="container mx-auto max-w-5xl">
          <h2 className="text-center font-display text-3xl font-bold md:text-4xl">How Waholo Market Works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { icon: <Factory className="h-8 w-8" />, title: 'For Producers', desc: 'List your products, set bulk pricing, define referral rewards, and reach wholesalers globally. Manage orders from your dashboard.', cta: 'Start Selling', href: '/signup?role=producer' },
              { icon: <Store className="h-8 w-8" />, title: 'For Wholesalers', desc: 'Browse thousands of products from verified manufacturers. Get the best bulk prices with transparent MOQs and delivery timelines.', cta: 'Start Buying', href: '/signup?role=wholesaler' },
              { icon: <Users className="h-8 w-8" />, title: 'For Referrers', desc: 'Sign up for free, share your unique link, and earn rewards every time a referred wholesaler completes their first order.', cta: 'Start Earning', href: '/signup?role=referrer' },
            ].map((item) => (
              <div key={item.title} className="rounded-xl border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">{item.icon}</div>
                <h3 className="mt-4 font-display text-xl font-semibold">{item.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.desc}</p>
                <Button variant="link" className="mt-3" asChild>
                  <Link to={item.href}>{item.cta} <ArrowRight className="ml-1 h-3 w-3" /></Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-t bg-muted/50 px-4 py-16">
        <div className="container mx-auto max-w-4xl">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { icon: <Shield className="h-6 w-6" />, title: 'Verified Producers', desc: 'All producers are vetted by our team.' },
              { icon: <Globe className="h-6 w-6" />, title: 'Global Reach', desc: 'Ship to 50+ countries worldwide.' },
              { icon: <TrendingUp className="h-6 w-6" />, title: 'Best Bulk Prices', desc: 'Transparent tiered pricing on every product.' },
            ].map(t => (
              <div key={t.title} className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">{t.icon}</div>
                <div>
                  <h4 className="font-display font-semibold">{t.title}</h4>
                  <p className="text-sm text-muted-foreground">{t.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16">
        <div className="container mx-auto max-w-2xl text-center">
          <h2 className="font-display text-3xl font-bold">Ready to grow your business?</h2>
          <p className="mt-2 text-muted-foreground">Join thousands of producers and wholesalers on Waholo Market.</p>
          <Button size="lg" className="mt-6" asChild>
            <Link to="/signup">Get Started Free <ArrowRight className="ml-1 h-4 w-4" /></Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t bg-card px-4 py-8">
        <div className="container mx-auto flex flex-col items-center gap-4 text-center text-sm text-muted-foreground md:flex-row md:justify-between md:text-left">
          <p className="font-display font-semibold text-foreground">Waholo<span className="text-secondary">Market</span></p>
          <p>© 2025 Waholo Market. All rights reserved.</p>
          <div className="flex gap-4">
            <Link to="#" className="hover:text-foreground">Terms</Link>
            <Link to="#" className="hover:text-foreground">Privacy</Link>
            <Link to="#" className="hover:text-foreground">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
