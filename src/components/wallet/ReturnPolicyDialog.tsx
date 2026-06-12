import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, ShieldCheck, Clock, AlertTriangle, ArrowRight } from 'lucide-react';

interface Props {
  windowDays?: number;
}

export default function ReturnPolicyDialog({ windowDays = 7 }: Props) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Info className="h-4 w-4" /> {windowDays}-day return policy details
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> {windowDays}-day return hold
          </DialogTitle>
          <DialogDescription>
            How your earnings move from Pending to Available.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 text-sm">
          <div className="flex gap-3">
            <Clock className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
            <div>
              <p className="font-medium">Why we hold funds for {windowDays} days</p>
              <p className="text-muted-foreground">
                Buyers have a {windowDays}-day window to request a return after their order is paid. We hold the
                seller and referrer portions during this window so refunds are always covered.
              </p>
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <p className="font-medium">How each sale is split</p>
            <ul className="space-y-1 text-muted-foreground list-disc pl-5">
              <li><strong>Platform fee</strong> — 5% (system commission) goes to OdungaMarket.</li>
              <li><strong>Referrer commission</strong> — set by the producer; paid to the referrer if the order was attributed.</li>
              <li><strong>Producer net</strong> — the remainder, credited to the producer.</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <ArrowRight className="h-5 w-5 mt-0.5 text-primary shrink-0" />
            <div>
              <p className="font-medium">Release rules</p>
              <p className="text-muted-foreground">
                On the {windowDays}<sup>th</sup> day after the order is paid (in full), funds automatically move from
                <strong> Pending</strong> to <strong>Available</strong> — for both producer and referrer wallets — as
                long as no return has been opened on that order.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 mt-0.5 text-warning shrink-0" />
            <div>
              <p className="font-medium">When a return is approved</p>
              <p className="text-muted-foreground">
                If a return is approved <em>before</em> release: the pending amount is removed.
                If approved <em>after</em> release: the amount is debited from your available balance
                (and from the referrer's balance proportionally).
              </p>
            </div>
          </div>

          <div className="rounded-lg bg-muted/40 p-3 text-muted-foreground text-xs">
            Withdrawals only draw from <strong>Available</strong>. Pending funds cannot be withdrawn until the
            return window expires.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
