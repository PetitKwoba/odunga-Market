import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Star, ThumbsUp, MessageSquare, CheckCircle2, Store } from 'lucide-react';

interface StoreReview {
  id: string;
  store_id: string;
  reviewer_id: string;
  rating: number;
  title: string | null;
  review: string | null;
  is_verified_purchase: boolean;
  helpful_count: number;
  producer_response: string | null;
  producer_response_at: string | null;
  created_at: string;
  reviewer_name?: string;
}

interface StoreReviewsProps {
  storeId: string; // producer user_id
  storeName?: string;
  showWriteReview?: boolean;
  compact?: boolean;
}

export default function StoreReviews({ storeId, storeName, showWriteReview = true, compact = false }: StoreReviewsProps) {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<StoreReview[]>([]);
  const [canReview, setCanReview] = useState(false);
  const [writeOpen, setWriteOpen] = useState(false);
  const [respondOpen, setRespondOpen] = useState(false);
  const [selectedReview, setSelectedReview] = useState<StoreReview | null>(null);
  const [loading, setLoading] = useState(false);

  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [responseText, setResponseText] = useState('');

  useEffect(() => {
    fetchReviews();
    if (user && showWriteReview) checkCanReview();
  }, [storeId, user]);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from('store_reviews')
      .select('*')
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (data && data.length > 0) {
      const reviewerIds = [...new Set(data.map(r => r.reviewer_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, name')
        .in('user_id', reviewerIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p.name]) || []);

      setReviews(data.map(r => ({
        ...r,
        reviewer_name: profileMap.get(r.reviewer_id) || 'Anonymous',
      })));
    } else {
      setReviews([]);
    }
  };

  const checkCanReview = async () => {
    if (!user) return;

    // Check if user has completed orders with this producer
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('order_id')
      .eq('producer_id', storeId);

    if (orderItems && orderItems.length > 0) {
      const orderIds = [...new Set(orderItems.map(oi => oi.order_id))];
      const { data: completedOrders } = await supabase
        .from('orders')
        .select('id')
        .eq('wholesaler_id', user.id)
        .eq('status', 'Completed')
        .in('id', orderIds);

      if (completedOrders && completedOrders.length > 0) {
        // Check if already reviewed this store
        const { data: existingReview } = await supabase
          .from('store_reviews')
          .select('id')
          .eq('store_id', storeId)
          .eq('reviewer_id', user.id)
          .single();

        setCanReview(!existingReview);
      }
    }
  };

  const handleSubmitReview = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase.from('store_reviews').insert({
        store_id: storeId,
        reviewer_id: user.id,
        rating,
        title: title || null,
        review: reviewText || null,
        is_verified_purchase: true,
      });

      if (error) throw error;

      toast.success('Store review submitted!');
      setWriteOpen(false);
      setRating(5);
      setTitle('');
      setReviewText('');
      setCanReview(false);
      fetchReviews();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitResponse = async () => {
    if (!selectedReview) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('store_reviews')
        .update({
          producer_response: responseText,
          producer_response_at: new Date().toISOString(),
        })
        .eq('id', selectedReview.id);

      if (error) throw error;

      toast.success('Response submitted');
      setRespondOpen(false);
      setResponseText('');
      fetchReviews();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkHelpful = async (reviewId: string) => {
    const review = reviews.find(r => r.id === reviewId);
    if (!review) return;

    await supabase
      .from('store_reviews')
      .update({ helpful_count: review.helpful_count + 1 })
      .eq('id', reviewId);

    fetchReviews();
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const ratingDistribution = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => r.rating === star).length,
    percentage: reviews.length > 0
      ? (reviews.filter(r => r.rating === star).length / reviews.length) * 100
      : 0,
  }));

  const isStoreOwner = user?.id === storeId;

  // Compact summary only (for product detail page)
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4 text-muted-foreground" />
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map(star => (
            <Star
              key={star}
              className={`h-3.5 w-3.5 ${star <= averageRating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`}
            />
          ))}
        </div>
        <span className="text-sm text-muted-foreground">
          {averageRating.toFixed(1)} ({reviews.length} store {reviews.length === 1 ? 'review' : 'reviews'})
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Store className="h-5 w-5" />
              Store Reviews {storeName && <span className="text-muted-foreground font-normal">— {storeName}</span>}
            </span>
            {showWriteReview && canReview && (
              <Button onClick={() => setWriteOpen(true)}>Rate This Store</Button>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <p className="font-display text-4xl font-bold">{averageRating.toFixed(1)}</p>
                <div className="flex justify-center gap-0.5">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${star <= averageRating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
                    />
                  ))}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{reviews.length} reviews</p>
              </div>
            </div>
            <div className="space-y-2">
              {ratingDistribution.map(({ star, count, percentage }) => (
                <div key={star} className="flex items-center gap-2 text-sm">
                  <span className="w-8">{star} ★</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-amber-400 rounded-full" style={{ width: `${percentage}%` }} />
                  </div>
                  <span className="w-8 text-muted-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        {reviews.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No store reviews yet. Be the first to rate this store!
            </CardContent>
          </Card>
        ) : (
          reviews.map(review => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <Avatar>
                    <AvatarFallback>{review.reviewer_name?.charAt(0) || 'A'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{review.reviewer_name}</span>
                          {review.is_verified_purchase && (
                            <Badge variant="secondary" className="text-xs">
                              <CheckCircle2 className="mr-1 h-3 w-3" /> Verified Buyer
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                className={`h-3 w-3 ${star <= review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`}
                              />
                            ))}
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    {review.title && <p className="font-medium">{review.title}</p>}
                    {review.review && <p className="text-sm text-muted-foreground">{review.review}</p>}

                    <div className="flex items-center gap-4 pt-2">
                      <Button variant="ghost" size="sm" className="text-xs" onClick={() => handleMarkHelpful(review.id)}>
                        <ThumbsUp className="mr-1 h-3 w-3" /> Helpful ({review.helpful_count})
                      </Button>
                      {isStoreOwner && !review.producer_response && (
                        <Button variant="ghost" size="sm" className="text-xs" onClick={() => { setSelectedReview(review); setRespondOpen(true); }}>
                          <MessageSquare className="mr-1 h-3 w-3" /> Respond
                        </Button>
                      )}
                    </div>

                    {review.producer_response && (
                      <div className="mt-4 rounded-lg bg-muted/50 p-3">
                        <p className="text-xs font-medium text-primary">Store Response:</p>
                        <p className="mt-1 text-sm">{review.producer_response}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {review.producer_response_at && new Date(review.producer_response_at).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Write Store Review Dialog */}
      <Dialog open={writeOpen} onOpenChange={setWriteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rate This Store</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setRating(star)} className="focus:outline-none">
                    <Star className={`h-8 w-8 transition-colors ${star <= rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground hover:text-amber-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Title (optional)</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Summarize your experience" />
            </div>
            <div className="space-y-2">
              <Label>Review (optional)</Label>
              <Textarea value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="How was your experience with this store?" rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWriteOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitReview} disabled={loading}>{loading ? 'Submitting...' : 'Submit Review'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Store Owner Response Dialog */}
      <Dialog open={respondOpen} onOpenChange={setRespondOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Respond to Review</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedReview && (
              <div className="rounded-lg bg-muted p-3">
                <div className="flex gap-0.5 mb-2">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star key={star} className={`h-3 w-3 ${star <= selectedReview.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
                  ))}
                </div>
                <p className="text-sm">{selectedReview.review || selectedReview.title || 'No text'}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label>Your Response</Label>
              <Textarea value={responseText} onChange={e => setResponseText(e.target.value)} placeholder="Thank the customer and address their feedback..." rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRespondOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmitResponse} disabled={loading || !responseText.trim()}>{loading ? 'Submitting...' : 'Submit Response'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
