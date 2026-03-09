import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type AppRole = Database['public']['Enums']['app_role'];

const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  role: z.enum(['producer', 'wholesaler', 'referrer', 'admin', 'support'] as const),
  business_name: z.string().optional(),
  country: z.string().min(2, 'Country is required'),
  phone: z.string().optional(),
  is_approved: z.boolean(),
  support_assignment: z.string().optional(), // For support agents, which wholesaler they work for
  custom_role_id: z.string().optional(),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

interface AdminCreateUserProps {
  onUserCreated: () => void;
}

export default function AdminCreateUser({ onUserCreated }: AdminCreateUserProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [wholesalers, setWholesalers] = useState<Array<{ user_id: string; name: string; business_name?: string }>>([]);
  const [customRoles, setCustomRoles] = useState<Array<{ id: string; name: string }>>([]);

  const form = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      email: '',
      password: '',
      name: '',
      role: 'wholesaler',
      business_name: '',
      country: '',
      phone: '',
      is_approved: false,
    },
  });

  const watchedRole = form.watch('role');

  const loadWholesalers = async () => {
    const { data } = await supabase
      .from('user_roles')
      .select('user_id, profiles!inner(name, business_name)')
      .eq('role', 'wholesaler');
    
    if (data) {
      setWholesalers(data.map(item => ({
        user_id: item.user_id,
        name: (item.profiles as any).name,
        business_name: (item.profiles as any).business_name,
      })));
    }
  };

  const loadCustomRoles = async () => {
    const { data } = await supabase
      .from('custom_roles')
      .select('id, name')
      .order('name');
    
    if (data) {
      setCustomRoles(data);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      loadWholesalers();
      loadCustomRoles();
    }
  };

  const onSubmit = async (data: CreateUserForm) => {
    setLoading(true);
    try {
      // Call the admin edge function to create user
      const { data: result, error } = await supabase.functions.invoke('admin-create-user', {
        body: {
          email: data.email,
          password: data.password,
          user_metadata: {
            name: data.name,
            role: data.role,
            business_name: data.business_name,
            country: data.country,
            phone: data.phone,
            is_approved: data.is_approved,
            support_assignment: data.support_assignment, // For support agents
            custom_role_id: data.custom_role_id,
          },
        },
      });

      if (error) {
        console.error('Error creating user:', error);
        toast.error('Failed to create user: ' + error.message);
        return;
      }

      if (result?.error) {
        toast.error('Failed to create user: ' + result.error);
        return;
      }

      // If creating support agent with assignment, create the assignment
      if (data.role === 'support' && data.support_assignment) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser && result?.user) {
          await supabase.from('support_assignments').insert({
            support_agent_id: result.user.id,
            assigned_user_id: data.support_assignment,
            created_by: currentUser.id,
            notes: `Support agent assigned to ${wholesalers.find(w => w.user_id === data.support_assignment)?.name || 'user'}`,
          });
        }
      }

      toast.success('User created successfully');
      form.reset();
      setOpen(false);
      onUserCreated();
    } catch (error: any) {
      console.error('Error:', error);
      toast.error('Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Create User
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
          <DialogDescription>
            Create a new user account with the specified role and permissions.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" placeholder="user@example.com" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <Input {...field} type="password" placeholder="Minimum 8 characters" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="John Doe" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="producer">Producer</SelectItem>
                        <SelectItem value="wholesaler">Wholesaler</SelectItem>
                        <SelectItem value="referrer">Referrer</SelectItem>
                        <SelectItem value="support">Customer Support</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="business_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Optional business name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Country</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="United States" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="+1 (555) 123-4567" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchedRole === 'support' && (
                <FormField
                  control={form.control}
                  name="support_assignment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assign to Wholesaler</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select wholesaler to support" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {wholesalers.map((wholesaler) => (
                            <SelectItem key={wholesaler.user_id} value={wholesaler.user_id}>
                              {wholesaler.name} {wholesaler.business_name && `(${wholesaler.business_name})`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Assign this support agent to help a specific wholesaler
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {customRoles.length > 0 && (
                <FormField
                  control={form.control}
                  name="custom_role_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Custom Role (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select custom role" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customRoles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Assign additional custom role permissions
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <FormField
              control={form.control}
              name="is_approved"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Pre-approve User</FormLabel>
                    <FormDescription>
                      Automatically approve this user account upon creation
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create User'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}