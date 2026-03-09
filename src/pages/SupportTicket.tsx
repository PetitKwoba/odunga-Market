import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Ticket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

interface Message {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  attachments: string[];
  is_internal: boolean;
  created_at: string;
}

interface SenderProfile {
  user_id: string;
  name: string;
  business_name: string | null;
}

export default function SupportTicket() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const scrollRef = useRef<HTMLDivElement>(null);

  const [ticket, setTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id && user) {
      fetchTicket();
      fetchMessages();
      subscribeToMessages();
    }
  }, [id, user]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const fetchTicket = async () => {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching ticket:', error);
      toast.error('Failed to load ticket');
      navigate('/support');
    } else {
      setTicket(data);
    }
    setLoading(false);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
      // Fetch sender names
      const senderIds = [...new Set(data?.map((m) => m.sender_id) || [])];
      if (senderIds.length > 0) {
        fetchSenderNames(senderIds);
      }
    }
  };

  const fetchSenderNames = async (senderIds: string[]) => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, business_name')
      .in('user_id', senderIds);

    if (profiles) {
      const names: Record<string, string> = {};
      profiles.forEach((p: SenderProfile) => {
        names[p.user_id] = p.business_name || p.name;
      });
      setSenderNames(names);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`ticket-${id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'support_messages',
          filter: `ticket_id=eq.${id}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages((prev) => {
            if (prev.find((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Fetch name if unknown
          if (!senderNames[newMsg.sender_id]) {
            fetchSenderNames([newMsg.sender_id]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    setSending(true);
    const { error } = await supabase.from('support_messages').insert({
      ticket_id: id,
      sender_id: user.id,
      message: newMessage.trim(),
      is_internal: false,
    });

    if (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } else {
      setNewMessage('');
    }
    setSending(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open':
        return <Clock className="h-4 w-4" />;
      case 'in_progress':
        return <AlertCircle className="h-4 w-4" />;
      case 'resolved':
      case 'closed':
        return <CheckCircle2 className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/10 text-blue-700';
      case 'in_progress':
        return 'bg-yellow-500/10 text-yellow-700';
      case 'resolved':
        return 'bg-green-500/10 text-green-700';
      case 'closed':
        return 'bg-gray-500/10 text-gray-700';
      default:
        return 'bg-gray-500/10 text-gray-700';
    }
  };

  if (loading || !ticket) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading ticket...</p>
      </div>
    );
  }

  const isClosed = ['resolved', 'closed'].includes(ticket.status);

  return (
    <div className="container py-8">
      <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate('/support')}>
        <ArrowLeft className="h-4 w-4" />
        Back to Support
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card className="flex h-[600px] flex-col">
            <CardHeader className="border-b py-4">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{ticket.subject}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col p-0 overflow-hidden">
              <ScrollArea className="flex-1 p-4" ref={scrollRef}>
                {messages.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
                    <p className="text-sm">No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {messages.map((msg) => {
                      const isMe = msg.sender_id === user?.id;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className={`max-w-[80%] rounded-lg px-4 py-2 ${
                              isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'
                            }`}
                          >
                            {!isMe && (
                              <p className="mb-1 text-xs font-semibold opacity-80">
                                {senderNames[msg.sender_id] || 'Support'}
                              </p>
                            )}
                            <p className="whitespace-pre-wrap break-words text-sm">{msg.message}</p>
                            <p className="mt-1 text-[10px] opacity-60">
                              {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {isClosed ? (
                <div className="border-t p-3 text-center text-sm text-muted-foreground">
                  This ticket is {ticket.status}. The conversation is closed.
                </div>
              ) : (
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                      disabled={sending}
                      maxLength={2000}
                      rows={2}
                    />
                    <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Ticket Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Status</p>
                <Badge className={getStatusColor(ticket.status)} variant="secondary">
                  {getStatusIcon(ticket.status)}
                  <span className="ml-1 capitalize">{ticket.status.replace('_', ' ')}</span>
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Priority</p>
                <Badge variant="outline" className="capitalize">
                  {ticket.priority}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Category</p>
                <Badge variant="outline" className="capitalize">
                  {ticket.category.replace('_', ' ')}
                </Badge>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm">{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
