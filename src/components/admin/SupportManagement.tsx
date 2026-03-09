import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  MessageCircle, Send, Search, Plus, Pencil, Trash2, ChevronDown, Star
} from 'lucide-react';
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
  rating?: number | null;
  rating_comment?: string | null;
  user_name?: string;
  user_email?: string;
}

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  sender_name?: string;
}

interface CannedResponse {
  id: string;
  title: string;
  content: string;
  category: string;
  created_at: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const statusColor: Record<string, string> = {
  open: 'bg-blue-500/10 text-blue-700',
  in_progress: 'bg-yellow-500/10 text-yellow-700',
  resolved: 'bg-green-500/10 text-green-700',
  closed: 'bg-gray-500/10 text-gray-700',
};
const priorityColor: Record<string, string> = {
  urgent: 'bg-red-500/10 text-red-700',
  high: 'bg-orange-500/10 text-orange-700',
  medium: 'bg-blue-500/10 text-blue-700',
  low: 'bg-gray-500/10 text-gray-700',
};

const StarRating = ({ value }: { value: number }) => (
  <div className="flex gap-0.5">
    {[1, 2, 3, 4, 5].map((s) => (
      <Star
        key={s}
        className={`h-4 w-4 ${s <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground/30'}`}
      />
    ))}
  </div>
);

// ── Main component ────────────────────────────────────────────────────────────

export default function SupportManagement() {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Tickets
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Canned responses
  const [canned, setCanned] = useState<CannedResponse[]>([]);
  const [showCannedPicker, setShowCannedPicker] = useState(false);
  const [cannedDialogOpen, setCannedDialogOpen] = useState(false);
  const [editingCanned, setEditingCanned] = useState<CannedResponse | null>(null);
  const [cannedForm, setCannedForm] = useState({ title: '', content: '', category: 'general' });
  const [cannedSearch, setCannedSearch] = useState('');

  useEffect(() => { fetchTickets(); fetchCanned(); }, [statusFilter, priorityFilter]);

  // auto-scroll messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ── Tickets ────────────────────────────────────────────────────────────────

  const fetchTickets = async () => {
    let q = supabase
      .from('support_tickets')
      .select('*')
      .order('created_at', { ascending: false });
    if (statusFilter !== 'all') q = q.eq('status', statusFilter);
    if (priorityFilter !== 'all') q = q.eq('priority', priorityFilter);
    const { data, error } = await q;
    if (error) { toast.error('Failed to load tickets'); setLoading(false); return; }

    const userIds = [...new Set(data?.map((t: any) => t.user_id) || [])];
    let profiles: any[] = [];
    if (userIds.length) {
      const { data: pd } = await supabase.from('profiles').select('user_id, name, email').in('user_id', userIds);
      profiles = pd || [];
    }
    setTickets(
      (data || []).map((t: any) => ({
        ...t,
        user_name: profiles.find((p: any) => p.user_id === t.user_id)?.name,
        user_email: profiles.find((p: any) => p.user_id === t.user_id)?.email,
      }))
    );
    setLoading(false);
  };

  const fetchMessages = async (ticketId: string) => {
    const { data, error } = await supabase
      .from('support_messages')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (error) return;

    const sids = [...new Set((data || []).map((m: any) => m.sender_id))];
    let profiles: any[] = [];
    if (sids.length) {
      const { data: pd } = await supabase.from('profiles').select('user_id, name, business_name').in('user_id', sids);
      profiles = pd || [];
    }
    setMessages(
      (data || []).map((m: any) => ({
        ...m,
        sender_name:
          profiles.find((p: any) => p.user_id === m.sender_id)?.business_name ||
          profiles.find((p: any) => p.user_id === m.sender_id)?.name ||
          'Unknown',
      }))
    );
  };

  const handleTicketClick = async (ticket: Ticket) => {
    setSelectedTicket(ticket);
    setNewMessage('');
    setShowCannedPicker(false);
    await fetchMessages(ticket.id);
  };

  const handleStatusChange = async (ticketId: string, newStatus: string) => {
    const { error } = await supabase.from('support_tickets').update({ status: newStatus }).eq('id', ticketId);
    if (error) { toast.error('Failed to update status'); return; }
    toast.success('Status updated');
    fetchTickets();
    if (selectedTicket?.id === ticketId) setSelectedTicket({ ...selectedTicket, status: newStatus });
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedTicket) return;
    setSending(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from('support_messages').insert({
      ticket_id: selectedTicket.id,
      sender_id: user?.id,
      message: newMessage.trim(),
      is_internal: false,
    });
    if (error) { toast.error('Failed to send message'); } else {
      setNewMessage('');
      setShowCannedPicker(false);
      await fetchMessages(selectedTicket.id);
    }
    setSending(false);
  };

  // ── Canned responses ───────────────────────────────────────────────────────

  const fetchCanned = async () => {
    const { data } = await supabase.from('support_canned_responses').select('*').order('category').order('title');
    setCanned(data || []);
  };

  const openNewCanned = () => {
    setEditingCanned(null);
    setCannedForm({ title: '', content: '', category: 'general' });
    setCannedDialogOpen(true);
  };

  const openEditCanned = (r: CannedResponse) => {
    setEditingCanned(r);
    setCannedForm({ title: r.title, content: r.content, category: r.category });
    setCannedDialogOpen(true);
  };

  const handleSaveCanned = async () => {
    if (!cannedForm.title.trim() || !cannedForm.content.trim()) {
      toast.error('Title and content are required');
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (editingCanned) {
      const { error } = await supabase
        .from('support_canned_responses')
        .update({ title: cannedForm.title.trim(), content: cannedForm.content.trim(), category: cannedForm.category })
        .eq('id', editingCanned.id);
      if (error) { toast.error('Failed to save'); return; }
      toast.success('Response updated');
    } else {
      const { error } = await supabase
        .from('support_canned_responses')
        .insert({ title: cannedForm.title.trim(), content: cannedForm.content.trim(), category: cannedForm.category, created_by: user?.id });
      if (error) { toast.error('Failed to save'); return; }
      toast.success('Response created');
    }
    setCannedDialogOpen(false);
    fetchCanned();
  };

  const handleDeleteCanned = async (id: string) => {
    const { error } = await supabase.from('support_canned_responses').delete().eq('id', id);
    if (error) { toast.error('Failed to delete'); return; }
    toast.success('Deleted');
    fetchCanned();
  };

  const insertCannedResponse = (content: string) => {
    setNewMessage(content);
    setShowCannedPicker(false);
  };

  const filteredTickets = tickets.filter(
    (t) =>
      t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.user_name ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.user_email ?? '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCanned = canned.filter(
    (r) =>
      r.title.toLowerCase().includes(cannedSearch.toLowerCase()) ||
      r.content.toLowerCase().includes(cannedSearch.toLowerCase()) ||
      r.category.toLowerCase().includes(cannedSearch.toLowerCase())
  );

  // ── JSX ────────────────────────────────────────────────────────────────────

  return (
    <TooltipProvider>
      <Tabs defaultValue="tickets" className="space-y-6">
        <TabsList>
          <TabsTrigger value="tickets">
            <MessageCircle className="mr-1.5 h-4 w-4" /> Tickets
          </TabsTrigger>
          <TabsTrigger value="canned">
            Canned Responses
          </TabsTrigger>
        </TabsList>

        {/* ── Tickets tab ── */}
        <TabsContent value="tickets" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>Manage customer support requests</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="mb-4 flex flex-wrap gap-3">
                <div className="relative min-w-[200px] flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input placeholder="Search tickets…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="resolved">Resolved</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-[150px]"><SelectValue placeholder="Priority" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Priority</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {loading ? (
                <p className="py-8 text-center text-muted-foreground">Loading tickets…</p>
              ) : filteredTickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <MessageCircle className="mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="text-muted-foreground">No tickets found</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTickets.map((ticket) => (
                    <Card key={ticket.id} className="cursor-pointer transition-colors hover:bg-accent/5" onClick={() => handleTicketClick(ticket)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              <Badge className={statusColor[ticket.status] ?? statusColor.closed} variant="secondary">
                                {ticket.status.replace('_', ' ').toUpperCase()}
                              </Badge>
                              <Badge className={priorityColor[ticket.priority] ?? priorityColor.low} variant="secondary">
                                {ticket.priority.toUpperCase()}
                              </Badge>
                              <Badge variant="outline">{ticket.category}</Badge>
                              {ticket.rating && <StarRating value={ticket.rating} />}
                            </div>
                            <h4 className="truncate font-semibold">{ticket.subject}</h4>
                            <p className="line-clamp-1 text-sm text-muted-foreground">{ticket.description}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {ticket.user_name} ({ticket.user_email}) · {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Ticket detail dialog */}
          <Dialog open={!!selectedTicket} onOpenChange={() => { setSelectedTicket(null); setShowCannedPicker(false); }}>
            <DialogContent className="max-h-[90vh] max-w-4xl overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="truncate pr-8">{selectedTicket?.subject}</DialogTitle>
              </DialogHeader>
              {selectedTicket && (
                <div className="flex flex-col gap-4 overflow-hidden">
                  {/* Status row */}
                  <div className="flex flex-wrap items-center gap-3">
                    <Select value={selectedTicket.status} onValueChange={(val) => handleStatusChange(selectedTicket.id, val)}>
                      <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="resolved">Resolved</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge className={priorityColor[selectedTicket.priority]}>{selectedTicket.priority.toUpperCase()}</Badge>
                    <Badge variant="outline">{selectedTicket.category}</Badge>
                    {selectedTicket.rating && (
                      <div className="flex items-center gap-1.5">
                        <StarRating value={selectedTicket.rating} />
                        <span className="text-xs text-muted-foreground">by user</span>
                      </div>
                    )}
                  </div>

                  {/* Original description */}
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="mb-1 text-xs text-muted-foreground">Original Request</p>
                    <p className="text-sm">{selectedTicket.description}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      From: {selectedTicket.user_name} ({selectedTicket.user_email})
                    </p>
                  </div>

                  {/* Rating comment */}
                  {selectedTicket.rating_comment && (
                    <div className="rounded-lg border bg-yellow-50/50 p-3">
                      <p className="mb-1 text-xs font-medium text-muted-foreground">User Feedback</p>
                      <p className="text-sm italic">"{selectedTicket.rating_comment}"</p>
                    </div>
                  )}

                  {/* Messages */}
                  <ScrollArea className="h-[280px] rounded-lg border p-4" ref={scrollRef}>
                    <div className="space-y-3">
                      {messages.length === 0 ? (
                        <p className="text-center text-sm text-muted-foreground py-8">No messages yet — be the first to respond.</p>
                      ) : messages.map((msg) => (
                        <div key={msg.id} className="rounded-lg border bg-card p-3">
                          <p className="mb-1 text-xs font-semibold text-muted-foreground">
                            {msg.sender_name} · {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                          </p>
                          <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>

                  {/* Reply area */}
                  {!['resolved', 'closed'].includes(selectedTicket.status) && (
                    <div className="space-y-2">
                      {/* Canned response picker */}
                      {showCannedPicker && (
                        <div className="rounded-lg border bg-popover shadow-md">
                          <div className="border-b p-2">
                            <Input
                              placeholder="Search templates…"
                              value={cannedSearch}
                              onChange={(e) => setCannedSearch(e.target.value)}
                              className="h-8 text-sm"
                              autoFocus
                            />
                          </div>
                          <ScrollArea className="max-h-48">
                            {filteredCanned.length === 0 ? (
                              <p className="p-3 text-sm text-muted-foreground">No templates found</p>
                            ) : filteredCanned.map((r) => (
                              <button
                                key={r.id}
                                className="w-full px-3 py-2 text-left hover:bg-accent/50 transition-colors"
                                onClick={() => insertCannedResponse(r.content)}
                              >
                                <p className="text-sm font-medium">{r.title}</p>
                                <p className="line-clamp-1 text-xs text-muted-foreground">{r.content}</p>
                              </button>
                            ))}
                          </ScrollArea>
                        </div>
                      )}

                      <div className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="gap-1.5 text-xs"
                                onClick={() => { setShowCannedPicker((v) => !v); setCannedSearch(''); }}
                              >
                                Canned Responses <ChevronDown className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Insert a saved template</TooltipContent>
                          </Tooltip>
                          <Textarea
                            placeholder="Type your response…"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            rows={3}
                            maxLength={2000}
                          />
                        </div>
                        <Button size="icon" onClick={handleSendMessage} disabled={sending || !newMessage.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* ── Canned responses tab ── */}
        <TabsContent value="canned" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Canned Responses</CardTitle>
                  <CardDescription>Saved reply templates for common questions</CardDescription>
                </div>
                <Button onClick={openNewCanned} className="gap-2">
                  <Plus className="h-4 w-4" /> New Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {canned.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <MessageCircle className="mb-4 h-12 w-12 text-muted-foreground/40" />
                  <p className="mb-4 text-muted-foreground">No canned responses yet</p>
                  <Button onClick={openNewCanned} className="gap-2"><Plus className="h-4 w-4" /> Create First Template</Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Group by category */}
                  {[...new Set(canned.map((r) => r.category))].map((cat) => (
                    <div key={cat}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{cat}</p>
                      <div className="space-y-2">
                        {canned.filter((r) => r.category === cat).map((r) => (
                          <Card key={r.id} className="border">
                            <CardContent className="flex items-start justify-between gap-4 p-4">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{r.title}</p>
                                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.content}</p>
                              </div>
                              <div className="flex gap-1.5 shrink-0">
                                <Button variant="ghost" size="icon" onClick={() => openEditCanned(r)}>
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive" onClick={() => handleDeleteCanned(r.id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Canned response edit/create dialog */}
      <Dialog open={cannedDialogOpen} onOpenChange={setCannedDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCanned ? 'Edit Template' : 'New Canned Response'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input placeholder="e.g. Order Tracking Instructions" value={cannedForm.title} onChange={(e) => setCannedForm((f) => ({ ...f, title: e.target.value }))} maxLength={120} />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={cannedForm.category} onValueChange={(v) => setCannedForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="product">Product</SelectItem>
                  <SelectItem value="account">Account</SelectItem>
                  <SelectItem value="order">Order</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                placeholder="Write your template message here…"
                value={cannedForm.content}
                onChange={(e) => setCannedForm((f) => ({ ...f, content: e.target.value }))}
                rows={6}
                maxLength={2000}
              />
              <p className="text-xs text-muted-foreground">{cannedForm.content.length}/2000</p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setCannedDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCanned}>{editingCanned ? 'Save Changes' : 'Create'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
