import { useState, useEffect } from "react";
import { 
  Bell, Check, UserPlus, Handshake, Info, 
  XCircle, Trash2, Gift, ShieldAlert 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
  link?: string;
}

export function NotificationDropdown() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setNotifications(data);
  };

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe Realtime
    const channel = supabase
      .channel('notifications-update')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications' },
        () => fetchNotifications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.is_read) {
      setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
      await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
    }
    setOpen(false);
    if (notification.link) navigate(notification.link);
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase.from('notifications').update({ is_read: true }).eq('is_read', false);
  };

  const clearAllNotifications = async () => {
    setNotifications([]);
    // ลบเฉพาะที่เรามีสิทธิ์เห็น (ตาม Policy ใน DB)
    await supabase.from('notifications').delete().neq('id', '00000000-0000-0000-0000-000000000000'); 
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'staff_request': return <UserPlus className="h-4 w-4 text-blue-500" />;
      case 'partnership_request': return <Handshake className="h-4 w-4 text-purple-500" />;
      case 'partnership_accepted': return <Check className="h-4 w-4 text-green-500" />;
      case 'partnership_rejected': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'offer_received': return <Gift className="h-4 w-4 text-pink-500" />;
      case 'role_change': return <ShieldAlert className="h-4 w-4 text-orange-500" />;
      default: return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getBgColor = (n: Notification) => {
    if (n.is_read) return "hover:bg-muted/50";
    if (n.type.includes('rejected')) return "bg-red-50/80 dark:bg-red-900/20";
    if (n.type.includes('accepted')) return "bg-green-50/80 dark:bg-green-900/20";
    if (n.type === 'offer_received') return "bg-pink-50/80 dark:bg-pink-900/20";
    return "bg-blue-50/80 dark:bg-blue-900/20";
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background animate-pulse" />
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0 shadow-xl border-border/60 backdrop-blur-xl bg-background/95" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={markAllAsRead} title="Mark all read">
                <Check className="h-4 w-4" />
              </Button>
            )}
            {notifications.length > 0 && (
               <Button variant="ghost" size="icon" className="h-7 w-7 hover:text-destructive" onClick={clearAllNotifications}>
                 <Trash2 className="h-4 w-4" />
               </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground/50">
              <Bell className="h-10 w-10 mb-2 opacity-20" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={cn("flex gap-3 p-4 transition-all cursor-pointer relative", getBgColor(notification))}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="mt-1 bg-background/80 p-1.5 rounded-full shadow-sm h-fit">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-start">
                      <p className={cn("text-sm font-medium leading-none", !notification.is_read && "text-foreground")}>
                        {notification.title}
                      </p>
                      {!notification.is_read && <span className="h-2 w-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{notification.message}</p>
                    <p className="text-[10px] text-muted-foreground/60 pt-1">
                      {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: th })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}