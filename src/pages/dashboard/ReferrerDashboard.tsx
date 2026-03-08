import { useAuth } from '@/lib/auth-context';
import { mockReferrals } from '@/lib/mock-data';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Copy, Link2, DollarSign, Users } from 'lucide-react';
import { toast } from 'sonner';

export default function ReferrerDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const referralLink = `${window.location.origin}/signup?ref=${user.referral_code}`;
  const referrals = mockReferrals.filter(r => r.referrer_user_id === user.id);

  const copyLink = () => {
    navigator.clipboard.writeText(referralLink);
    toast.success('Referral link copied!');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="font-display text-3xl font-bold">Referral Dashboard</h1>
      <p className="mt-1 text-muted-foreground">Share your link, earn rewards when your referrals make their first purchase.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
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
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/20 text-success"><Link2 className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Referral Code</p><p className="font-display text-lg font-bold">{user.referral_code}</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Referral link */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="font-display text-lg">Your Referral Link</CardTitle>
          <CardDescription>Share this link with wholesalers. You earn rewards when they complete their first order.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-md border bg-muted px-3 py-2 text-sm truncate">{referralLink}</code>
            <Button onClick={copyLink} size="sm" variant="outline"><Copy className="mr-1 h-4 w-4" /> Copy</Button>
          </div>
        </CardContent>
      </Card>

      {/* Referred users */}
      <Card className="mt-6">
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
    </div>
  );
}
