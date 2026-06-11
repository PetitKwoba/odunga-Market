import { CheckCircle2, Circle, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
  { key: 'requested', label: 'Requested' },
  { key: 'pending', label: 'Pending' },
  { key: 'processing', label: 'Processing' },
  { key: 'paid', label: 'Completed' },
];

interface Props {
  status: string;
  createdAt?: string;
  processedAt?: string | null;
  failureReason?: string | null;
}

export default function WithdrawalStatusTimeline({ status, createdAt, processedAt, failureReason }: Props) {
  const failed = status === 'failed' || status === 'rejected' || status === 'reversed';
  const currentIdx = failed
    ? STEPS.findIndex(s => s.key === 'processing')
    : Math.max(0, STEPS.findIndex(s => s.key === (status === 'paid' ? 'paid' : status)));

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1">
        {STEPS.map((step, i) => {
          const done = !failed && i <= currentIdx;
          const active = i === currentIdx && !failed && status !== 'paid';
          const isFailNode = failed && i === STEPS.length - 1;
          return (
            <div key={step.key} className="flex items-center gap-1 flex-1">
              <div className="flex flex-col items-center gap-1 min-w-0">
                {isFailNode ? (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                ) : done ? (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                ) : active ? (
                  <Clock className="h-4 w-4 text-primary animate-pulse shrink-0" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
                <span className={cn(
                  "text-[10px] truncate",
                  isFailNode ? "text-destructive" : done || active ? "text-foreground" : "text-muted-foreground"
                )}>
                  {isFailNode ? 'Rejected' : step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn("h-px flex-1", done ? "bg-primary" : "bg-border")} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
        {createdAt && <span>Requested: {new Date(createdAt).toLocaleString()}</span>}
        {processedAt && <span>{failed ? 'Failed' : 'Completed'}: {new Date(processedAt).toLocaleString()}</span>}
      </div>
      {failureReason && <p className="text-xs text-destructive">{failureReason}</p>}
    </div>
  );
}
