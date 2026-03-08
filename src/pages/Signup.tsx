import { useState } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { UserRole } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Factory, Store, Users, Upload, FileText, X } from 'lucide-react';

const roles: { value: UserRole; label: string; icon: React.ReactNode; desc: string }[] = [
  { value: 'producer', label: 'Producer', icon: <Factory className="h-5 w-5" />, desc: 'Sell your products globally' },
  { value: 'wholesaler', label: 'Wholesaler', icon: <Store className="h-5 w-5" />, desc: 'Buy in bulk at best prices' },
  { value: 'referrer', label: 'Referrer', icon: <Users className="h-5 w-5" />, desc: 'Earn by inviting buyers' },
];

const requiredDocs: Record<string, string[]> = {
  producer: ['Business Registration Certificate', 'Tax ID / TIN Document', 'Product Catalog or Samples'],
  wholesaler: ['Business Registration Certificate', 'Trade License'],
};

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
  const [form, setForm] = useState({ name: '', email: '', password: '', role: '' as UserRole | '', business_name: '', country: '' });
  const [consents, setConsents] = useState<boolean[]>([false, false, false]);
  const [uploadedDocs, setUploadedDocs] = useState<{ name: string; file_name: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const currentConsents = form.role ? consentTexts[form.role] || [] : [];
  const allConsented = currentConsents.length > 0 && consents.slice(0, currentConsents.length).every(Boolean);
  const currentRequiredDocs = form.role ? requiredDocs[form.role] || [] : [];

  const handleRoleChange = (role: UserRole) => {
    setForm(f => ({ ...f, role }));
    setConsents([false, false, false]);
    setUploadedDocs([]);
  };

  const toggleConsent = (idx: number) => {
    setConsents(prev => prev.map((v, i) => i === idx ? !v : v));
  };

  const handleFileSelect = (docName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Mock: just store the file name
    setUploadedDocs(prev => {
      const filtered = prev.filter(d => d.name !== docName);
      return [...filtered, { name: docName, file_name: file.name }];
    });
    toast.success(`${file.name} selected`);
  };

  const removeDoc = (docName: string) => {
    setUploadedDocs(prev => prev.filter(d => d.name !== docName));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.role) { toast.error('Please select a role'); return; }
    if (!allConsented) { toast.error('Please agree to all terms before continuing'); return; }
    setLoading(true);
    const ok = await signup({
      name: form.name, email: form.email, password: form.password,
      role: form.role as UserRole, business_name: form.business_name || undefined,
      country: form.country, ref: refCode || undefined,
      documents: uploadedDocs,
    });
    setLoading(false);
    if (ok) {
      if (form.role === 'producer' || form.role === 'wholesaler') {
        toast.success('Account created! Your account is pending admin approval.');
        navigate('/login');
      } else {
        toast.success('Account created! Welcome to Waholo Market.');
        navigate('/');
      }
    } else {
      toast.error('Signup failed');
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
        <CardContent>
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
                <Label htmlFor="biz">Business Name</Label>
                <Input id="biz" value={form.business_name} onChange={e => setForm(f => ({ ...f, business_name: e.target.value }))} />
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" value={form.country} onChange={e => setForm(f => ({ ...f, country: e.target.value }))} placeholder="e.g. Nigeria" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
              </div>
            </div>

            {/* Document uploads for producers/wholesalers */}
            {currentRequiredDocs.length > 0 && (
              <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <Label className="text-sm font-semibold flex items-center gap-2">
                  <Upload className="h-4 w-4" /> Required Documents
                </Label>
                <p className="text-xs text-muted-foreground">Upload the following documents to speed up your approval. You can also submit them later.</p>
                {currentRequiredDocs.map(docName => {
                  const uploaded = uploadedDocs.find(d => d.name === docName);
                  return (
                    <div key={docName} className="flex items-center gap-3">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{docName}</p>
                        {uploaded ? (
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-xs text-primary truncate">{uploaded.file_name}</span>
                            <button type="button" onClick={() => removeDoc(docName)} className="text-destructive hover:text-destructive/80">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ) : (
                          <label className="text-xs text-primary hover:underline cursor-pointer">
                            Choose file
                            <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => handleFileSelect(docName, e)} />
                          </label>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

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
          <p className="mt-4 text-center text-sm text-muted-foreground">
            Already have an account? <Link to="/login" className="font-medium text-primary hover:underline">Sign in</Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
