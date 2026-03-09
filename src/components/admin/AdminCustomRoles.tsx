import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { Shield, ShieldPlus, Edit, Trash2, Save, X } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

const AVAILABLE_PERMISSIONS = [
  { id: 'manage_users', label: 'Manage Users', description: 'Create, edit, and delete user accounts' },
  { id: 'manage_products', label: 'Manage Products', description: 'Create, edit, and delete products' },
  { id: 'manage_orders', label: 'Manage Orders', description: 'View and modify orders' },
  { id: 'manage_support', label: 'Manage Support', description: 'Handle support tickets and assignments' },
  { id: 'manage_discounts', label: 'Manage Discounts', description: 'Create and manage discount codes' },
  { id: 'manage_inventory', label: 'Manage Inventory', description: 'Update stock levels and inventory' },
  { id: 'view_analytics', label: 'View Analytics', description: 'Access analytics and reports' },
  { id: 'manage_payments', label: 'Manage Payments', description: 'Process payments and refunds' },
  { id: 'manage_shipping', label: 'Manage Shipping', description: 'Handle shipping and tracking' },
  { id: 'moderate_content', label: 'Moderate Content', description: 'Review and moderate user content' },
];

const createRoleSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission is required'),
});

type CreateRoleForm = z.infer<typeof createRoleSchema>;

interface CustomRole {
  id: string;
  name: string;
  description?: string;
  permissions: string[];
  created_at: string;
  created_by: string;
}

export default function AdminCustomRoles() {
  const { user } = useAuth();
  const [roles, setRoles] = useState<CustomRole[]>([]);
  const [editingRole, setEditingRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const form = useForm<CreateRoleForm>({
    resolver: zodResolver(createRoleSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
    },
  });

  const editForm = useForm<CreateRoleForm>({
    resolver: zodResolver(createRoleSchema),
  });

  const loadRoles = async () => {
    const { data } = await supabase
      .from('custom_roles')
      .select('*')
      .order('name');

    if (data) {
      setRoles(data.map(role => ({
        ...role,
        permissions: Array.isArray(role.permissions) 
          ? role.permissions.filter((p): p is string => typeof p === 'string')
          : [],
      })));
    }
  };

  const createRole = async (data: CreateRoleForm) => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from('custom_roles').insert({
        name: data.name,
        description: data.description || null,
        permissions: data.permissions,
        created_by: user.id,
      });

      if (error) {
        console.error('Error creating role:', error);
        toast.error('Failed to create role');
        return;
      }

      toast.success('Custom role created successfully');
      form.reset();
      loadRoles();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to create role');
    } finally {
      setLoading(false);
    }
  };

  const updateRole = async (roleId: string, data: CreateRoleForm) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('custom_roles')
        .update({
          name: data.name,
          description: data.description || null,
          permissions: data.permissions,
        })
        .eq('id', roleId);

      if (error) {
        console.error('Error updating role:', error);
        toast.error('Failed to update role');
        return;
      }

      toast.success('Role updated successfully');
      setEditingRole(null);
      loadRoles();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const deleteRole = async (roleId: string) => {
    const { error } = await supabase
      .from('custom_roles')
      .delete()
      .eq('id', roleId);

    if (error) {
      console.error('Error deleting role:', error);
      toast.error('Failed to delete role');
      return;
    }

    toast.success('Role deleted successfully');
    loadRoles();
  };

  const startEditing = (role: CustomRole) => {
    setEditingRole(role.id);
    editForm.reset({
      name: role.name,
      description: role.description || '',
      permissions: role.permissions,
    });
  };

  const cancelEditing = () => {
    setEditingRole(null);
    editForm.reset();
  };

  useEffect(() => {
    loadRoles();
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldPlus className="h-5 w-5" />
            Create Custom Role
          </CardTitle>
          <CardDescription>
            Define custom roles with specific permissions for users in your system.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(createRole)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Role Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="e.g., Store Manager" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea {...field} placeholder="Describe this role..." rows={1} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="permissions"
                render={() => (
                  <FormItem>
                    <FormLabel>Permissions</FormLabel>
                    <FormDescription>
                      Select the permissions this role should have.
                    </FormDescription>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                      {AVAILABLE_PERMISSIONS.map((permission) => (
                        <FormField
                          key={permission.id}
                          control={form.control}
                          name="permissions"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 border rounded-lg p-3">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(permission.id)}
                                  onCheckedChange={(checked) => {
                                    const currentPermissions = field.value || [];
                                    if (checked) {
                                      field.onChange([...currentPermissions, permission.id]);
                                    } else {
                                      field.onChange(
                                        currentPermissions.filter((p) => p !== permission.id)
                                      );
                                    }
                                  }}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel className="font-medium">
                                  {permission.label}
                                </FormLabel>
                                <FormDescription className="text-xs">
                                  {permission.description}
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Role'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Existing Custom Roles
          </CardTitle>
          <CardDescription>
            Manage your custom roles and their permissions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No custom roles created yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {roles.map((role) => (
                <div key={role.id} className="border rounded-lg p-4">
                  {editingRole === role.id ? (
                    <Form {...editForm}>
                      <form 
                        onSubmit={editForm.handleSubmit((data) => updateRole(role.id, data))}
                        className="space-y-4"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={editForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={editForm.control}
                            name="description"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea {...field} rows={1} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={editForm.control}
                          name="permissions"
                          render={() => (
                            <FormItem>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {AVAILABLE_PERMISSIONS.map((permission) => (
                                  <FormField
                                    key={permission.id}
                                    control={editForm.control}
                                    name="permissions"
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                                        <FormControl>
                                          <Checkbox
                                            checked={field.value?.includes(permission.id)}
                                            onCheckedChange={(checked) => {
                                              const currentPermissions = field.value || [];
                                              if (checked) {
                                                field.onChange([...currentPermissions, permission.id]);
                                              } else {
                                                field.onChange(
                                                  currentPermissions.filter((p) => p !== permission.id)
                                                );
                                              }
                                            }}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-sm font-normal">
                                          {permission.label}
                                        </FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="flex gap-2">
                          <Button type="submit" size="sm" disabled={loading}>
                            <Save className="h-4 w-4 mr-1" />
                            Save
                          </Button>
                          <Button type="button" variant="outline" size="sm" onClick={cancelEditing}>
                            <X className="h-4 w-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </Form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-medium">{role.name}</h3>
                          {role.description && (
                            <p className="text-sm text-muted-foreground">{role.description}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => startEditing(role)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Custom Role</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{role.name}"? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteRole(role.id)}>
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {role.permissions.map((permissionId) => {
                          const permission = AVAILABLE_PERMISSIONS.find(p => p.id === permissionId);
                          return permission ? (
                            <Badge key={permissionId} variant="secondary">
                              {permission.label}
                            </Badge>
                          ) : null;
                        })}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Created: {new Date(role.created_at).toLocaleDateString()}
                      </p>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}