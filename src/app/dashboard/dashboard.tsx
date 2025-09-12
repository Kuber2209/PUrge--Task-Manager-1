

'use client';

import { useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Header } from '@/components/dashboard/header';
import { JptDashboard } from '@/components/dashboard/jpt-dashboard';
import { AssociateDashboard } from '@/components/dashboard/associate-dashboard';
import { AllProfilesDashboard } from '@/components/dashboard/all-profiles-dashboard';
import { MyTasksDashboard } from '@/components/dashboard/my-tasks-dashboard';
import { Announcements } from '@/components/dashboard/announcements';
import { OngoingTasksDashboard } from '@/components/dashboard/ongoing-tasks-dashboard';
import { CalendarView } from '@/components/dashboard/calendar-view';
import { Resources } from '@/components/dashboard/resources';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getMessaging, getToken } from 'firebase/messaging';
import { app } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/services/firestore';
import { arrayUnion } from 'firebase/firestore';


export function Dashboard() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!currentUser || typeof window === 'undefined') return;

    const setupNotifications = async () => {
      // 1. Check for browser support
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.log("Push notifications are not supported by this browser.");
        return;
      }

      try {
        const messaging = getMessaging(app);

        // 2. Request permission
        if (Notification.permission === 'default') {
          console.log('Requesting notification permission...');
          const permission = await Notification.requestPermission();
          if (permission !== 'granted') {
            console.log('User denied notification permission.');
            return;
          }
        }

        if (Notification.permission === 'denied') {
          console.log('Notification permission has been denied.');
          return;
        }

        // 3. Get token
        console.log('Getting FCM token...');
        const currentToken = await getToken(messaging, {
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
        });

        // 4. Save token to Firestore
        if (currentToken) {
          console.log('FCM Token received:', currentToken);
          if (!currentUser.notificationTokens?.includes(currentToken)) {
            console.log('Saving new token to user profile...');
            await updateUserProfile(currentUser.id, {
              notificationTokens: arrayUnion(currentToken),
            });
            toast({
              title: "Notifications Enabled!",
              description: "You'll now receive updates on this device.",
            });
          } else {
            console.log('This device token is already saved.');
          }
        } else {
          console.log('No registration token available. Request permission to generate one.');
        }
      } catch (err) {
        console.error("An error occurred while setting up notifications:", err);
        let description = "Could not enable notifications.";
        if (err instanceof Error && err.message.includes('permission-blocked')) {
            description = "Notification permission is blocked. Please enable it in your browser settings.";
        }
        toast({
          variant: 'destructive',
          title: "Notification Setup Failed",
          description: description,
        });
      }
    };
    
    // Delay setup slightly to ensure everything is loaded
    const timer = setTimeout(() => {
      setupNotifications();
    }, 3000);

    return () => clearTimeout(timer);

  }, [currentUser, toast]);


  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen">Loading user data...</div>
  }

  const isJPT = currentUser.role === 'JPT';
  const isSPT = currentUser.role === 'SPT';
  const isAssociate = currentUser.role === 'Associate';
  
  const tabsKey = `${currentUser.id}-${currentUser.role}`;
  const defaultTab = 'announcements';

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground">
      <Header />
      <main className="flex flex-1 flex-col">
        <Tabs defaultValue={defaultTab} className="w-full flex flex-col" key={tabsKey}>
           <div className='px-4 md:px-8 bg-card border-b border-border'>
             <div className="max-w-7xl mx-auto">
                <TabsList className="flex flex-wrap h-auto justify-start overflow-x-auto">
                    <TabsTrigger value="announcements">Announcements</TabsTrigger>
                    <TabsTrigger value="resources">Resources</TabsTrigger>
                    <TabsTrigger value="calendar">Calendar</TabsTrigger>
                    
                    {(isJPT || isSPT) && <TabsTrigger value="posted-tasks">My Posted Tasks</TabsTrigger>}
                    
                    {(isJPT || isAssociate) && <TabsTrigger value="available-tasks">Available Tasks</TabsTrigger>}
                    
                    {(isJPT || isAssociate) && <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>}
                    
                    {(isJPT || isSPT) && <TabsTrigger value="live-tasks">Live Tasks</TabsTrigger>}

                    {(isJPT || isSPT) && <TabsTrigger value="team-logs">Team Logs</TabsTrigger>}
                </TabsList>
             </div>
           </div>
           
           <div className="p-4 md:p-8 flex-1">
             <div className="max-w-7xl mx-auto">
                <TabsContent value="announcements">
                  <Announcements />
                </TabsContent>
                <TabsContent value="resources">
                  <Resources />
                </TabsContent>
                <TabsContent value="calendar">
                  <CalendarView />
                </TabsContent>
                
                {(isJPT || isSPT) && (
                  <TabsContent value="posted-tasks">
                    <JptDashboard />
                  </TabsContent>
                )}

                {(isJPT || isAssociate) && (
                  <TabsContent value="available-tasks">
                      <AssociateDashboard />
                    </TabsContent>
                )}

                {(isJPT || isAssociate) && (
                  <TabsContent value="my-tasks">
                      <MyTasksDashboard />
                    </TabsContent>
                )}

                {(isJPT || isSPT) && (
                  <TabsContent value="live-tasks">
                    <OngoingTasksDashboard />
                  </TabsContent>
                )}

                {(isJPT || isSPT) && (
                  <TabsContent value="team-logs">
                    <AllProfilesDashboard currentUser={currentUser} />
                  </TabsContent>
                )}
             </div>
           </div>
        </Tabs>
      </main>
    </div>
  );
}
