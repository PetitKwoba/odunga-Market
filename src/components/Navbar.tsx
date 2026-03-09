import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { useCart } from '@/lib/cart-context';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Menu, LogOut, LayoutDashboard, UserCircle } from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import NotificationCenter from '@/components/NotificationCenter';
import CurrencySelector from '@/components/CurrencySelector';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const dashboardPath = user ? (
    user.role === 'admin' ? '/admin' :
    user.role === 'producer' ? '/dashboard/producer' :
    user.role === 'wholesaler' ? '/dashboard/wholesaler' :
    '/dashboard/referrer'
  ) : '/login';

  const navLinks = [
    { label: 'Browse Products', href: '/products' },
    { label: 'Help Center', href: '/help' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="font-display text-xl font-bold tracking-tight text-primary">
          Waholo<span className="text-secondary">Market</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 md:flex">
          {navLinks.map(l => (
            <Link key={l.href} to={l.href} className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <CurrencySelector />
          {user && user.role === 'wholesaler' && (
            <Button variant="ghost" size="icon" className="relative" onClick={() => navigate('/checkout')}>
              <ShoppingCart className="h-5 w-5" />
              {itemCount > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-[10px] flex items-center justify-center bg-secondary text-secondary-foreground">
                  {itemCount}
                </Badge>
              )}
            </Button>
          )}
          {user ? (
            <>
              <NotificationCenter />
              <Button variant="outline" size="sm" onClick={() => navigate(dashboardPath)}>
                <LayoutDashboard className="mr-1 h-4 w-4" /> Dashboard
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate('/profile')}>
                <UserCircle className="mr-1 h-4 w-4" /> Profile
              </Button>
              <Button variant="ghost" size="sm" onClick={handleLogout}>
                <LogOut className="mr-1 h-4 w-4" /> Logout
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Log in</Button>
              <Button size="sm" onClick={() => navigate('/signup')}>Sign Up</Button>
            </>
          )}
        </div>

        {/* Mobile */}
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon"><Menu className="h-5 w-5" /></Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetTitle className="font-display text-lg font-bold text-primary">Waholo<span className="text-secondary">Market</span></SheetTitle>
            <nav className="mt-6 flex flex-col gap-4">
              {navLinks.map(l => (
                <Link key={l.href} to={l.href} onClick={() => setOpen(false)} className="text-sm font-medium hover:text-primary">{l.label}</Link>
              ))}
              {user && user.role === 'wholesaler' && (
                <Link to="/checkout" onClick={() => setOpen(false)} className="flex items-center gap-2 text-sm font-medium">
                  <ShoppingCart className="h-4 w-4" /> Cart ({itemCount})
                </Link>
              )}
              {user ? (
                <>
                  <Link to={dashboardPath} onClick={() => setOpen(false)} className="text-sm font-medium">Dashboard</Link>
                  <Link to="/profile" onClick={() => setOpen(false)} className="text-sm font-medium">Profile</Link>
                  <button onClick={async () => { await logout(); navigate('/'); setOpen(false); }} className="text-left text-sm font-medium text-destructive">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setOpen(false)} className="text-sm font-medium">Log in</Link>
                  <Link to="/signup" onClick={() => setOpen(false)} className="text-sm font-medium text-primary">Sign Up</Link>
                </>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
