
'use client';

import { useState, useEffect } from 'react';
import type { User, Notification as NotificationType } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Bell, Briefcase, Megaphone, MessageSquare, CheckCircle2, FileUp, Replace, LogOut, Loader2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import Link from 'next/link';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '../theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '@/services/firestore';
import { getMessaging, onMessage } from 'firebase/messaging';
import { app } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export function Header() {
  const { user, logOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [notifications, setNotifications] = useState<NotificationType[]>([]);
  const [visibleCount, setVisibleCount] = useState(5);
  const [totalNotifications, setTotalNotifications] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);


  useEffect(() => {
      if (!user) return;
      // Initial fetch of notifications
      const unsubscribe = getNotifications(user.id, (data) => {
          setNotifications(data.notifications);
          setTotalNotifications(data.totalCount);
      }, visibleCount);

      return () => unsubscribe();
  }, [user, visibleCount]);
  
  // Listen for foreground messages
  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
        const messaging = getMessaging(app);
        const unsubscribe = onMessage(messaging, (payload) => {
            console.log('Foreground message received.', payload);
            toast({
                title: payload.notification?.title,
                description: payload.notification?.body,
            });
             // A simple refresh could work, or a more sophisticated update
             setVisibleCount(5); // Reset to show latest
        });
        return () => unsubscribe();
    }
  }, [toast]);


  const unreadCount = notifications.filter(n => !n.read).length; // This is unread count of *visible* notifications

  const handleNotificationClick = async (notificationId: string) => {
    await markNotificationAsRead(notificationId);
  }

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    await markAllNotificationsAsRead(user.id);
  }

  const handleLogout = async () => {
    await logOut();
    router.push('/login');
  };
  
  const handleLoadMore = () => {
      setIsLoadingMore(true);
      setVisibleCount(prev => prev + 5);
      // The useEffect will re-fetch with the new limit
      setTimeout(() => setIsLoadingMore(false), 500); // Simulate loading
  }

  return (
    <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-6 z-10">
      <Link href="/dashboard" className="flex items-center gap-3">
        <Briefcase className="h-6 w-6 text-primary" />
        <h1 className="text-xl font-bold font-headline text-foreground">PUrge BPHC</h1>
      </Link>
      <div className="ml-auto flex items-center gap-4">

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative hover:bg-yellow-500/10">
              <Bell className="h-5 w-5 text-yellow-500" />
              {unreadCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center p-0">{unreadCount}</Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <div className="p-4 border-b flex justify-between items-center">
                <h4 className="font-medium">Notifications</h4>
                {unreadCount > 0 && <Button variant="link" size="sm" className="h-auto p-0" onClick={handleMarkAllAsRead}>Mark all as read</Button>}
            </div>
            <div className="max-h-80 overflow-y-auto">
                {notifications.length > 0 ? (
                    notifications.map(notif => <NotificationItem key={notif.id} notification={notif} onClick={handleNotificationClick}/>)
                ) : (
                    <p className="text-center text-sm text-muted-foreground p-4">No new notifications</p>
                )}
            </div>
             {totalNotifications > visibleCount && (
                <div className="p-2 border-t">
                    <Button variant="secondary" className="w-full" onClick={handleLoadMore} disabled={isLoadingMore}>
                        {isLoadingMore ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Load More'}
                    </Button>
                </div>
             )}
          </PopoverContent>
        </Popover>

        {user && (
          <div className="flex items-center gap-2">
             <Link href={`/profile/${user.id}`}>
              <Avatar className="h-8 w-8">
                <AvatarImage src={user.avatar} alt={user.name} />
                <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
              </Avatar>
            </Link>
            <div className='hidden sm:flex flex-col text-left'>
              <span className="text-sm font-medium">{user.name}</span>
              <span className="text-xs text-muted-foreground">{user.role}</span>
            </div>
          </div>
        )}

        <Button variant="ghost" size="icon" onClick={handleLogout}>
          <LogOut className="h-5 w-5" />
          <span className="sr-only">Logout</span>
        </Button>
      </div>
      <ThemeToggle />
    </header>
  );
}


function NotificationItem({ notification, onClick }: { notification: NotificationType; onClick: (id: string) => void }) {
  const icons: {[key: string]: React.ReactNode} = {
    announcement: <Megaphone className="h-4 w-4 text-accent" />,
    task: <CheckCircle2 className="h-4 w-4 text-primary" />,
    chat: <MessageSquare className="h-4 w-4 text-blue-500" />,
    document: <FileUp className="h-4 w-4 text-green-500" />,
    transfer: <Replace className="h-4 w-4 text-orange-500" />,
    unassign: <Replace className="h-4 w-4 text-orange-500" />,
  };
  
  return (
    <Link
      href={notification.link}
      onClick={() => onClick(notification.id)}
      className={cn(
        "block p-3 rounded-lg hover:bg-muted/50 transition-colors",
        !notification.read && "bg-primary/5"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-1">{icons[notification.type] || <Bell className="h-4 w-4" />}</div>
        <div className="flex-1">
          <p className="text-sm font-medium">{notification.title}</p>
          <p className="text-xs text-muted-foreground">{notification.description}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>
        </div>
        {!notification.read && (
            <div className="mt-1 h-2 w-2 rounded-full bg-primary" aria-label="Unread"></div>
        )}
      </div>
    </Link>
  );
}
