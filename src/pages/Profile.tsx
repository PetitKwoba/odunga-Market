import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { User as UserIcon, Building2, CreditCard, FileText, Upload, AlertCircle, CheckCircle, Clock, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

interface ProfileForm {
  phone: string;
  address: string;
  city: string;
  bio: string;
  website: string;
  tax_id: string;
  registration_number: string;
  industry: string;
  bank_name: string;
  bank_account_number: string;
  bank_routing_number: string;
  payout_method: string;
}

interface UserDocument {
  id: string;
  name: string;
  file_name: string;
  uploaded_at: string;
  status: string;
  note: string | null;
}

interface DocumentRequest {
  id: string;
  document_name: string;
  description: string | null;
  requested_at: string;
  fulfilled: boolean;
}

export default function ProfilePage() {
  const { user, refreshProfile } = useAuth();
  const [profile, setProfile] = useState<ProfileForm>({
    phone: '', address: '', city: '', bio: '', website: '',
    tax_id: '', registration_number: '', industry: '',
    bank_name: '', bank_account_number: '', bank_routing_number: '',
    payout_method: 'bank_transfer',
  });
  const [documents, setDocuments] = useState<UserDocument[]>([]);
  const [docRequests, setDocRequests] = useState<DocumentRequest[]>([]);
  const [saving, setSaving] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  useEffect(() => {
    if (!user) return;
    setProfile({
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      bio: user.bio || '',
      website: user.website || '',
      tax_id: user.tax_id || '',
      registration_number: user.registration_number || '',
      industry: user.industry || '',
      bank_name: user.bank_name || '',
      bank_account_number: user.bank_account_number || '',
      bank_routing_number: user.bank_routing_number || '',
      payout_method: user.payout_method || 'bank_transfer',
    });

    // Fetch logo
    supabase.from('profiles').select('logo_url').eq('user_id', user.id).single().then(({ data }) => {
      if (data?.logo_url) setLogoUrl(data.logo_url);
    });

    // Fetch documents
    supabase.from('user_documents').select('*').eq('user_id', user.id).order('uploaded_at', { ascending: false }).then(({ data }) => {
      if (data) setDocuments(data as UserDocument[]);
    });

    // Fetch document requests
    supabase.from('document_requests').select('*').eq('user_id', user.id).order('requested_at', { ascending: false }).then(({ data }) => {
      if (data) setDocRequests(data as DocumentRequest[]);
    });
  }, [user]);

  if (!user) return null;

  const pendingRequests = docRequests.filter(r => !r.fulfilled);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    setUploadingLogo(true);
    const filePath = `logos/${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { upsert: true });
    if (uploadError) { toast.error('Upload failed: ' + uploadError.message); setUploadingLogo(false); return; }
    const { error: updateError } = await supabase.from('profiles').update({ logo_url: filePath }).eq('user_id', user.id);
    if (updateError) { toast.error('Failed to save logo'); setUploadingLogo(false); return; }
    setLogoUrl(filePath);
    setUploadingLogo(false);
    toast.success('Logo uploaded successfully');
  };

  const updateField = (field: keyof ProfileForm, value: string) => {
    setProfile(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        phone: profile.phone,
        address: profile.address,
        city: profile.city,
        bio: profile.bio,
        website: profile.website,
        tax_id: profile.tax_id,
        registration_number: profile.registration_number,
        industry: profile.industry,
        bank_name: profile.bank_name,
        bank_account_number: profile.bank_account_number,
        bank_routing_number: profile.bank_routing_number,
        payout_method: profile.payout_method,
      })
      .eq('user_id', user.id);

    setSaving(false);
    if (error) {
      toast.error('Failed to save profile: ' + error.message);
    } else {
      await refreshProfile();
      toast.success('Profile saved successfully');
    }
  };

  const handleDocUpload = async (requestId: string, docName: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Upload file to storage
    const filePath = `${user.id}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, file);
    if (uploadError) {
      toast.error('File upload failed: ' + uploadError.message);
      return;
    }

    // Create document record
    const { error: docError } = await supabase.from('user_documents').insert({
      user_id: user.id,
      name: docName,
      file_name: file.name,
      file_url: filePath,
    });
    if (docError) {
      toast.error('Failed to save document record');
      return;
    }

    // Mark request as fulfilled
    if (requestId) {
      await supabase.from('document_requests').update({ fulfilled: true }).eq('id', requestId);
    }

    toast.success(`${file.name} uploaded for "${docName}"`);

    // Refresh
    const { data: docs } = await supabase.from('user_documents').select('*').eq('user_id', user.id).order('uploaded_at', { ascending: false });
    if (docs) setDocuments(docs as UserDocument[]);
    const { data: reqs } = await supabase.from('document_requests').select('*').eq('user_id', user.id);
    if (reqs) setDocRequests(reqs as DocumentRequest[]);
  };

  const showBusiness = user.role === 'producer' || user.role === 'wholesaler';
  const showBank = user.role === 'producer' || user.role === 'referrer';

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-bold">My Profile</h1>
      <p className="mt-1 text-muted-foreground">Manage your account details</p>

      {pendingRequests.length > 0 && (
        <Card className="mt-4 border-secondary/50 bg-secondary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-5 w-5 text-secondary" />
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
            {pendingRequests.length > 0 && <Badge className="ml-1 bg-secondary text-secondary-foreground text-[10px] px-1.5 py-0">{pendingRequests.length}</Badge>}
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
              {documents.length === 0 && pendingRequests.length === 0 && (
                <p className="py-8 text-center text-sm text-muted-foreground">No documents uploaded yet.</p>
              )}

              {documents.map(doc => (
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
                      doc.status === 'rejected' ? 'bg-destructive text-destructive-foreground' : ''
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
                  <p className="text-sm font-semibold flex items-center gap-2"><AlertCircle className="h-4 w-4 text-secondary" /> Requested Documents</p>
                  {pendingRequests.map(req => (
                    <div key={req.id} className="flex items-center justify-between rounded-lg border border-secondary/30 bg-secondary/5 p-3">
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
