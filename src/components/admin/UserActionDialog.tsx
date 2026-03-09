import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

interface UserActionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: 'change_role' | 'suspend' | null;
  userId: string;
  userName: string;
  currentRole?: string;
  onComplete: () => void;
}

export default function UserActionDialog({ open, onOpenChange, action, userId, userName, currentRole, onComplete }: UserActionDialogProps) {
  const [newRole, setNewRole] = useState<AppRole>((currentRole as AppRole) || 'wholesaler');
  const [suspendReason, setSuspendReason] = useState('');
  const [suspendDays, setSuspendDays] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChangeRole = async () => {
    setLoading(true);
    const { error } = await supabase.from('user_roles').update({ role: newRole }).eq('user_id', userId);
    if (error) { toast.error('Failed: ' + error.message); setLoading(false); return; }
    
    // Log audit
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from('audit_logs').insert({
        admin_id: user.id, action: 'change_role', target_type: 'user', target_id: userId,
        details: { from: currentRole, to: newRole, user_name: userName }
      });
    }
    
    toast.success(`${userName}'s role changed to ${newRole}`);
    setLoading(false);
    onOpenChange(false);
    onComplete();
  };

  const handleSuspend = async () => {
    if (!suspendReason.trim()) { toast.error('Reason is required'); return; }
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const expiresAt = suspendDays ? new Date(Date.now() + parseInt(suspendDays) * 86400000).toISOString() : null;
    
    const { error } = await supabase.from('user_suspensions').insert({
      user_id: userId, suspended_by: user.id, reason: suspendReason.trim(),
      expires_at: expiresAt
    });
    if (error) { toast.error('Failed: ' + error.message); setLoading(false); return; }

    await supabase.from('audit_logs').insert({
      admin_id: user.id, action: 'suspend_user', target_type: 'user', target_id: userId,
      details: { reason: suspendReason, days: suspendDays || 'permanent', user_name: userName }
    });
    
    toast.success(`${userName} suspended`);
    setLoading(false);
    onOpenChange(false);
    onComplete();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {action === 'change_role' ? `Change Role — ${userName}` : `Suspend — ${userName}`}
          </DialogTitle>
        </DialogHeader>
        {action === 'change_role' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>New Role</Label>
              <Select value={newRole} onValueChange={v => setNewRole(v as AppRole)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="producer">Producer</SelectItem>
                  <SelectItem value="wholesaler">Wholesaler</SelectItem>
                  <SelectItem value="referrer">Referrer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
        {action === 'suspend' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea value={suspendReason} onChange={e => setSuspendReason(e.target.value)} placeholder="Reason for suspension..." rows={3} />
            </div>
            <div className="space-y-2">
              <Label>Duration (days, leave empty for permanent)</Label>
              <Input type="number" value={suspendDays} onChange={e => setSuspendDays(e.target.value)} placeholder="e.g. 30" />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={action === 'change_role' ? handleChangeRole : handleSuspend}
            disabled={loading}
            variant={action === 'suspend' ? 'destructive' : 'default'}
          >
            {loading ? 'Processing...' : action === 'change_role' ? 'Change Role' : 'Suspend User'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
