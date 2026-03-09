import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollText, Search } from 'lucide-react';

interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_type: string;
  target_id: string | null;
  details: any;
  created_at: string;
}

interface AuditLogsProps {
  profiles: { user_id: string; name: string }[];
}

export default function AuditLogs({ profiles }: AuditLogsProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
      .then(({ data }) => { if (data) setLogs(data as AuditLog[]); setLoading(false); });
  }, []);

  const getName = (id: string) => profiles.find(p => p.user_id === id)?.name || id.slice(0, 8);

  const filtered = search.trim()
    ? logs.filter(l => l.action.includes(search.toLowerCase()) || l.target_type.includes(search.toLowerCase()) || JSON.stringify(l.details).toLowerCase().includes(search.toLowerCase()))
    : logs;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2"><ScrollText className="h-5 w-5" /> Audit Log</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Filter logs..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">No audit logs found</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(log => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</TableCell>
                  <TableCell className="font-medium">{getName(log.admin_id)}</TableCell>
                  <TableCell><Badge variant="outline">{log.action}</Badge></TableCell>
                  <TableCell className="text-xs">{log.target_type}{log.target_id ? ` · ${log.target_id.slice(0, 8)}` : ''}</TableCell>
                  <TableCell className="text-xs max-w-xs truncate">{log.details ? JSON.stringify(log.details) : '—'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
