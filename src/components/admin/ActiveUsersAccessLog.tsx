import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Activity, Search, RefreshCw, Clock, Globe, Monitor } from 'lucide-react';

interface ActiveUser {
  user_id: string;
  name: string;
  email: string;
  role: string;
  last_seen_at: string | null;
  is_approved: boolean;
  country: string;
}

interface AccessLogEntry {
  id: string;
  user_id: string;
  event_type: string;
  user_agent: string | null;
  path: string | null;
  created_at: string;
}

interface Props {
  profiles: { user_id: string; name: string; email: string; country: string; is_approved: boolean; last_seen_at?: string | null }[];
  roles: { user_id: string; role: string }[];
}

function getTimeSince(dateStr: string | null): string {
  if (!dateStr) return 'Never';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getStatusBadge(lastSeen: string | null) {
  if (!lastSeen) return <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>;
  const diff = Date.now() - new Date(lastSeen).getTime();
  const mins = diff / 60000;
  if (mins < 5) return <Badge className="bg-success text-success-foreground">Online</Badge>;
  if (mins < 30) return <Badge className="bg-warning text-warning-foreground">Away</Badge>;
  if (mins < 1440) return <Badge variant="outline">Offline</Badge>;
  return <Badge variant="outline" className="text-muted-foreground">Inactive</Badge>;
}

function parseBrowser(ua: string | null): string {
  if (!ua) return 'Unknown';
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
  if (ua.includes('Firefox')) return 'Firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('Edg')) return 'Edge';
  return 'Other';
}

export default function ActiveUsersAccessLog({ profiles, roles }: Props) {
  const [accessLogs, setAccessLogs] = useState<AccessLogEntry[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);
  const [searchUsers, setSearchUsers] = useState('');
  const [searchLogs, setSearchLogs] = useState('');

  const fetchLogs = () => {
    setLoadingLogs(true);
    supabase.from('access_logs' as any).select('*').order('created_at', { ascending: false }).limit(300)
      .then(({ data }) => {
        if (data) setAccessLogs(data as any as AccessLogEntry[]);
        setLoadingLogs(false);
      });
  };

  useEffect(() => { fetchLogs(); }, []);

  const getRoleForUser = (userId: string) => roles.find(r => r.user_id === userId)?.role || 'unknown';
  const getName = (userId: string) => profiles.find(p => p.user_id === userId)?.name || userId.slice(0, 8);

  const activeUsers: ActiveUser[] = profiles.map(p => ({
    ...p,
    last_seen_at: (p as any).last_seen_at || null,
    role: getRoleForUser(p.user_id),
  })).sort((a, b) => {
    if (!a.last_seen_at && !b.last_seen_at) return 0;
    if (!a.last_seen_at) return 1;
    if (!b.last_seen_at) return -1;
    return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
  });

  const filteredUsers = searchUsers.trim()
    ? activeUsers.filter(u =>
        u.name.toLowerCase().includes(searchUsers.toLowerCase()) ||
        u.email.toLowerCase().includes(searchUsers.toLowerCase()) ||
        u.role.toLowerCase().includes(searchUsers.toLowerCase())
      )
    : activeUsers;

  const filteredLogs = searchLogs.trim()
    ? accessLogs.filter(l =>
        getName(l.user_id).toLowerCase().includes(searchLogs.toLowerCase()) ||
        l.event_type.toLowerCase().includes(searchLogs.toLowerCase()) ||
        (l.path || '').toLowerCase().includes(searchLogs.toLowerCase())
      )
    : accessLogs;

  const onlineCount = activeUsers.filter(u => {
    if (!u.last_seen_at) return false;
    return (Date.now() - new Date(u.last_seen_at).getTime()) / 60000 < 5;
  }).length;

  const awayCount = activeUsers.filter(u => {
    if (!u.last_seen_at) return false;
    const mins = (Date.now() - new Date(u.last_seen_at).getTime()) / 60000;
    return mins >= 5 && mins < 30;
  }).length;

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success"><Users className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Online Now</p><p className="font-display text-2xl font-bold">{onlineCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning"><Clock className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Away</p><p className="font-display text-2xl font-bold">{awayCount}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Activity className="h-5 w-5" /></div>
            <div><p className="text-sm text-muted-foreground">Total Access Logs</p><p className="font-display text-2xl font-bold">{accessLogs.length}</p></div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active-users">
        <TabsList>
          <TabsTrigger value="active-users"><Users className="mr-1.5 h-4 w-4" /> Active Users</TabsTrigger>
          <TabsTrigger value="access-log"><Activity className="mr-1.5 h-4 w-4" /> Access Log</TabsTrigger>
        </TabsList>

        <TabsContent value="active-users" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Active Users</CardTitle>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search users..." value={searchUsers} onChange={e => setSearchUsers(e.target.value)} className="pl-9" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Country</TableHead>
                    <TableHead>Last Seen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users found</TableCell></TableRow>
                  ) : filteredUsers.map(u => (
                    <TableRow key={u.user_id}>
                      <TableCell>{getStatusBadge(u.last_seen_at)}</TableCell>
                      <TableCell className="font-medium">{u.name}</TableCell>
                      <TableCell className="text-sm">{u.email}</TableCell>
                      <TableCell><Badge variant="outline">{u.role}</Badge></TableCell>
                      <TableCell className="text-sm">{u.country || '—'}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{getTimeSince(u.last_seen_at)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="access-log" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Access Log</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Filter logs..." value={searchLogs} onChange={e => setSearchLogs(e.target.value)} className="pl-9" />
                  </div>
                  <Button variant="outline" size="sm" onClick={fetchLogs}><RefreshCw className="h-4 w-4" /></Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {loadingLogs ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : filteredLogs.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">No access logs found</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Event</TableHead>
                      <TableHead>Path</TableHead>
                      <TableHead>Browser</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs whitespace-nowrap">{new Date(log.created_at).toLocaleString()}</TableCell>
                        <TableCell className="font-medium">{getName(log.user_id)}</TableCell>
                        <TableCell><Badge variant="outline">{log.event_type}</Badge></TableCell>
                        <TableCell className="text-xs font-mono">{log.path || '—'}</TableCell>
                        <TableCell className="text-xs flex items-center gap-1"><Monitor className="h-3 w-3" /> {parseBrowser(log.user_agent)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
