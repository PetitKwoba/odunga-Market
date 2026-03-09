import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ArrowLeft, Send, Clock, CheckCircle2, AlertCircle, Star } from 'lucide-react';
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
  rating: number | null;
  rating_comment: string | null;
  rated_at: string | null;
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

// ── Star rating widget ────────────────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          onClick={() => onChange(s)}
          onMouseEnter={() => setHovered(s)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            className={`h-8 w-8 transition-colors ${
              s <= (hovered || value)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-muted-foreground/30'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

const RATING_LABELS: Record<number, string> = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Okay',
  4: 'Good',
  5: 'Excellent',
};

// ── Main component ────────────────────────────────────────────────────────────

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

  // Rating state
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    if (id && user) {
      fetchTicket();
      fetchMessages();
      const unsub = subscribeToMessages();
      return unsub;
    }
  }, [id, user]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const fetchTicket = async () => {
    const { data, error } = await supabase.from('support_tickets').select('*').eq('id', id).single();
    if (error) { toast.error('Failed to load ticket'); navigate('/support'); return; }
    setTicket(data as Ticket);
    setLoading(false);
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true });
    if (error) return;
    setMessages(data || []);
    const sids = [...new Set(data?.map((m) => m.sender_id) || [])];
    if (sids.length) fetchSenderNames(sids);
  };

  const fetchSenderNames = async (sids: string[]) => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('user_id, name, business_name')
      .in('user_id', sids);
    if (profiles) {
      const names: Record<string, string> = {};
      profiles.forEach((p: SenderProfile) => { names[p.user_id] = p.business_name || p.name; });
      setSenderNames((prev) => ({ ...prev, ...names }));
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`ticket-${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'support_messages', filter: `ticket_id=eq.${id}` }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => prev.find((m) => m.id === newMsg.id) ? prev : [...prev, newMsg]);
        if (!senderNames[newMsg.sender_id]) fetchSenderNames([newMsg.sender_id]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'support_tickets', filter: `id=eq.${id}` }, (payload) => {
        setTicket(payload.new as Ticket);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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
    if (error) { toast.error('Failed to send message'); } else { setNewMessage(''); }
    setSending(false);
  };

  const handleSubmitRating = async () => {
    if (!ratingValue || !ticket) return;
    setSubmittingRating(true);
    const { error } = await supabase
      .from('support_tickets')
      .update({
        rating: ratingValue,
        rating_comment: ratingComment.trim() || null,
        rated_at: new Date().toISOString(),
      })
      .eq('id', ticket.id);
    if (error) { toast.error('Failed to submit rating'); } else {
      toast.success('Thank you for your feedback!');
      fetchTicket();
    }
    setSubmittingRating(false);
  };

  const getStatusIcon = (status: string) => {
    if (status === 'open') return <Clock className="h-4 w-4" />;
    if (status === 'in_progress') return <AlertCircle className="h-4 w-4" />;
    return <CheckCircle2 className="h-4 w-4" />;
  };

  const statusColor: Record<string, string> = {
    open: 'bg-blue-500/10 text-blue-700',
    in_progress: 'bg-yellow-500/10 text-yellow-700',
    resolved: 'bg-green-500/10 text-green-700',
    closed: 'bg-gray-500/10 text-gray-700',
  };

  if (loading || !ticket) {
    return <div className="flex min-h-[60vh] items-center justify-center"><p className="text-muted-foreground">Loading ticket…</p></div>;
  }

  const isClosed = ['resolved', 'closed'].includes(ticket.status);
  const isOwner = ticket.user_id === user?.id;
  const canRate = isClosed && isOwner && !ticket.rating;

  return (
    <div className="container py-8">
      <Button variant="ghost" className="mb-6 gap-2" onClick={() => navigate('/support')}>
        <ArrowLeft className="h-4 w-4" /> Back to Support
      </Button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chat panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="flex h-[560px] flex-col">
            <CardHeader className="border-b py-4">
              <CardTitle className="text-xl">{ticket.subject}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">{ticket.description}</p>
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
                          <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${isMe ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
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
                  This ticket is <span className="font-medium capitalize">{ticket.status}</span>. The conversation is closed.
                </div>
              ) : (
                <div className="border-t p-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Type your message…"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
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

          {/* Rating card — shown to ticket owner when resolved/closed and not yet rated */}
          {canRate && (
            <Card className="border-yellow-200 bg-yellow-50/40">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  How was your support experience?
                </CardTitle>
                <p className="text-sm text-muted-foreground">Your ticket has been resolved. Let us know how we did!</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <StarPicker value={ratingValue} onChange={setRatingValue} />
                  {ratingValue > 0 && (
                    <span className="text-sm font-medium text-muted-foreground">{RATING_LABELS[ratingValue]}</span>
                  )}
                </div>
                <Textarea
                  placeholder="Optional: share any additional feedback…"
                  value={ratingComment}
                  onChange={(e) => setRatingComment(e.target.value)}
                  maxLength={500}
                  rows={2}
                />
                <Button
                  onClick={handleSubmitRating}
                  disabled={!ratingValue || submittingRating}
                  className="gap-2"
                >
                  <Star className="h-4 w-4" />
                  {submittingRating ? 'Submitting…' : 'Submit Rating'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Show existing rating */}
          {isClosed && ticket.rating && (
            <Card className="border-yellow-200 bg-yellow-50/30">
              <CardContent className="flex items-center gap-4 py-4">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Your Rating</p>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`h-5 w-5 ${s <= (ticket.rating ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                </div>
                {ticket.rating_comment && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-muted-foreground mb-1">Your Feedback</p>
                    <p className="text-sm italic truncate">"{ticket.rating_comment}"</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Details sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Ticket Details</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Status</p>
                <Badge className={statusColor[ticket.status] ?? statusColor.closed} variant="secondary">
                  {getStatusIcon(ticket.status)}
                  <span className="ml-1 capitalize">{ticket.status.replace('_', ' ')}</span>
                </Badge>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Priority</p>
                <Badge variant="outline" className="capitalize">{ticket.priority}</Badge>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Category</p>
                <Badge variant="outline" className="capitalize">{ticket.category.replace('_', ' ')}</Badge>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Created</p>
                <p className="text-sm">{formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</p>
              </div>
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Last Updated</p>
                <p className="text-sm">{formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}</p>
              </div>
              {ticket.rating && (
                <div>
                  <p className="mb-1 text-xs font-medium text-muted-foreground">Your Rating</p>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <Star key={s} className={`h-4 w-4 ${s <= (ticket.rating ?? 0) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`} />
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
