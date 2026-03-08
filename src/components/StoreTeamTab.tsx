import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { StoreTeamMember, StoreTeamRole, StorePermission, ROLE_PERMISSIONS, PERMISSION_LABELS } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Pencil, Trash2, UserPlus, Shield, Users } from 'lucide-react';
import { toast } from 'sonner';

const ROLE_LABELS: Record<StoreTeamRole, string> = {
  store_admin: 'Store Admin',
  store_manager: 'Store Manager',
  order_handler: 'Order Handler',
  viewer: 'Viewer',
  delivery_person: 'Delivery Person',
  custom: 'Custom Role',
};

const ALL_PERMISSIONS: StorePermission[] = [
  'manage_products', 'manage_orders', 'view_orders', 'manage_payouts',
  'manage_team', 'view_reports', 'manage_shipping', 'update_delivery_status',
];

interface MemberForm {
  name: string;
  email: string;
  phone: string;
  role: StoreTeamRole;
  custom_role_name: string;
  permissions: StorePermission[];
}

const emptyForm: MemberForm = {
  name: '', email: '', phone: '', role: 'store_manager', custom_role_name: '', permissions: [...ROLE_PERMISSIONS.store_manager],
};

export default function StoreTeamTab() {
  const { user } = useAuth();
  const [team, setTeam] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>({ ...emptyForm });

  useEffect(() => {
    if (!user) return;
    supabase.from('store_team_members').select('*').eq('producer_id', user.id).order('added_at', { ascending: false }).then(({ data }) => {
      if (data) setTeam(data);
    });
  }, [user]);

  if (!user) return null;

  const handleRoleChange = (role: StoreTeamRole) => {
    if (role === 'custom') {
      setForm(f => ({ ...f, role, permissions: [] }));
    } else {
      setForm(f => ({ ...f, role, custom_role_name: '', permissions: [...ROLE_PERMISSIONS[role]] }));
    }
  };

  const togglePermission = (perm: StorePermission) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(perm) ? f.permissions.filter(p => p !== perm) : [...f.permissions, perm],
    }));
  };

  const openAdd = () => { setEditingId(null); setForm({ ...emptyForm }); setDialogOpen(true); };

  const openEdit = (member: any) => {
    setEditingId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      phone: member.phone || '',
      role: member.role as StoreTeamRole,
      custom_role_name: member.custom_role_name || '',
      permissions: (member.permissions || []) as StorePermission[],
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error('Name and email required'); return; }

    if (editingId) {
      const { error } = await supabase.from('store_team_members').update({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        custom_role_name: form.role === 'custom' ? form.custom_role_name.trim() : null,
        permissions: form.permissions,
      }).eq('id', editingId);
      if (error) { toast.error('Failed: ' + error.message); return; }
      toast.success('Team member updated');
    } else {
      const { error } = await supabase.from('store_team_members').insert({
        producer_id: user.id,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        role: form.role,
        custom_role_name: form.role === 'custom' ? form.custom_role_name.trim() : null,
        permissions: form.permissions,
      });
      if (error) { toast.error('Failed: ' + error.message); return; }
      toast.success('Team member added');
    }

    setDialogOpen(false);
    const { data } = await supabase.from('store_team_members').select('*').eq('producer_id', user.id).order('added_at', { ascending: false });
    if (data) setTeam(data);
  };

  const handleToggleActive = async (memberId: string, currentActive: boolean) => {
    await supabase.from('store_team_members').update({ is_active: !currentActive }).eq('id', memberId);
    setTeam(prev => prev.map(m => m.id === memberId ? { ...m, is_active: !currentActive } : m));
    toast.success('Status updated');
  };

  const handleRemove = async (memberId: string) => {
    await supabase.from('store_team_members').delete().eq('id', memberId);
    setTeam(prev => prev.filter(m => m.id !== memberId));
    toast.success('Team member removed');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> Store Team ({team.length})</h2>
          <p className="text-sm text-muted-foreground">Manage your store's team members</p>
        </div>
        <Button onClick={openAdd}><UserPlus className="mr-1 h-4 w-4" /> Add Member</Button>
      </div>

      {team.length === 0 ? (
        <Card><CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground"><Users className="h-8 w-8" /><p>No team members yet.</p><Button variant="outline" onClick={openAdd}><UserPlus className="mr-1 h-4 w-4" /> Add Member</Button></CardContent></Card>
      ) : (
        <Card><CardContent className="p-0">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Role</TableHead><TableHead>Permissions</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
            <TableBody>
              {team.map(member => (
                <TableRow key={member.id}>
                  <TableCell className="font-medium">{member.name}</TableCell>
                  <TableCell className="text-sm">{member.email}</TableCell>
                  <TableCell><Badge variant="outline" className="gap-1"><Shield className="h-3 w-3" />{member.role === 'custom' ? member.custom_role_name : ROLE_LABELS[member.role as StoreTeamRole] || member.role}</Badge></TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                      {(member.permissions || []).slice(0, 3).map((p: StorePermission) => (
                        <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">{PERMISSION_LABELS[p]}</Badge>
                      ))}
                      {(member.permissions || []).length > 3 && <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{member.permissions.length - 3}</Badge>}
                    </div>
                  </TableCell>
                  <TableCell><Badge className={member.is_active ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}>{member.is_active ? 'Active' : 'Inactive'}</Badge></TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(member)}><Pencil className="h-3.5 w-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleActive(member.id, member.is_active)}>{member.is_active ? '⏸' : '▶'}</Button>
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemove(member.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle className="font-display">{editingId ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Full Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
              <div className="space-y-2"><Label>Role</Label>
                <Select value={form.role} onValueChange={(v: StoreTeamRole) => handleRoleChange(v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{Object.entries(ROLE_LABELS).map(([value, label]) => (<SelectItem key={value} value={value}>{label}</SelectItem>))}</SelectContent></Select>
              </div>
            </div>
            {form.role === 'custom' && <div className="space-y-2"><Label>Custom Role Name</Label><Input value={form.custom_role_name} onChange={e => setForm(f => ({ ...f, custom_role_name: e.target.value }))} /></div>}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">Permissions</Label>
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                {ALL_PERMISSIONS.map(perm => (
                  <div key={perm} className="flex items-center gap-2">
                    <Checkbox id={`perm-${perm}`} checked={form.permissions.includes(perm)} onCheckedChange={() => togglePermission(perm)} />
                    <label htmlFor={`perm-${perm}`} className="text-sm cursor-pointer">{PERMISSION_LABELS[perm]}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editingId ? 'Save Changes' : 'Add Member'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
