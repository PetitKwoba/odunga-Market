import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface Dispute {
  id: string;
  order_id: string;
  raised_by: string;
  dispute_type: string;
  description: string;
  status: string;
  resolution: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  created_at: string;
}

interface DisputeManagementProps {
  profiles: { user_id: string; name: string }[];
}

export default function DisputeManagement({ profiles }: DisputeManagementProps) {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [resolveDialog, setResolveDialog] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState('');
  const [resolving, setResolving] = useState(false);

  const fetchDisputes = () => {
    supabase.from('disputes').select('*').order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setDisputes(data as Dispute[]); setLoading(false); });
  };

  useEffect(() => { fetchDisputes(); }, []);

  const getName = (id: string) => profiles.find(p => p.user_id === id)?.name || id.slice(0, 8);

  const handleResolve = async (status: 'resolved' | 'rejected') => {
    if (!resolveDialog || !resolution.trim()) { toast.error('Resolution notes required'); return; }
    setResolving(true);
    const { data: { user } } = await supabase.auth.getUser();
    
    const { error } = await supabase.from('disputes').update({
      status, resolution: resolution.trim(),
      resolved_by: user?.id, resolved_at: new Date().toISOString()
    }).eq('id', resolveDialog.id);

    if (error) { toast.error('Failed: ' + error.message); setResolving(false); return; }

    if (user) {
      await supabase.from('audit_logs').insert({
        admin_id: user.id, action: `dispute_${status}`, target_type: 'dispute', target_id: resolveDialog.id,
        details: { order_id: resolveDialog.order_id, resolution: resolution.trim() }
      });
    }

    toast.success(`Dispute ${status}`);
    setResolving(false);
    setResolveDialog(null);
    setResolution('');
    fetchDisputes();
  };

  const statusColor = (s: string) => {
    if (s === 'resolved') return 'bg-success text-success-foreground';
    if (s === 'rejected') return 'bg-destructive text-destructive-foreground';
    return 'bg-secondary text-secondary-foreground';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Disputes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : disputes.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No disputes</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Raised By</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {disputes.map(d => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">{d.order_id.slice(0, 8)}...</TableCell>
                    <TableCell className="font-medium">{getName(d.raised_by)}</TableCell>
                    <TableCell><Badge variant="outline">{d.dispute_type}</Badge></TableCell>
                    <TableCell className="max-w-xs truncate">{d.description}</TableCell>
                    <TableCell><Badge className={statusColor(d.status)}>{d.status}</Badge></TableCell>
                    <TableCell className="text-xs">{new Date(d.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      {d.status === 'open' && (
                        <Button size="sm" variant="outline" onClick={() => { setResolveDialog(d); setResolution(''); }}>
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!resolveDialog} onOpenChange={() => setResolveDialog(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Resolve Dispute</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm"><strong>Type:</strong> {resolveDialog?.dispute_type}</p>
              <p className="text-sm mt-1"><strong>Description:</strong> {resolveDialog?.description}</p>
            </div>
            <div className="space-y-2">
              <Label>Resolution Notes</Label>
              <Textarea value={resolution} onChange={e => setResolution(e.target.value)} placeholder="Describe the resolution..." rows={3} />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResolveDialog(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => handleResolve('rejected')} disabled={resolving}>
              <XCircle className="mr-1 h-4 w-4" /> Reject
            </Button>
            <Button onClick={() => handleResolve('resolved')} disabled={resolving}>
              <CheckCircle className="mr-1 h-4 w-4" /> Resolve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
