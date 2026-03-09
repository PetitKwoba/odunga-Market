import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Alert {
  id: string;
  type: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

export default function AdminRealtimeAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    // Subscribe to new profiles (signups)
    const profilesChannel = supabase
      .channel('profiles-changes')
      .on('postgres_changes', 
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload) => {
          const newAlert: Alert = {
            id: crypto.randomUUID(),
            type: 'signup',
            message: `New user signup: ${payload.new.name}`,
            timestamp: new Date(),
            read: false
          };
          setAlerts(prev => [newAlert, ...prev]);
          setUnreadCount(prev => prev + 1);
          toast.success('New User Signup', {
            description: payload.new.name
          });
        }
      )
      .subscribe();

    // Subscribe to new orders
    const ordersChannel = supabase
      .channel('orders-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newAlert: Alert = {
            id: crypto.randomUUID(),
            type: 'order',
            message: `New order: ₦${Number(payload.new.total_amount).toLocaleString()}`,
            timestamp: new Date(),
            read: false
          };
          setAlerts(prev => [newAlert, ...prev]);
          setUnreadCount(prev => prev + 1);
          toast.info('New Order', {
            description: `Amount: ₦${Number(payload.new.total_amount).toLocaleString()}`
          });
        }
      )
      .subscribe();

    // Subscribe to new disputes
    const disputesChannel = supabase
      .channel('disputes-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'disputes' },
        (payload) => {
          const newAlert: Alert = {
            id: crypto.randomUUID(),
            type: 'dispute',
            message: `New dispute: ${payload.new.dispute_type}`,
            timestamp: new Date(),
            read: false
          };
          setAlerts(prev => [newAlert, ...prev]);
          setUnreadCount(prev => prev + 1);
          toast.error('New Dispute', {
            description: payload.new.dispute_type
          });
        }
      )
      .subscribe();

    // Subscribe to new documents
    const documentsChannel = supabase
      .channel('documents-changes')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'user_documents' },
        (payload) => {
          const newAlert: Alert = {
            id: crypto.randomUUID(),
            type: 'document',
            message: `New document uploaded: ${payload.new.name}`,
            timestamp: new Date(),
            read: false
          };
          setAlerts(prev => [newAlert, ...prev]);
          setUnreadCount(prev => prev + 1);
          toast.info('New Document', {
            description: payload.new.name
          });
        }
      )
      .subscribe();

    // Subscribe to flagged messages
    const messagesChannel = supabase
      .channel('messages-changes')
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'order_messages', filter: 'is_flagged=eq.true' },
        (payload) => {
          const newAlert: Alert = {
            id: crypto.randomUUID(),
            type: 'flagged',
            message: `Message flagged: ${payload.new.flag_reason || 'No reason'}`,
            timestamp: new Date(),
            read: false
          };
          setAlerts(prev => [newAlert, ...prev]);
          setUnreadCount(prev => prev + 1);
          toast.warning('Message Flagged', {
            description: payload.new.flag_reason
          });
        }
      )
      .subscribe();

    return () => {
      profilesChannel.unsubscribe();
      ordersChannel.unsubscribe();
      disputesChannel.unsubscribe();
      documentsChannel.unsubscribe();
      messagesChannel.unsubscribe();
    };
  }, []);

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
    setUnreadCount(0);
  };

  const getAlertBadgeVariant = (type: string) => {
    switch (type) {
      case 'signup': return 'default';
      case 'order': return 'secondary';
      case 'dispute': return 'destructive';
      case 'document': return 'outline';
      case 'flagged': return 'destructive';
      default: return 'default';
    }
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            Real-time Alerts
            {unreadCount > 0 && (
              <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                Mark all read
              </Button>
            )}
          </SheetTitle>
        </SheetHeader>
        <ScrollArea className="h-[calc(100vh-100px)] mt-4">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No alerts yet
            </div>
          ) : (
            <div className="space-y-4">
              {alerts.map(alert => (
                <div 
                  key={alert.id}
                  className={`p-3 rounded-lg border ${!alert.read ? 'bg-muted/50' : 'bg-background'}`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <Badge variant={getAlertBadgeVariant(alert.type)}>
                      {alert.type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm">{alert.message}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
