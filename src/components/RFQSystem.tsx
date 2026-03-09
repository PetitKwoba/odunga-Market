import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { FileText, Plus, Clock, CheckCircle2, XCircle, DollarSign, Send, Eye } from 'lucide-react';

interface RFQRequest {
  id: string;
  wholesaler_id: string;
  title: string;
  description: string;
  category: string | null;
  quantity: number;
  target_price: number | null;
  delivery_location: string | null;
  delivery_deadline: string | null;
  status: string;
  expires_at: string;
  created_at: string;
  response_count?: number;
  wholesaler_name?: string;
}

interface RFQResponse {
  id: string;
  rfq_id: string;
  producer_id: string;
  unit_price: number;
  total_price: number;
  lead_time_days: number;
  notes: string | null;
  is_selected: boolean;
  status: string;
  created_at: string;
  producer_name?: string;
}

export default function RFQSystem({ mode = 'wholesaler' }: { mode?: 'wholesaler' | 'producer' }) {
  const { user } = useAuth();
  const [rfqs, setRfqs] = useState<RFQRequest[]>([]);
  const [myResponses, setMyResponses] = useState<RFQResponse[]>([]);
  const [selectedRfq, setSelectedRfq] = useState<RFQRequest | null>(null);
  const [responses, setResponses] = useState<RFQResponse[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [quoteOpen, setQuoteOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state for creating RFQ
  const [rfqForm, setRfqForm] = useState({
    title: '',
    description: '',
    category: '',
    quantity: '',
    target_price: '',
    delivery_location: '',
    delivery_deadline: '',
    expires_days: '7',
  });

  // Form state for submitting quote
  const [quoteForm, setQuoteForm] = useState({
    unit_price: '',
    lead_time_days: '',
    notes: '',
  });

  useEffect(() => {
    if (!user) return;
    fetchRFQs();
    if (mode === 'producer') fetchMyResponses();
  }, [user, mode]);

  const fetchRFQs = async () => {
    let query = supabase.from('rfq_requests').select('*').order('created_at', { ascending: false });
    
    if (mode === 'wholesaler') {
      query = query.eq('wholesaler_id', user?.id);
    } else {
      query = query.eq('status', 'open');
    }

    const { data } = await query;

    if (data && data.length > 0) {
      // Get response counts
      const rfqIds = data.map(r => r.id);
      const { data: responseCounts } = await supabase
        .from('rfq_responses')
        .select('rfq_id')
        .in('rfq_id', rfqIds);

      // Get wholesaler names for producer view
      if (mode === 'producer') {
        const wholesalerIds = [...new Set(data.map(r => r.wholesaler_id))];
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, name')
          .in('user_id', wholesalerIds);
        
        const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);
        
        setRfqs(data.map(r => ({
          ...r,
          response_count: responseCounts?.filter(rc => rc.rfq_id === r.id).length || 0,
          wholesaler_name: profileMap.get(r.wholesaler_id) || 'Unknown',
        })));
      } else {
        setRfqs(data.map(r => ({
          ...r,
          response_count: responseCounts?.filter(rc => rc.rfq_id === r.id).length || 0,
        })));
      }
    } else {
      setRfqs([]);
    }
  };

  const fetchMyResponses = async () => {
    const { data } = await supabase
      .from('rfq_responses')
      .select('*')
      .eq('producer_id', user?.id)
      .order('created_at', { ascending: false });
    if (data) setMyResponses(data);
  };

  const fetchResponses = async (rfqId: string) => {
    const { data } = await supabase
      .from('rfq_responses')
      .select('*')
      .eq('rfq_id', rfqId)
      .order('total_price', { ascending: true });

    if (data && data.length > 0) {
      const producerIds = [...new Set(data.map(r => r.producer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', producerIds);
      
      const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);
      
      setResponses(data.map(r => ({
        ...r,
        producer_name: profileMap.get(r.producer_id) || 'Unknown Producer',
      })));
    } else {
      setResponses([]);
    }
  };

  const handleCreateRFQ = async () => {
    if (!rfqForm.title || !rfqForm.description || !rfqForm.quantity) {
      toast.error('Please fill required fields');
      return;
    }
    setLoading(true);

    try {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + parseInt(rfqForm.expires_days));

      const { error } = await supabase.from('rfq_requests').insert({
        wholesaler_id: user?.id,
        title: rfqForm.title,
        description: rfqForm.description,
        category: rfqForm.category || null,
        quantity: parseInt(rfqForm.quantity),
        target_price: rfqForm.target_price ? parseFloat(rfqForm.target_price) : null,
        delivery_location: rfqForm.delivery_location || null,
        delivery_deadline: rfqForm.delivery_deadline || null,
        expires_at: expiresAt.toISOString(),
      });

      if (error) throw error;

      toast.success('RFQ created successfully');
      setCreateOpen(false);
      setRfqForm({ title: '', description: '', category: '', quantity: '', target_price: '', delivery_location: '', delivery_deadline: '', expires_days: '7' });
      fetchRFQs();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuote = async () => {
    if (!selectedRfq || !quoteForm.unit_price || !quoteForm.lead_time_days) {
      toast.error('Please fill required fields');
      return;
    }
    setLoading(true);

    try {
      const unitPrice = parseFloat(quoteForm.unit_price);
      const totalPrice = unitPrice * selectedRfq.quantity;

      const { error } = await supabase.from('rfq_responses').insert({
        rfq_id: selectedRfq.id,
        producer_id: user?.id,
        unit_price: unitPrice,
        total_price: totalPrice,
        lead_time_days: parseInt(quoteForm.lead_time_days),
        notes: quoteForm.notes || null,
      });

      if (error) throw error;

      toast.success('Quote submitted');
      setQuoteOpen(false);
      setQuoteForm({ unit_price: '', lead_time_days: '', notes: '' });
      fetchRFQs();
      fetchMyResponses();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptQuote = async (responseId: string) => {
    if (!selectedRfq) return;
    setLoading(true);

    try {
      // Mark quote as selected
      await supabase
        .from('rfq_responses')
        .update({ is_selected: true, status: 'accepted' })
        .eq('id', responseId);

      // Reject other quotes
      await supabase
        .from('rfq_responses')
        .update({ status: 'rejected' })
        .eq('rfq_id', selectedRfq.id)
        .neq('id', responseId);

      // Close RFQ
      await supabase
        .from('rfq_requests')
        .update({ status: 'awarded' })
        .eq('id', selectedRfq.id);

      toast.success('Quote accepted');
      setDetailOpen(false);
      fetchRFQs();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-600">Open</Badge>;
      case 'awarded':
        return <Badge className="bg-blue-600">Awarded</Badge>;
      case 'closed':
        return <Badge variant="secondary">Closed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getResponseStatusBadge = (status: string, isSelected: boolean) => {
    if (isSelected) return <Badge className="bg-green-600"><CheckCircle2 className="mr-1 h-3 w-3" /> Accepted</Badge>;
    switch (status) {
      case 'submitted':
        return <Badge variant="secondary">Pending</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Not Selected</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const hasSubmittedQuote = (rfqId: string) => {
    return myResponses.some(r => r.rfq_id === rfqId);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">
            {mode === 'wholesaler' ? 'Request for Quotes' : 'Quote Opportunities'}
          </h2>
          <p className="text-muted-foreground">
            {mode === 'wholesaler' 
              ? 'Create RFQs and receive competitive quotes from producers'
              : 'Browse open requests and submit your best quotes'}
          </p>
        </div>
        {mode === 'wholesaler' && (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Create RFQ
          </Button>
        )}
      </div>

      {mode === 'producer' && (
        <Tabs defaultValue="open">
          <TabsList>
            <TabsTrigger value="open">Open RFQs</TabsTrigger>
            <TabsTrigger value="my-quotes">My Quotes</TabsTrigger>
          </TabsList>
          <TabsContent value="open" className="mt-4">
            <RFQTable 
              rfqs={rfqs.filter(r => !hasSubmittedQuote(r.id))} 
              mode="producer" 
              onView={(rfq) => {
                setSelectedRfq(rfq);
                setQuoteOpen(true);
              }}
            />
          </TabsContent>
          <TabsContent value="my-quotes" className="mt-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>RFQ</TableHead>
                      <TableHead>Your Quote</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myResponses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          You haven't submitted any quotes yet
                        </TableCell>
                      </TableRow>
                    ) : (
                      myResponses.map(r => {
                        const rfq = rfqs.find(req => req.id === r.rfq_id);
                        return (
                          <TableRow key={r.id}>
                            <TableCell className="font-medium">{rfq?.title || 'Unknown RFQ'}</TableCell>
                            <TableCell>
                              <p className="font-semibold">${r.total_price.toFixed(2)}</p>
                              <p className="text-xs text-muted-foreground">${r.unit_price}/unit × {rfq?.quantity || 0}</p>
                            </TableCell>
                            <TableCell>{getResponseStatusBadge(r.status, r.is_selected)}</TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(r.created_at).toLocaleDateString()}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {mode === 'wholesaler' && (
        <RFQTable 
          rfqs={rfqs} 
          mode="wholesaler" 
          onView={(rfq) => {
            setSelectedRfq(rfq);
            fetchResponses(rfq.id);
            setDetailOpen(true);
          }}
        />
      )}

      {/* Create RFQ Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Request for Quote</DialogTitle>
            <DialogDescription>Describe what you need and producers will submit competitive quotes.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input
                value={rfqForm.title}
                onChange={e => setRfqForm({ ...rfqForm, title: e.target.value })}
                placeholder="e.g., Bulk Order - Organic Coffee Beans"
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Textarea
                value={rfqForm.description}
                onChange={e => setRfqForm({ ...rfqForm, description: e.target.value })}
                placeholder="Describe your requirements in detail..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  min="1"
                  value={rfqForm.quantity}
                  onChange={e => setRfqForm({ ...rfqForm, quantity: e.target.value })}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label>Target Price (optional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={rfqForm.target_price}
                  onChange={e => setRfqForm({ ...rfqForm, target_price: e.target.value })}
                  placeholder="$/unit"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Input
                value={rfqForm.category}
                onChange={e => setRfqForm({ ...rfqForm, category: e.target.value })}
                placeholder="e.g., Food & Beverages"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Delivery Location</Label>
                <Input
                  value={rfqForm.delivery_location}
                  onChange={e => setRfqForm({ ...rfqForm, delivery_location: e.target.value })}
                  placeholder="City, Country"
                />
              </div>
              <div className="space-y-2">
                <Label>Delivery Deadline</Label>
                <Input
                  type="date"
                  value={rfqForm.delivery_deadline}
                  onChange={e => setRfqForm({ ...rfqForm, delivery_deadline: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>RFQ Expires In</Label>
              <Select value={rfqForm.expires_days} onValueChange={v => setRfqForm({ ...rfqForm, expires_days: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 days</SelectItem>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateRFQ} disabled={loading}>
              {loading ? 'Creating...' : 'Create RFQ'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* RFQ Detail Dialog (Wholesaler) */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedRfq?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              {getStatusBadge(selectedRfq?.status || '')}
              <span className="text-muted-foreground">Qty: {selectedRfq?.quantity}</span>
              {selectedRfq?.target_price && (
                <span className="text-muted-foreground">Target: ${selectedRfq.target_price}/unit</span>
              )}
            </div>
            <p className="text-sm">{selectedRfq?.description}</p>
            
            <div>
              <h4 className="font-semibold mb-2">Quotes Received ({responses.length})</h4>
              {responses.length === 0 ? (
                <p className="text-muted-foreground text-sm">No quotes received yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Producer</TableHead>
                      <TableHead>Unit Price</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Lead Time</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {responses.map(r => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.producer_name}</TableCell>
                        <TableCell>${r.unit_price.toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">${r.total_price.toFixed(2)}</TableCell>
                        <TableCell>{r.lead_time_days} days</TableCell>
                        <TableCell>{getResponseStatusBadge(r.status, r.is_selected)}</TableCell>
                        <TableCell>
                          {selectedRfq?.status === 'open' && r.status === 'submitted' && (
                            <Button size="sm" onClick={() => handleAcceptQuote(r.id)} disabled={loading}>
                              Accept
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Submit Quote Dialog (Producer) */}
      <Dialog open={quoteOpen} onOpenChange={setQuoteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Quote</DialogTitle>
            <DialogDescription>{selectedRfq?.title}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-3 text-sm">
              <p><strong>Quantity needed:</strong> {selectedRfq?.quantity} units</p>
              {selectedRfq?.target_price && (
                <p><strong>Target price:</strong> ${selectedRfq.target_price}/unit</p>
              )}
              <p className="mt-2 text-muted-foreground">{selectedRfq?.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Unit Price ($) *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={quoteForm.unit_price}
                  onChange={e => setQuoteForm({ ...quoteForm, unit_price: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Lead Time (days) *</Label>
                <Input
                  type="number"
                  min="1"
                  value={quoteForm.lead_time_days}
                  onChange={e => setQuoteForm({ ...quoteForm, lead_time_days: e.target.value })}
                  placeholder="7"
                />
              </div>
            </div>
            {quoteForm.unit_price && selectedRfq && (
              <div className="rounded-lg bg-primary/10 p-3 text-center">
                <p className="text-sm text-muted-foreground">Total Quote</p>
                <p className="font-display text-2xl font-bold text-primary">
                  ${(parseFloat(quoteForm.unit_price) * selectedRfq.quantity).toFixed(2)}
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                value={quoteForm.notes}
                onChange={e => setQuoteForm({ ...quoteForm, notes: e.target.value })}
                placeholder="Additional details about your offer..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuoteOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitQuote} disabled={loading}>
              <Send className="mr-1 h-4 w-4" />
              {loading ? 'Submitting...' : 'Submit Quote'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RFQTable({ rfqs, mode, onView }: { rfqs: RFQRequest[]; mode: 'wholesaler' | 'producer'; onView: (rfq: RFQRequest) => void }) {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-600">Open</Badge>;
      case 'awarded':
        return <Badge className="bg-blue-600">Awarded</Badge>;
      case 'closed':
        return <Badge variant="secondary">Closed</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              {mode === 'producer' && <TableHead>Buyer</TableHead>}
              <TableHead>Quantity</TableHead>
              <TableHead>Target</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>{mode === 'wholesaler' ? 'Quotes' : ''}</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rfqs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  {mode === 'wholesaler' ? 'No RFQs yet. Create your first request!' : 'No open RFQs available'}
                </TableCell>
              </TableRow>
            ) : (
              rfqs.map(rfq => (
                <TableRow key={rfq.id}>
                  <TableCell>
                    <p className="font-medium">{rfq.title}</p>
                    {rfq.category && <p className="text-xs text-muted-foreground">{rfq.category}</p>}
                  </TableCell>
                  {mode === 'producer' && <TableCell>{rfq.wholesaler_name}</TableCell>}
                  <TableCell>{rfq.quantity}</TableCell>
                  <TableCell>
                    {rfq.target_price ? `$${rfq.target_price}/unit` : '-'}
                  </TableCell>
                  <TableCell>{getStatusBadge(rfq.status)}</TableCell>
                  <TableCell className="text-sm">
                    {new Date(rfq.expires_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {mode === 'wholesaler' && (
                      <Badge variant="secondary">{rfq.response_count || 0}</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" onClick={() => onView(rfq)}>
                      {mode === 'wholesaler' ? <Eye className="mr-1 h-4 w-4" /> : <Send className="mr-1 h-4 w-4" />}
                      {mode === 'wholesaler' ? 'View' : 'Quote'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
