import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

interface ExportCSVButtonProps {
  data: Record<string, any>[];
  filename: string;
  label?: string;
}

export default function ExportCSVButton({ data, filename, label = 'Export CSV' }: ExportCSVButtonProps) {
  const handleExport = () => {
    if (!data.length) return;

    const headers = Object.keys(data[0]);
    const csvRows = [
      headers.join(','),
      ...data.map(row =>
        headers.map(h => {
          const val = row[h];
          const str = val === null || val === undefined ? '' : String(val);
          // Escape commas, quotes, newlines
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        }).join(',')
      ),
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleExport} disabled={!data.length} className="gap-1">
      <Download className="h-4 w-4" /> {label}
    </Button>
  );
}
