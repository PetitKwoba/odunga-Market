import { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Download } from 'lucide-react';

interface Column<T> {
  key: string;
  label: string;
  render: (item: T) => React.ReactNode;
  searchable?: boolean;
  exportValue?: (item: T) => string;
}

interface SearchableTableProps<T> {
  data: T[];
  columns: Column<T>[];
  keyExtractor: (item: T) => string;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  actions?: (item: T) => React.ReactNode;
  emptyMessage?: string;
  exportFileName?: string;
}

export default function SearchableTable<T>({
  data, columns, keyExtractor, selectable, selectedIds, onSelectionChange,
  actions, emptyMessage = 'No data found', exportFileName,
}: SearchableTableProps<T>) {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    if (!search.trim()) return data;
    const q = search.toLowerCase();
    return data.filter(item =>
      columns.some(col => {
        if (col.searchable === false) return false;
        const val = col.exportValue ? col.exportValue(item) : String((item as any)[col.key] ?? '');
        return val.toLowerCase().includes(q);
      })
    );
  }, [data, search, columns]);

  const allFilteredIds = new Set(filtered.map(keyExtractor));
  const allSelected = selectable && selectedIds && filtered.length > 0 && filtered.every(i => selectedIds.has(keyExtractor(i)));

  const toggleAll = () => {
    if (!onSelectionChange || !selectedIds) return;
    if (allSelected) {
      const next = new Set(selectedIds);
      filtered.forEach(i => next.delete(keyExtractor(i)));
      onSelectionChange(next);
    } else {
      const next = new Set(selectedIds);
      filtered.forEach(i => next.add(keyExtractor(i)));
      onSelectionChange(next);
    }
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    next.has(id) ? next.delete(id) : next.add(id);
    onSelectionChange(next);
  };

  const exportCSV = () => {
    const headers = columns.map(c => c.label).concat(actions ? ['Actions'] : []);
    const rows = filtered.map(item =>
      columns.map(col => {
        const val = col.exportValue ? col.exportValue(item) : String((item as any)[col.key] ?? '');
        return `"${val.replace(/"/g, '""')}"`;
      })
    );
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${exportFileName || 'export'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <div className="flex items-center gap-2 p-4 border-b">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={exportCSV} className="gap-1.5">
          <Download className="h-4 w-4" /> CSV
        </Button>
      </div>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <p className="text-center py-12 text-muted-foreground">{emptyMessage}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-10">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                  </TableHead>
                )}
                {columns.map(col => (
                  <TableHead key={col.key}>{col.label}</TableHead>
                ))}
                {actions && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(item => {
                const id = keyExtractor(item);
                return (
                  <TableRow key={id}>
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={selectedIds?.has(id)}
                          onCheckedChange={() => toggleOne(id)}
                        />
                      </TableCell>
                    )}
                    {columns.map(col => (
                      <TableCell key={col.key}>{col.render(item)}</TableCell>
                    ))}
                    {actions && <TableCell className="text-right">{actions(item)}</TableCell>}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <div className="px-4 py-2 border-t text-xs text-muted-foreground">
        Showing {filtered.length} of {data.length} records
        {selectable && selectedIds && selectedIds.size > 0 && ` · ${selectedIds.size} selected`}
      </div>
    </Card>
  );
}
