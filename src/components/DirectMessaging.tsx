import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, Search, ArrowLeft, Check, CheckCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  participant_1: string;
  participant_2: string;
  last_message_at: string | null;
  other_name?: string;
  other_business?: string;
  last_message?: string;
  unread_count?: number;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function DirectMessaging() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConvo, setSelectedConvo] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [newContactSearch, setNewContactSearch] = useState('');
  const [contacts, setContacts] = useState<any[]>([]);
  const [showNewChat, setShowNewChat] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    fetchConversations();

    const channel = supabase
      .channel('dm-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, (payload) => {
        const msg = payload.new as Message;
        if (selectedConvo && msg.conversation_id === selectedConvo.id) {
          setMessages(prev => [...prev, msg]);
          if (msg.sender_id !== user.id) {
            supabase.from('direct_messages').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', msg.id);
          }
        }
        fetchConversations();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, selectedConvo?.id]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchConversations = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${user.id},participant_2.eq.${user.id}`)
      .order('last_message_at', { ascending: false });

    if (!data) return;

    const enriched = await Promise.all(data.map(async (c) => {
      const otherId = c.participant_1 === user.id ? c.participant_2 : c.participant_1;
      const { data: profile } = await supabase.from('profiles').select('name, business_name').eq('user_id', otherId).single();
      const { data: lastMsg } = await supabase.from('direct_messages').select('message').eq('conversation_id', c.id).order('created_at', { ascending: false }).limit(1).single();
      const { count } = await supabase.from('direct_messages').select('*', { count: 'exact', head: true }).eq('conversation_id', c.id).eq('is_read', false).neq('sender_id', user.id);
      return {
        ...c,
        other_name: profile?.name || 'Unknown',
        other_business: profile?.business_name || '',
        last_message: lastMsg?.message || '',
        unread_count: count || 0,
      };
    }));

    setConversations(enriched);
  };

  const openConversation = async (convo: Conversation) => {
    setSelectedConvo(convo);
    setShowNewChat(false);
    const { data } = await supabase
      .from('direct_messages')
      .select('*')
      .eq('conversation_id', convo.id)
      .order('created_at', { ascending: true });
    if (data) setMessages(data);

    // Mark unread as read
    await supabase
      .from('direct_messages')
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq('conversation_id', convo.id)
      .neq('sender_id', user!.id)
      .eq('is_read', false);
    fetchConversations();
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConvo || !user) return;
    const msg = newMessage.trim();
    setNewMessage('');
    await supabase.from('direct_messages').insert({
      conversation_id: selectedConvo.id,
      sender_id: user.id,
      message: msg,
    });
    await supabase.from('conversations').update({ last_message_at: new Date().toISOString() }).eq('id', selectedConvo.id);
  };

  const searchContacts = async (query: string) => {
    setNewContactSearch(query);
    if (query.length < 2) { setContacts([]); return; }
    const { data } = await supabase
      .from('profiles')
      .select('user_id, name, business_name')
      .neq('user_id', user!.id)
      .ilike('name', `%${query}%`)
      .limit(10);
    if (data) setContacts(data);
  };

  const startConversation = async (otherId: string) => {
    if (!user) return;
    // Check existing
    const existing = conversations.find(c =>
      (c.participant_1 === user.id && c.participant_2 === otherId) ||
      (c.participant_2 === user.id && c.participant_1 === otherId)
    );
    if (existing) { openConversation(existing); return; }

    const { data, error } = await supabase.from('conversations').insert({
      participant_1: user.id,
      participant_2: otherId,
    }).select().single();
    if (data && !error) {
      await fetchConversations();
      const { data: profile } = await supabase.from('profiles').select('name, business_name').eq('user_id', otherId).single();
      openConversation({ ...data, other_name: profile?.name, other_business: profile?.business_name, unread_count: 0 });
    }
  };

  const formatTime = (date: string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    if (diffMs < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffMs < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const filtered = conversations.filter(c =>
    !searchQuery || c.other_name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.other_business?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user) return null;

  return (
    <div className="grid h-[600px] gap-0 overflow-hidden rounded-lg border md:grid-cols-[300px_1fr]">
      {/* Sidebar */}
      <div className={cn("flex flex-col border-r bg-muted/30", selectedConvo && "hidden md:flex")}>
        <div className="border-b p-3 space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Messages</h3>
            <Button variant="ghost" size="sm" onClick={() => setShowNewChat(!showNewChat)}>
              <MessageCircle className="h-4 w-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input placeholder="Search..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} className="pl-8 h-8 text-sm" />
          </div>
        </div>

        {showNewChat && (
          <div className="border-b p-3 space-y-2 bg-background">
            <Input placeholder="Find user by name..." value={newContactSearch} onChange={e => searchContacts(e.target.value)} className="h-8 text-sm" />
            {contacts.map(c => (
              <button key={c.user_id} className="flex w-full items-center gap-2 rounded p-2 text-left text-sm hover:bg-muted" onClick={() => startConversation(c.user_id)}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {c.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-medium text-sm">{c.name}</p>
                  {c.business_name && <p className="text-xs text-muted-foreground">{c.business_name}</p>}
                </div>
              </button>
            ))}
          </div>
        )}

        <ScrollArea className="flex-1">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <MessageCircle className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">No conversations yet</p>
            </div>
          ) : (
            filtered.map(c => (
              <button
                key={c.id}
                className={cn("flex w-full items-center gap-3 border-b p-3 text-left hover:bg-muted/50 transition-colors", selectedConvo?.id === c.id && "bg-muted")}
                onClick={() => openConversation(c)}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {c.other_name?.charAt(0)?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-sm truncate">{c.other_name}</p>
                    <span className="text-[10px] text-muted-foreground">{c.last_message_at && formatTime(c.last_message_at)}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-xs text-muted-foreground truncate">{c.last_message || 'No messages yet'}</p>
                    {(c.unread_count ?? 0) > 0 && <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">{c.unread_count}</Badge>}
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className={cn("flex flex-col", !selectedConvo && "hidden md:flex")}>
        {selectedConvo ? (
          <>
            <div className="flex items-center gap-3 border-b p-3">
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSelectedConvo(null)}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {selectedConvo.other_name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{selectedConvo.other_name}</p>
                {selectedConvo.other_business && <p className="text-xs text-muted-foreground">{selectedConvo.other_business}</p>}
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-3">
                {messages.map(msg => (
                  <div key={msg.id} className={cn("flex", msg.sender_id === user.id ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[75%] rounded-2xl px-4 py-2 text-sm", msg.sender_id === user.id ? "bg-primary text-primary-foreground rounded-br-md" : "bg-muted rounded-bl-md")}>
                      <p>{msg.message}</p>
                      <div className={cn("flex items-center gap-1 mt-1", msg.sender_id === user.id ? "justify-end" : "")}>
                        <span className="text-[10px] opacity-70">{formatTime(msg.created_at)}</span>
                        {msg.sender_id === user.id && (msg.is_read ? <CheckCheck className="h-3 w-3 opacity-70" /> : <Check className="h-3 w-3 opacity-50" />)}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>

            <div className="border-t p-3">
              <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                <Input value={newMessage} onChange={e => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1" />
                <Button type="submit" size="icon" disabled={!newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="mx-auto h-12 w-12 opacity-30 mb-3" />
              <p className="font-medium">Select a conversation</p>
              <p className="text-sm">or start a new one</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
