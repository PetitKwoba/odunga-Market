import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Users, UserPlus, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

interface SupportAgent {
  user_id: string;
  name: string;
  email: string;
}

interface User {
  user_id: string;
  name: string;
  business_name?: string;
  role: string;
}

interface Assignment {
  id: string;
  support_agent_id: string;
  assigned_user_id: string;
  notes?: string;
  created_at: string;
  support_agent_name: string;
  assigned_user_name: string;
  assigned_user_role: string;
  assigned_user_business?: string;
}

export default function AdminSupportAssignment() {
  const { user } = useAuth();
  const [supportAgents, setSupportAgents] = useState<SupportAgent[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAgent, setSelectedAgent] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const loadSupportAgents = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        profiles!inner(name, email)
      `)
      .eq('role', 'support');

    if (data) {
      setSupportAgents(data.map(item => ({
        user_id: item.user_id,
        name: (item.profiles as any).name,
        email: (item.profiles as any).email,
      })));
    }
  };

  const loadAssignableUsers = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select(`
        user_id,
        role,
        profiles!inner(name, business_name)
      `)
      .in('role', ['producer', 'wholesaler', 'referrer']);

    if (data) {
      setAssignableUsers(data.map(item => ({
        user_id: item.user_id,
        name: (item.profiles as any).name,
        business_name: (item.profiles as any).business_name,
        role: item.role,
      })));
    }
  };

  const loadAssignments = async () => {
    const { data } = await supabase
      .from('support_assignments')
      .select(`
        *,
        support_agent:profiles!support_assignments_support_agent_id_fkey(name),
        assigned_user:profiles!support_assignments_assigned_user_id_fkey(name, business_name),
        assigned_user_role:user_roles!support_assignments_assigned_user_id_fkey(role)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setAssignments(data.map(assignment => ({
        id: assignment.id,
        support_agent_id: assignment.support_agent_id,
        assigned_user_id: assignment.assigned_user_id,
        notes: assignment.notes || undefined,
        created_at: assignment.created_at,
        support_agent_name: (assignment.support_agent as any)?.name || 'Unknown',
        assigned_user_name: (assignment.assigned_user as any)?.name || 'Unknown',
        assigned_user_role: (assignment.assigned_user_role as any)?.role || 'unknown',
        assigned_user_business: (assignment.assigned_user as any)?.business_name,
      })));
    }
  };

  const createAssignment = async () => {
    if (!selectedAgent || !selectedUser || !user) {
      toast.error('Please select both a support agent and a user');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.from('support_assignments').insert({
        support_agent_id: selectedAgent,
        assigned_user_id: selectedUser,
        created_by: user.id,
        notes: notes.trim() || undefined,
      });

      if (error) {
        console.error('Error creating assignment:', error);
        toast.error('Failed to create assignment');
        return;
      }

      toast.success('Support assignment created successfully');
      setSelectedAgent('');
      setSelectedUser('');
      setNotes('');
      loadAssignments();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const deleteAssignment = async (assignmentId: string) => {
    const { error } = await supabase
      .from('support_assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error deleting assignment:', error);
      toast.error('Failed to delete assignment');
      return;
    }

    toast.success('Assignment deleted successfully');
    loadAssignments();
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'producer': return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'wholesaler': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'referrer': return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  useEffect(() => {
    loadSupportAgents();
    loadAssignableUsers();
    loadAssignments();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create Support Assignment
          </CardTitle>
          <CardDescription>
            Assign customer support agents to help specific producers, wholesalers, or referrers.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Support Agent</label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue placeholder="Select support agent" />
                </SelectTrigger>
                <SelectContent>
                  {supportAgents.map((agent) => (
                    <SelectItem key={agent.user_id} value={agent.user_id}>
                      {agent.name} ({agent.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Assign to User</label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user to support" />
                </SelectTrigger>
                <SelectContent>
                  {assignableUsers.map((assignableUser) => (
                    <SelectItem key={assignableUser.user_id} value={assignableUser.user_id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{assignableUser.name}</span>
                        <Badge className={`ml-2 ${getRoleBadgeColor(assignableUser.role)}`}>
                          {assignableUser.role}
                        </Badge>
                      </div>
                      {assignableUser.business_name && (
                        <div className="text-xs text-muted-foreground">
                          {assignableUser.business_name}
                        </div>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Notes (Optional)</label>
            <Textarea
              placeholder="Add any notes about this assignment..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <Button onClick={createAssignment} disabled={loading || !selectedAgent || !selectedUser}>
            {loading ? 'Creating...' : 'Create Assignment'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Current Assignments
          </CardTitle>
          <CardDescription>
            Manage existing support assignments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assignments.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No support assignments yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium">{assignment.support_agent_name}</span>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{assignment.assigned_user_name}</span>
                      <Badge className={getRoleBadgeColor(assignment.assigned_user_role)}>
                        {assignment.assigned_user_role}
                      </Badge>
                    </div>
                    {assignment.assigned_user_business && (
                      <p className="text-sm text-muted-foreground">
                        Business: {assignment.assigned_user_business}
                      </p>
                    )}
                    {assignment.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        Notes: {assignment.notes}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Created: {new Date(assignment.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Assignment</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete this support assignment? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteAssignment(assignment.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}