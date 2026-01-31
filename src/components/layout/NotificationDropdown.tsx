import { useState, useEffect, useMemo } from "react";
import { 
  Bell, 
  Check, 
  UserPlus, 
  Handshake, 
  Info, 
  AlertTriangle, 
  XCircle, 
  Trash2 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePartnerships } from "@/hooks/usePartnerships";

// Define Unified Interface
interface UnifiedNotification {
  id: string;
  source: 'general' | 'partnership'; // ตัวแยกแหล่งที่มา
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  link?: string;     // เฉพาะ General
  reference_id?: string; // เฉพาะ Partnership
}

export function NotificationDropdown() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { 
    notifications: partNotis, 
    markAsRead: markPartRead, 
    markAllAsRead: markPartAllRead 
  } = usePartnerships();
  
  const [genNotis, setGenNotis] = useState<any[]>([]);
  const [open, setOpen] = useState(false);

  // --- 1. Fetch General Notifications (System/Stock) ---
  const fetchGeneralNotifications = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (data) setGenNotis(data);
  };

  useEffect(() => {
    if (!user) return;
    fetchGeneralNotifications();

    // Subscribe to General Notifications
    const channel = supabase
      .channel('general-noti-updates')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => fetchGeneralNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // --- 2. Merge & Sort Notifications ---
  const notifications: UnifiedNotification[] = useMemo(() => {
    // Map General
    const mappedGen = genNotis.map(n => ({
      ...n,
      source: 'general' as const
    }));

    // Map Partnership
    const mappedPart = partNotis.map(n => ({
      ...n,
      source: 'partnership' as const
    }));

    // Combine and Sort by Date (Newest first)
    return [...mappedGen, ...mappedPart].sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [genNotis, partNotis]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // --- 3. Handlers ---
  const handleNotificationClick = async (notification: UnifiedNotification) => {
    // Mark as read based on source
    if (!notification.is_read) {
      if (notification.source === 'partnership') {
        await markPartRead(notification.id);
      } else {
        // Optimistic Update for General
        setGenNotis(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
        await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);
      }
    }

    setOpen(false);

    // Navigation Logic
    if (notification.source === 'partnership') {
      if (notification.type === 'partnership_request') {
        navigate('/network?tab=requests');
      } else if (notification.type === 'partnership_accepted') {
        navigate('/network?tab=partners');
      } else if (notification.type === 'partnership_rejected') {
        navigate('/network?tab=discover'); // ถ้าโดนปฏิเสธ ให้ไปหน้า Discover เพื่อหาคนใหม่
      }
    } else {
      // General Link Navigation
      if (notification.link) {
         if (notification.link.startsWith('http')) window.location.href = notification.link;
         else navigate(notification.link);
      }
    }
  };

  const markAllAsRead = async () => {
    if (unreadCount === 0) return;
    
    // 1. Mark Partnership Read
    markPartAllRead();

    // 2. Mark General Read
    if (user) {
      setGenNotis(prev => prev.map(n => ({ ...n, is_read: true })));
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
    }
  };

  const clearAllNotifications = async () => {
    if (!user) return;
    setGenNotis([]);
    await supabase.from('notifications').delete().eq('user_id', user.id);
  };

  // --- 4. Helpers ---
  const getIcon = (n: UnifiedNotification) => {
    if (n.source === 'partnership') {
      switch (n.type) {
        case 'partnership_request': return <UserPlus className="h-4 w-4 text-blue-600" />;
        case 'partnership_accepted': return <Handshake className="h-4 w-4 text-green-600" />;
        case 'partnership_rejected': return <XCircle className="h-4 w-4 text-red-600" />;
        default: return <Bell className="h-4 w-4 text-primary" />;
      }
    } else {
      switch (n.type) {
        case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
        case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
        default: return <Info className="h-4 w-4 text-blue-500" />;
      }
    }
  };

  const getBgColor = (n: UnifiedNotification) => {
    if (n.is_read) return "hover:bg-muted/50";
    
    if (n.source === 'partnership') {
      switch (n.type) {
        case 'partnership_request': return "bg-blue-50/80 dark:bg-blue-900/20 hover:bg-blue-100/50";
        case 'partnership_accepted': return "bg-green-50/80 dark:bg-green-900/20 hover:bg-green-100/50";
        case 'partnership_rejected': return "bg-red-50/80 dark:bg-red-900/20 hover:bg-red-100/50";
        default: return "bg-muted/50";
      }
    } else {
      return n.type === 'critical' 
        ? "bg-red-50/80 dark:bg-red-900/20 hover:bg-red-100/50"
        : "bg-muted/50";
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
      
      <PopoverContent className="w-80 p-0 shadow-lg border-border/50" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30 backdrop-blur-sm">
          <h4 className="font-semibold text-sm">Notifications</h4>
          <div className="flex gap-1">
            {unreadCount > 0 && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-6 w-6 text-muted-foreground hover:text-primary"
                onClick={markAllAsRead}
                title="Mark all as read"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            )}
            {genNotis.length > 0 && (
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="h-6 w-6 text-muted-foreground hover:text-destructive"
                 onClick={clearAllNotifications}
                 title="Clear general notifications"
               >
                 <Trash2 className="h-3.5 w-3.5" />
               </Button>
            )}
          </div>
        </div>
        
        <ScrollArea className="h-[320px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-muted-foreground p-4">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No notifications</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {notifications.map((notification) => (
                <div 
                  key={`${notification.source}-${notification.id}`}
                  className={cn(
                    "flex gap-3 p-4 transition-colors cursor-pointer relative group",
                    getBgColor(notification)
                  )}
                  onClick={() => handleNotificationClick(notification)}
                >
                  {/* Icon Wrapper */}
                  <div className={cn(
                    "mt-1 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center border",
                    "bg-background border-border/60" 
                  )}>
                    {getIcon(notification)}
                  </div>

                  <div className="space-y-1 flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className={cn("text-sm font-medium leading-tight", !notification.is_read && "text-foreground")}>
                        {notification.title}
                      </p>
                      {!notification.is_read && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {notification.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 pt-1 flex items-center gap-1">
                      {tryFormatDate(notification.created_at)}
                      {notification.source === 'partnership' && (
                        <span className={cn(
                          "px-1 py-0.5 rounded text-[9px] font-medium ml-1",
                          notification.type === 'partnership_rejected' 
                            ? "bg-red-100 text-red-600 dark:bg-red-900/30" 
                            : "bg-primary/10 text-primary"
                        )}>
                          {notification.type === 'partnership_rejected' ? 'Rejected' : 'Partner'}
                        </span>
                      )}
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

function tryFormatDate(dateString: string) {
  try {
    return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: th });
  } catch (e) {
    return new Date(dateString).toLocaleDateString();
  }
}