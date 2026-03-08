import { useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { StoreTeamMember, StoreTeamRole, StorePermission, ROLE_PERMISSIONS, PERMISSION_LABELS, User, defaultProfile } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Plus, Pencil, Trash2, UserPlus, Shield, Users } from 'lucide-react';
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

function getAllUsers(): User[] {
  const stored = localStorage.getItem('waholo_all_users');
  if (stored) try {
    return (JSON.parse(stored) as User[]).map(u => ({
      ...u,
      documents: u.documents || [],
      document_requests: u.document_requests || [],
      profile: u.profile ? { ...defaultProfile, ...u.profile } : { ...defaultProfile },
      store_team: u.store_team || [],
    }));
  } catch { /* */ }
  return [];
}

function saveAllUsers(users: User[]) {
  localStorage.setItem('waholo_all_users', JSON.stringify(users));
}

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
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MemberForm>({ ...emptyForm });
  const [, setRefresh] = useState(0);

  if (!user) return null;

  const allUsers = getAllUsers();
  const currentUser = allUsers.find(u => u.id === user.id);
  const team: StoreTeamMember[] = currentUser?.store_team || [];

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
      permissions: f.permissions.includes(perm)
        ? f.permissions.filter(p => p !== perm)
        : [...f.permissions, perm],
    }));
  };

  const openAdd = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setDialogOpen(true);
  };

  const openEdit = (member: StoreTeamMember) => {
    setEditingId(member.id);
    setForm({
      name: member.name,
      email: member.email,
      phone: member.phone,
      role: member.role,
      custom_role_name: member.custom_role_name || '',
      permissions: [...member.permissions],
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }
    if (form.role === 'custom' && !form.custom_role_name.trim()) {
      toast.error('Please enter a custom role name');
      return;
    }

    const users = getAllUsers();
    const updated = users.map(u => {
      if (u.id !== user.id) return u;

      let newTeam: StoreTeamMember[];
      if (editingId) {
        newTeam = u.store_team.map(m => m.id === editingId ? {
          ...m,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          role: form.role,
          custom_role_name: form.role === 'custom' ? form.custom_role_name.trim() : undefined,
          permissions: form.permissions,
        } : m);
      } else {
        newTeam = [
          ...u.store_team,
          {
            id: 'tm' + Date.now(),
            name: form.name.trim(),
            email: form.email.trim(),
            phone: form.phone.trim(),
            role: form.role,
            custom_role_name: form.role === 'custom' ? form.custom_role_name.trim() : undefined,
            permissions: form.permissions,
            is_active: true,
            added_at: new Date().toISOString(),
          },
        ];
      }
      return { ...u, store_team: newTeam };
    });

    saveAllUsers(updated);
    setDialogOpen(false);
    setRefresh(r => r + 1);
    toast.success(editingId ? 'Team member updated' : 'Team member added');
  };

  const handleToggleActive = (memberId: string) => {
    const users = getAllUsers();
    const updated = users.map(u => {
      if (u.id !== user.id) return u;
      return { ...u, store_team: u.store_team.map(m => m.id === memberId ? { ...m, is_active: !m.is_active } : m) };
    });
    saveAllUsers(updated);
    setRefresh(r => r + 1);
    toast.success('Member status updated');
  };

  const handleRemove = (memberId: string) => {
    const users = getAllUsers();
    const updated = users.map(u => {
      if (u.id !== user.id) return u;
      return { ...u, store_team: u.store_team.filter(m => m.id !== memberId) };
    });
    saveAllUsers(updated);
    setRefresh(r => r + 1);
    toast.success('Team member removed');
  };

  // Re-read after changes
  const freshUsers = getAllUsers();
  const freshUser = freshUsers.find(u => u.id === user.id);
  const freshTeam: StoreTeamMember[] = freshUser?.store_team || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" /> Store Team ({freshTeam.length})
          </h2>
          <p className="text-sm text-muted-foreground">Manage your store's team members and their permissions</p>
        </div>
        <Button onClick={openAdd}><UserPlus className="mr-1 h-4 w-4" /> Add Member</Button>
      </div>

      {freshTeam.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Users className="h-8 w-8" />
            <p>No team members yet. Add your first team member!</p>
            <Button variant="outline" onClick={openAdd}><UserPlus className="mr-1 h-4 w-4" /> Add Member</Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {freshTeam.map(member => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.name}</TableCell>
                    <TableCell className="text-sm">{member.email}</TableCell>
                    <TableCell className="text-sm">{member.phone || '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="gap-1">
                        <Shield className="h-3 w-3" />
                        {member.role === 'custom' ? member.custom_role_name : ROLE_LABELS[member.role]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {member.permissions.slice(0, 3).map(p => (
                          <Badge key={p} variant="secondary" className="text-[10px] px-1.5 py-0">{PERMISSION_LABELS[p]}</Badge>
                        ))}
                        {member.permissions.length > 3 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">+{member.permissions.length - 3}</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={member.is_active ? 'bg-success text-success-foreground' : 'bg-muted text-muted-foreground'}
                        variant={member.is_active ? 'default' : 'outline'}
                      >
                        {member.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => openEdit(member)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleToggleActive(member.id)} title={member.is_active ? 'Deactivate' : 'Activate'}>
                          {member.is_active ? '⏸' : '▶'}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => handleRemove(member.id)} title="Remove">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">{editingId ? 'Edit Team Member' : 'Add Team Member'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input placeholder="John Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="john@store.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input placeholder="+1234567890" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={form.role} onValueChange={(v: StoreTeamRole) => handleRoleChange(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.role === 'custom' && (
              <div className="space-y-2">
                <Label>Custom Role Name</Label>
                <Input placeholder="e.g. Warehouse Supervisor" value={form.custom_role_name} onChange={e => setForm(f => ({ ...f, custom_role_name: e.target.value }))} />
              </div>
            )}

            <div className="space-y-2">
              <Label className="text-sm font-semibold">Permissions</Label>
              <p className="text-xs text-muted-foreground">
                {form.role !== 'custom' ? 'Pre-filled based on role. Customize as needed.' : 'Select permissions for this custom role.'}
              </p>
              <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                {ALL_PERMISSIONS.map(perm => (
                  <div key={perm} className="flex items-center gap-2">
                    <Checkbox
                      id={`perm-${perm}`}
                      checked={form.permissions.includes(perm)}
                      onCheckedChange={() => togglePermission(perm)}
                    />
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
