import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { scanMessage } from '@/lib/anti-circumvention';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, AlertTriangle, Shield, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  order_id: string;
  sender_id: string;
  message: string;
  is_flagged: boolean;
  flag_reason: string | null;
  created_at: string;
}

interface OrderChatProps {
  orderId: string;
  orderStatus: string;
}

export default function OrderChat({ orderId, orderStatus }: OrderChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [senderNames, setSenderNames] = useState<Record<string, string>>({});
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orderId) return;

    // Fetch existing messages
    supabase
      .from('order_messages')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data) {
          setMessages(data as Message[]);
          // Fetch sender names
          const senderIds = [...new Set(data.map(m => m.sender_id))];
          if (senderIds.length > 0) {
            supabase
              .from('profiles')
              .select('user_id, name, business_name')
              .in('user_id', senderIds)
              .then(({ data: profiles }) => {
                if (profiles) {
                  const names: Record<string, string> = {};
                  profiles.forEach(p => {
                    names[p.user_id] = p.business_name || p.name;
                  });
                  setSenderNames(names);
                }
              });
          }
        }
      });

    // Subscribe to realtime
    const channel = supabase
      .channel(`order-chat-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'order_messages',
          filter: `order_id=eq.${orderId}`,
        },
        (payload) => {
          const newMsg = payload.new as Message;
          setMessages(prev => {
            if (prev.find(m => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });
          // Fetch name if unknown
          if (!senderNames[newMsg.sender_id]) {
            supabase
              .from('profiles')
              .select('user_id, name, business_name')
              .eq('user_id', newMsg.sender_id)
              .single()
              .then(({ data: profile }) => {
                if (profile) {
                  setSenderNames(prev => ({
                    ...prev,
                    [profile.user_id]: profile.business_name || profile.name,
                  }));
                }
              });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!newMessage.trim() || !user) return;

    const scan = scanMessage(newMessage);

    if (scan.isFlagged) {
      toast.warning(
        'Your message contains contact information or off-platform language. This has been flagged for review.',
        { duration: 5000 }
      );
    }

    setSending(true);
    const { error } = await supabase.from('order_messages').insert({
      order_id: orderId,
      sender_id: user.id,
      message: scan.isFlagged ? scan.sanitizedMessage : newMessage.trim(),
      is_flagged: scan.isFlagged,
      flag_reason: scan.isFlagged ? scan.reasons.join(', ') : null,
    });

    if (error) {
      toast.error('Failed to send message');
    } else {
      setNewMessage('');
    }
    setSending(false);
  };

  const isClosed = ['Completed', 'Cancelled'].includes(orderStatus);

  return (
    <Card className="flex flex-col h-[400px]">
      <CardHeader className="py-3 px-4 border-b flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <MessageCircle className="h-4 w-4" />
          Order Chat
        </CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs gap-1">
            <Shield className="h-3 w-3" /> Monitored
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        <ScrollArea className="flex-1 p-4" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
              <MessageCircle className="h-8 w-8 mb-2 text-muted-foreground/40" />
              <p>No messages yet. Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map(msg => {
                const isMe = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                      isMe
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}>
                      {!isMe && (
                        <p className="text-xs font-semibold mb-0.5 opacity-80">
                          {senderNames[msg.sender_id] || 'User'}
                        </p>
                      )}
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-[10px] opacity-60">
                          {new Date(msg.created_at).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.is_flagged && (
                          <AlertTriangle className="h-3 w-3 text-yellow-400" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {isClosed ? (
          <div className="p-3 border-t text-center text-xs text-muted-foreground">
            This order is {orderStatus.toLowerCase()}. Chat is closed.
          </div>
        ) : (
          <div className="p-3 border-t flex gap-2">
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
              disabled={sending}
              maxLength={1000}
            />
            <Button size="icon" onClick={handleSend} disabled={sending || !newMessage.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
