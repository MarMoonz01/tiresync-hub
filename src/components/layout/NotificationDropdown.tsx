import { useEffect, useState } from "react";
import { Bell, Check, Info, AlertTriangle, XCircle, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'critical';
  is_read: boolean;
  created_at: string;
  link?: string;
}

export function NotificationDropdown() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) {
      const typedData = data.map(n => ({
        ...n,
        type: (['info', 'warning', 'critical'].includes(n.type) ? n.type : 'info') as any
      }));
      setNotifications(typedData);
      setUnreadCount(typedData.filter(n => !n.is_read).length);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchNotifications();

    // Realtime Subscription
    const channel = supabase
      .channel('noti-updates')
      .on(
        'postgres_changes',
        {
          event: '*', // ฟังทุก event (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          fetchNotifications(); // ดึงข้อมูลใหม่เมื่อมีการเปลี่ยนแปลง
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    
    // Optimistic update (อัปเดตหน้าจอทันทีเพื่อให้รู้สึกเร็ว)
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);

    // ส่งคำสั่งไป DB
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false);
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    
    // Optimistic update
    setNotifications([]);
    setUnreadCount(0);

    // ลบข้อมูลจริงใน DB
    await supabase
      .from('notifications')
      .delete()
      .eq('user_id', user.id);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
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
      
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/40">
          <h4 className="font-semibold text-sm">การแจ้งเตือน</h4>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-muted-foreground hover:text-primary"
                onClick={markAllAsRead}
                title="อ่านทั้งหมด"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
            {notifications.length > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={clearAllNotifications}
                title="ลบทั้งหมด"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-4">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">ไม่มีการแจ้งเตือนใหม่</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <div 
                  key={notification.id}
                  className={cn(
                    "flex gap-3 p-4 hover:bg-muted/50 transition-colors cursor-pointer relative group",
                    !notification.is_read && "bg-blue-50/50 dark:bg-blue-900/10"
                  )}
                  onClick={() => {
                    if (notification.link) window.location.href = notification.link;
                  }}
                >
                  <div className="mt-1 flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="space-y-1 flex-1">
                    <p className={cn("text-sm font-medium leading-none", !notification.is_read && "text-primary")}>
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground pt-1">
                      {tryFormatDate(notification.created_at)}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="mt-2 h-1.5 w-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function tryFormatDate(dateString: string) {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: th });
  } catch (e) {
    return new Date(dateString).toLocaleDateString();
  }
}