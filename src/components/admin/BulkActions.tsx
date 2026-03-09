import { Button } from '@/components/ui/button';

interface BulkActionsProps {
  selectedCount: number;
  actions: { label: string; icon?: React.ReactNode; onClick: () => void; variant?: 'default' | 'destructive' | 'outline' }[];
}

export default function BulkActions({ selectedCount, actions }: BulkActionsProps) {
  if (selectedCount === 0) return null;
  return (
    <div className="flex items-center gap-2 p-3 mb-3 rounded-lg bg-primary/5 border border-primary/20">
      <span className="text-sm font-medium text-primary">{selectedCount} selected</span>
      <div className="flex-1" />
      {actions.map((a, i) => (
        <Button key={i} size="sm" variant={a.variant || 'default'} onClick={a.onClick} className="gap-1.5">
          {a.icon} {a.label}
        </Button>
      ))}
    </div>
  );
}
