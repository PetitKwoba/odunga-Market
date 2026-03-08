import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth, UserRole } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Factory, Store, Users } from 'lucide-react';

const AFRICAN_COUNTRIES = [
  'Algeria', 'Angola', 'Benin', 'Botswana', 'Burkina Faso', 'Burundi', 'Cameroon',
  'Cape Verde', 'Central African Republic', 'Chad', 'Comoros', 'Congo', 'DR Congo',
  'Djibouti', 'Egypt', 'Equatorial Guinea', 'Eritrea', 'Eswatini', 'Ethiopia',
  'Gabon', 'Gambia', 'Ghana', 'Guinea', 'Guinea-Bissau', 'Ivory Coast', 'Kenya',
  'Lesotho', 'Liberia', 'Libya', 'Madagascar', 'Malawi', 'Mali', 'Mauritania',
  'Mauritius', 'Morocco', 'Mozambique', 'Namibia', 'Niger', 'Nigeria', 'Rwanda',
  'São Tomé and Príncipe', 'Senegal', 'Seychelles', 'Sierra Leone', 'Somalia',
  'South Africa', 'South Sudan', 'Sudan', 'Tanzania', 'Togo', 'Tunisia', 'Uganda',
  'Zambia', 'Zimbabwe',
];

const OTHER_COUNTRIES = [
  'United Arab Emirates', 'United Kingdom', 'United States', 'China', 'India',
  'Turkey', 'Saudi Arabia', 'Germany', 'France', 'Netherlands', 'Belgium',
  'Brazil', 'Canada', 'Australia', 'Japan', 'South Korea', 'Singapore',
  'Malaysia', 'Indonesia', 'Thailand', 'Vietnam', 'Pakistan', 'Bangladesh',
];

const ALL_COUNTRIES = [...AFRICAN_COUNTRIES, ...OTHER_COUNTRIES].sort();

const roles: { value: UserRole; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'producer', label: 'Producer', icon: <Factory className="h-5 w-5" />, desc: 'Sell your products globally' },
  { value: 'wholesaler', label: 'Wholesaler', icon: <Store className="h-5 w-5" />, desc: 'Buy in bulk at best prices' },
  { value: 'referrer', label: 'Referrer', icon: <Users className="h-5 w-5" />, desc: 'Earn by inviting buyers' },
];

const consentTexts: Record<string, string[]> = {
  producer: [
    'I agree to the Terms of Service and Privacy Policy.',
    'I understand that payments from wholesalers are processed through Waholo Market and disbursed to me every Monday, minus the referral fee and a 5% platform maintenance fee.',
    'I am responsible for arranging logistics and shipping for all orders I fulfill.',
  ],
  wholesaler: [
    'I agree to the Terms of Service and Privacy Policy.',
    'I understand that all payments are made through the Waholo Market platform and held until the order is processed.',
    'I understand that the producer is responsible for logistics and shipping arrangements.',
  ],
  referrer: [
    'I agree to the Terms of Service and Privacy Policy.',
    'I understand that I earn referral rewards only after a referred wholesaler completes and pays for their first order.',
    'I understand that rewards are set by each producer and paid from order proceeds.',
  ],
};

export default function Signup() {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get('ref') || '';
  const preselectedRole = searchParams.get('role') as UserRole | null;
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: (preselectedRole || '') as UserRole | '',
    business_name: '',
    country: '',
  });
  const [consents, setConsents] = useState<boolean[]>([false, false, false]);
  const [loading, setLoading] = useState(false);
  const { signup, signInWithOAuth } = useAuth();
  const navigate = useNavigate();

  const currentConsents = form.role ? consentTexts[form.role] || [] : [];
  const allConsented = currentConsents.length > 0 && consents.slice(0, currentConsents.length).every(Boolean);

  const handleRoleChange = (role: UserRole) => {
    setForm(f => ({ ...f, role }));
    setConsents([false, false, false]);
  };

  const toggleConsent = (idx: number) => {
    setConsents(prev => prev.map((v, i) => i === idx ? !v : v));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role) { toast.error('Please select a role'); return; }
    if (!allConsented) { toast.error('Please agree to all terms before continuing'); return; }
    if (form.password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (!form.country) { toast.error('Please select your country'); return; }
    if (form.role !== 'referrer' && !form.business_name.trim()) {
      toast.error('Business name is required'); return;
    }

    setLoading(true);
    const result = await signup({
      name: form.name,
      email: form.email,
      password: form.password,
      role: form.role as UserRole,
      business_name: form.business_name || undefined,
      country: form.country,
      ref: refCode || undefined,
    });
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.needsConfirmation) {
      toast.success('Account created! Please check your email to verify your account before signing in.', { duration: 8000 });
      navigate('/login');
    } else {
      toast.success('Account created! Welcome to Waholo Market.');
      navigate('/');
    }
  };

  const handleOAuth = async (provider: 'google' | 'apple') => {
    setLoading(true);
    const result = await signInWithOAuth(provider);
    setLoading(false);
    if (result.error) {
      toast.error(result.error);
    }
  };

  return (
    <div className="flex min-h-[80vh] items-center justify-center px-4 py-8">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="font-display text-2xl">Create your account</CardTitle>
          <CardDescription>Join Waholo Market — the global B2B marketplace</CardDescription>
          {refCode && (
            <p className="mt-1 text-sm text-secondary font-medium">🎉 You were referred! Code: {refCode}</p>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {/* OAuth buttons */}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="w-full gap-2" onClick={() => handleOAuth('google')} disabled={loading}>
              <svg className="h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Google
            </Button>
            <Button variant="outline" className="w-full gap-2" onClick={() => handleOAuth('apple')} disabled={loading}>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/></svg>
              Apple
            </Button>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><Separator /></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">or sign up with email</span></div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Role selection */}
            <div className="space-y-2">
              <Label>I want to join as...</Label>
              <div className="grid grid-cols-3 gap-2">
                {roles.map(r => (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => handleRoleChange(r.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-center transition-all ${
                      form.role === r.value ? 'border-primary bg-primary/5' : 'border-border hover:border-muted-foreground/30'
                    }`}
                  >
                    {r.icon}
                    <span className="text-xs font-medium">{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
              </div>
            </div>

            {form.role !== 'referrer' && form.role !== '' && (
              <div className="space-y-2">
                <Label htmlFor="biz">Business Name <span className="text-destructive">*</span></Label>
                <Input id="biz" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} required />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="country">Country <span className="text-destructive">*</span></Label>
                <Select value={form.country} onValueChange={v => setForm(f => ({ ...f, country: v }))}>
                  <SelectTrigger id="country">
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent className="max-h-60">
                    {ALL_COUNTRIES.map(c => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required minLength={6} />
              </div>
            </div>

            {/* Consent checkboxes */}
            {form.role && currentConsents.length > 0 && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <Label className="text-sm font-semibold">Terms & Consent</Label>
                {currentConsents.map((text, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    <Checkbox
                      id={`consent-${idx}`}
                      checked={consents[idx]}
                      onCheckedChange={() => toggleConsent(idx)}
                      className="mt-0.5"
                    />
                    <label htmlFor={`consent-${idx}`} className="text-sm leading-snug text-muted-foreground cursor-pointer">
                      {text}
                    </label>
                  </div>
                ))}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading || !allConsented}>
              {loading ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
