import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import { MessageCircle, Search, ArrowRight } from 'lucide-react';

interface User {
  user_id: string;
  name: string;
  business_name?: string;
  email: string;
  role?: string;
  is_approved?: boolean;
}

interface AdminStartConversationProps {
  onConversationStarted?: () => void;
}

export default function AdminStartConversation({ onConversationStarted }: AdminStartConversationProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);

  const searchUsers = async (query: string) => {
    if (!query || query.length < 2) {
      setUsers([]);
      return;
    }

    setLoading(true);
    try {
      // Search users by name, email, or business name
      const { data: profiles } = await supabase
        .from('profiles')
        .select(`
          user_id,
          name,
          business_name,
          email,
          user_roles!inner(role)
        `)
        .neq('user_id', user?.id) // Exclude current user
        .or(`name.ilike.%${query}%,email.ilike.%${query}%,business_name.ilike.%${query}%`)
        .limit(20);

      if (profiles) {
        const formattedUsers = profiles.map(profile => ({
          user_id: profile.user_id,
          name: profile.name,
          business_name: profile.business_name || undefined,
          email: profile.email,
          role: (profile.user_roles as any)?.role || 'unknown',
        }));
        setUsers(formattedUsers);
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (targetUser: User) => {
    if (!user) return;

    setCreating(true);
    try {
      // Check if conversation already exists
      const { data: existingConversation } = await supabase
        .from('conversations')
        .select('id')
        .or(`and(participant_1.eq.${user.id},participant_2.eq.${targetUser.user_id}),and(participant_1.eq.${targetUser.user_id},participant_2.eq.${user.id})`)
        .single();

      if (existingConversation) {
        toast.success(`Conversation with ${targetUser.name} already exists`);
        setOpen(false);
        onConversationStarted?.();
        return;
      }

      // Create new conversation
      const { data: newConversation, error } = await supabase
        .from('conversations')
        .insert({
          participant_1: user.id,
          participant_2: targetUser.user_id,
          last_message_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating conversation:', error);
        toast.error('Failed to start conversation');
        return;
      }

      // Send initial message
      await supabase.from('direct_messages').insert({
        conversation_id: newConversation.id,
        sender_id: user.id,
        message: `Hello ${targetUser.name}, I'm reaching out to assist you. How can I help?`,
      });

      toast.success(`Conversation started with ${targetUser.name}`);
      setOpen(false);
      setSearchQuery('');
      setUsers([]);
      onConversationStarted?.();
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to start conversation');
    } finally {
      setCreating(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 hover:bg-red-100';
      case 'producer': return 'bg-green-100 text-green-800 hover:bg-green-100';
      case 'wholesaler': return 'bg-blue-100 text-blue-800 hover:bg-blue-100';
      case 'referrer': return 'bg-purple-100 text-purple-800 hover:bg-purple-100';
      case 'support': return 'bg-orange-100 text-orange-800 hover:bg-orange-100';
      default: return 'bg-gray-100 text-gray-800 hover:bg-gray-100';
    }
  };

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchQuery]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <MessageCircle className="h-4 w-4 mr-2" />
          Start Conversation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Start Conversation with User</DialogTitle>
          <DialogDescription>
            Search for users in the system and start a direct conversation with them.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name, email, or business name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {loading && (
            <div className="text-center text-muted-foreground py-4">
              Searching users...
            </div>
          )}

          {!loading && searchQuery && users.length === 0 && searchQuery.length >= 2 && (
            <div className="text-center text-muted-foreground py-4">
              No users found matching "{searchQuery}"
            </div>
          )}

          {users.length > 0 && (
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {users.map((targetUser) => (
                  <div
                    key={targetUser.user_id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium truncate">{targetUser.name}</h4>
                        <Badge className={getRoleBadgeColor(targetUser.role || 'unknown')}>
                          {targetUser.role}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">
                        {targetUser.email}
                      </p>
                      {targetUser.business_name && (
                        <p className="text-xs text-muted-foreground truncate">
                          {targetUser.business_name}
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      onClick={() => startConversation(targetUser)}
                      disabled={creating}
                      className="shrink-0"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}

          {!searchQuery && (
            <div className="text-center text-muted-foreground py-8">
              <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Start typing to search for users</p>
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}