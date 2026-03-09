import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MessageCircle, Clock, CheckCircle2, AlertCircle, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface Ticket {
  id: string;
  subject: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  created_at: string;
  updated_at: string;
  assigned_to: string | null;
}

export default function Support() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('general');
  const [priority, setPriority] = useState('medium');

  useEffect(() => {
    if (user) {
      fetchTickets();
    }
  }, [user]);

  const fetchTickets = async () => {
    const { data, error } = await supabase
      .from('support_tickets')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching tickets:', error);
      toast.error('Failed to load tickets');
    } else {
      setTickets(data || []);
    }
    setLoading(false);
  };

  const handleCreateTicket = async () => {
    if (!subject.trim() || !description.trim()) {
      toast.error('Please fill in all required fields');
      return;
    }

    setCreating(true);
    const { error } = await supabase.from('support_tickets').insert({
      user_id: user?.id,
      subject: subject.trim(),
      description: description.trim(),
      category,
      priority,
      status: 'open',
    });

    if (error) {
      console.error('Error creating ticket:', error);
      toast.error('Failed to create ticket');
    } else {
      toast.success('Support ticket created successfully');
      setOpen(false);
      setSubject('');
      setDescription('');
      setCategory('general');
      setPriority('medium');
      fetchTickets();
    }
    setCreating(false);
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
        return <MessageCircle className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'in_progress':
        return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-300';
      case 'resolved':
        return 'bg-green-500/10 text-green-700 dark:text-green-300';
      case 'closed':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/10 text-red-700 dark:text-red-300';
      case 'high':
        return 'bg-orange-500/10 text-orange-700 dark:text-orange-300';
      case 'medium':
        return 'bg-blue-500/10 text-blue-700 dark:text-blue-300';
      case 'low':
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-500/10 text-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="text-muted-foreground">Loading tickets...</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">Customer Support</h1>
          <p className="mt-2 text-muted-foreground">Get help with your orders, products, and account</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              New Ticket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Create Support Ticket</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  placeholder="Brief description of your issue"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  maxLength={200}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger id="category">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Inquiry</SelectItem>
                      <SelectItem value="billing">Billing & Payment</SelectItem>
                      <SelectItem value="technical">Technical Issue</SelectItem>
                      <SelectItem value="product">Product Question</SelectItem>
                      <SelectItem value="account">Account Issue</SelectItem>
                      <SelectItem value="order">Order Issue</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <Select value={priority} onValueChange={setPriority}>
                    <SelectTrigger id="priority">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Please provide details about your issue..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  maxLength={2000}
                />
                <p className="text-xs text-muted-foreground">{description.length}/2000 characters</p>
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateTicket} disabled={creating}>
                {creating ? 'Creating...' : 'Create Ticket'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {tickets.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <MessageCircle className="mb-4 h-12 w-12 text-muted-foreground/40" />
            <h3 className="mb-2 font-semibold">No support tickets yet</h3>
            <p className="mb-6 text-center text-sm text-muted-foreground">
              Create a ticket if you need help with anything
            </p>
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Your First Ticket
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {tickets.map((ticket) => (
            <Card
              key={ticket.id}
              className="cursor-pointer transition-colors hover:bg-accent/5"
              onClick={() => navigate(`/support/${ticket.id}`)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2">
                      <Badge className={getStatusColor(ticket.status)} variant="secondary">
                        {getStatusIcon(ticket.status)}
                        <span className="ml-1 capitalize">{ticket.status.replace('_', ' ')}</span>
                      </Badge>
                      <Badge className={getPriorityColor(ticket.priority)} variant="secondary">
                        {ticket.priority.toUpperCase()}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {ticket.category.replace('_', ' ')}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{ticket.subject}</CardTitle>
                    <CardDescription className="mt-1 line-clamp-2">{ticket.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Created {formatDistanceToNow(new Date(ticket.created_at), { addSuffix: true })}</span>
                  <span>Updated {formatDistanceToNow(new Date(ticket.updated_at), { addSuffix: true })}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
