import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { User, UserProfile, defaultProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { User as UserIcon, Building2, CreditCard, FileText, Upload, AlertCircle, CheckCircle, Clock, X } from 'lucide-react';
import { toast } from 'sonner';

function getAllUsers(): User[] {
  const stored = localStorage.getItem('waholo_all_users');
  if (stored) try {
    const parsed: User[] = JSON.parse(stored);
    return parsed.map(u => ({
      ...u,
      documents: u.documents || [],
      document_requests: u.document_requests || [],
      profile: u.profile || { ...defaultProfile },
    }));
  } catch { /* */ }
  return [];
}

function saveAllUsers(users: User[]) {
  localStorage.setItem('waholo_all_users', JSON.stringify(users));
}

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile>({ ...defaultProfile });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const allUsers = getAllUsers();
    const current = allUsers.find(u => u.id === user.id);
    if (current?.profile) setProfile({ ...defaultProfile, ...current.profile });
  }, [user]);

  if (!user) return null;

  const allUsers = getAllUsers();
  const currentUser = allUsers.find(u => u.id === user.id) || user;
  const pendingRequests = (currentUser.document_requests || []).filter(r => !r.fulfilled);

  const updateField = (field: keyof UserProfile, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    setSaving(true);
    const users = getAllUsers();
    const updated = users.map(u => u.id === user.id ? { ...u, profile, updated_at: new Date().toISOString() } : u);
    saveAllUsers(updated);
    localStorage.setItem('waholo_user', JSON.stringify({ ...currentUser, profile, updated_at: new Date().toISOString() }));
    setSaving(false);
    toast.success('Profile saved successfully');
  };

  const handleDocUpload = (requestId: string, docName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const users = getAllUsers();
    const updated = users.map(u => {
      if (u.id !== user.id) return u;
      return {
        ...u,
        documents: [
          ...u.documents,
          {
            id: 'doc' + Date.now(),
            name: docName,
            file_name: file.name,
            uploaded_at: new Date().toISOString(),
            status: 'pending' as const,
          },
        ],
        document_requests: u.document_requests.map(r => r.id === requestId ? { ...r, fulfilled: true } : r),
      };
    });
    saveAllUsers(updated);
    toast.success(`${file.name} uploaded for "${docName}"`);
    // Force re-render
    window.location.reload();
  };

  const showBusiness = user.role === 'producer' || user.role === 'wholesaler';
  const showBank = user.role === 'producer' || user.role === 'referrer';

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">My Profile</h1>
      <p className="mt-1 text-muted-foreground">Manage your account details</p>

      {/* Pending document requests banner */}
      {pendingRequests.length > 0 && (
        <Card className="mt-4 border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-warning" />
              <p className="font-medium">Admin has requested {pendingRequests.length} document(s)</p>
            </div>
            <div className="space-y-2">
              {pendingRequests.map(req => (
                <div key={req.id} className="flex items-center justify-between rounded-lg border bg-background p-3">
                  <div>
                    <p className="text-sm font-medium">{req.document_name}</p>
                    {req.description && <p className="text-xs text-muted-foreground">{req.description}</p>}
                    <p className="text-xs text-muted-foreground">Requested {new Date(req.requested_at).toLocaleDateString()}</p>
                  </div>
                  <label className="cursor-pointer">
                    <Button size="sm" variant="outline" className="gap-1" asChild>
                      <span><Upload className="h-3.5 w-3.5" /> Upload</span>
                    </Button>
                    <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => handleDocUpload(req.id, req.document_name, e)} />
                  </label>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="personal" className="mt-6">
        <TabsList>
          <TabsTrigger value="personal" className="gap-1"><UserIcon className="h-4 w-4" /> Personal</TabsTrigger>
          {showBusiness && <TabsTrigger value="business" className="gap-1"><Building2 className="h-4 w-4" /> Business</TabsTrigger>}
          {showBank && <TabsTrigger value="payment" className="gap-1"><CreditCard className="h-4 w-4" /> Payment</TabsTrigger>}
          <TabsTrigger value="documents" className="gap-1">
            <FileText className="h-4 w-4" /> Documents
            {pendingRequests.length > 0 && <Badge className="ml-1 bg-warning text-warning-foreground text-[10px] px-1.5 py-0">{pendingRequests.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personal" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">Personal Information</CardTitle>
              <CardDescription>Your basic account details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Full Name</Label>
                  <Input value={user.name} disabled className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input value={user.email} disabled className="bg-muted" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Phone Number</Label>
                  <Input placeholder="+1234567890" value={profile.phone} onChange={e => updateField('phone', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Input value={user.country} disabled className="bg-muted" />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>City</Label>
                  <Input placeholder="Your city" value={profile.city} onChange={e => updateField('city', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Address</Label>
                  <Input placeholder="Street address" value={profile.address} onChange={e => updateField('address', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea placeholder="Tell us about yourself..." value={profile.bio} onChange={e => updateField('bio', e.target.value)} rows={3} />
              </div>
              <div className="space-y-2">
                <Label>Website</Label>
                <Input placeholder="https://..." value={profile.website} onChange={e => updateField('website', e.target.value)} />
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <Badge variant="outline">{user.role}</Badge>
                <Badge variant={user.is_approved ? 'default' : 'outline'} className={user.is_approved ? 'bg-success text-success-foreground' : ''}>
                  {user.is_approved ? 'Approved' : 'Pending Approval'}
                </Badge>
                <span className="text-xs text-muted-foreground">Referral code: {user.referral_code}</span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {showBusiness && (
          <TabsContent value="business" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Business Details</CardTitle>
                <CardDescription>Your business information for verification</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Business Name</Label>
                  <Input value={user.business_name || ''} disabled className="bg-muted" />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Tax ID / TIN</Label>
                    <Input placeholder="Tax identification number" value={profile.tax_id} onChange={e => updateField('tax_id', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Registration Number</Label>
                    <Input placeholder="Business registration #" value={profile.registration_number} onChange={e => updateField('registration_number', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <Input placeholder="e.g. Textiles, Agriculture" value={profile.industry} onChange={e => updateField('industry', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {showBank && (
          <TabsContent value="payment" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="font-display text-lg">Payment Information</CardTitle>
                <CardDescription>How you receive payouts from the platform</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Payout Method</Label>
                  <Select value={profile.payout_method} onValueChange={v => updateField('payout_method', v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                      <SelectItem value="mobile_money">Mobile Money</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Bank Name</Label>
                    <Input placeholder="Your bank" value={profile.bank_name} onChange={e => updateField('bank_name', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Account Number</Label>
                    <Input placeholder="Account number" value={profile.bank_account_number} onChange={e => updateField('bank_account_number', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Routing / Sort Code</Label>
                  <Input placeholder="Routing number" value={profile.bank_routing_number} onChange={e => updateField('bank_routing_number', e.target.value)} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="documents" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-lg">My Documents</CardTitle>
              <CardDescription>Documents submitted for verification</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {currentUser.documents.length === 0 && pendingRequests.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No documents uploaded yet.</p>
              ) : null}

              {currentUser.documents.map(doc => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.file_name} · {new Date(doc.uploaded_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <Badge
                    className={
                      doc.status === 'approved' ? 'bg-success text-success-foreground' :
                      doc.status === 'rejected' ? 'bg-destructive text-destructive-foreground' :
                      ''
                    }
                    variant={doc.status === 'pending' ? 'outline' : 'default'}
                  >
                    {doc.status === 'pending' && <Clock className="mr-1 h-3 w-3" />}
                    {doc.status === 'approved' && <CheckCircle className="mr-1 h-3 w-3" />}
                    {doc.status === 'rejected' && <X className="mr-1 h-3 w-3" />}
                    {doc.status}
                  </Badge>
                </div>
              ))}

              {pendingRequests.length > 0 && (
                <>
                  <Separator className="my-3" />
                  <p className="text-sm font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4 text-warning" /> Requested Documents</p>
                  {pendingRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between rounded-lg border border-warning/30 bg-warning/5 p-3">
                      <div>
                        <p className="text-sm font-medium">{req.document_name}</p>
                        {req.description && <p className="text-xs text-muted-foreground">{req.description}</p>}
                      </div>
                      <label className="cursor-pointer">
                        <Button size="sm" variant="outline" className="gap-1" asChild>
                          <span><Upload className="h-3.5 w-3.5" /> Upload</span>
                        </Button>
                        <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={e => handleDocUpload(req.id, req.document_name, e)} />
                      </label>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6 flex justify-end">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? 'Saving...' : 'Save Profile'}
        </Button>
      </div>
    </div>
  );
}
