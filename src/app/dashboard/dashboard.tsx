

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
import { getMessaging, getToken, deleteToken } from 'firebase/messaging';
import { app, firebaseConfig } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';
import { updateUserProfile } from '@/services/firestore';
import { arrayUnion, arrayRemove } from 'firebase/firestore';


export function Dashboard() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!currentUser || typeof window === 'undefined') return;

    const setupFcmToken = async () => {
        if (!currentUser) return;
        try {
            const messaging = getMessaging(app);
            
            // First, delete any old token to force a refresh.
            // This helps if the token is stale or permissions changed.
            const oldToken = await getToken(messaging).catch(() => null);
            if (oldToken) {
              await deleteToken(messaging);
              // Also remove it from the user's profile in Firestore
              await updateUserProfile(currentUser.id, {
                  notificationTokens: arrayRemove(oldToken)
              });
            }

            // Now request permission and get a new token
            if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
                console.log("This browser does not support desktop notification");
                return;
            }

            console.log('Requesting notification permission...');
            const permission = await Notification.requestPermission();

            if (permission === 'granted') {
                if (!firebaseConfig.vapidKey || firebaseConfig.vapidKey === 'REPLACE_WITH_YOUR_VAPID_KEY_FROM_FIREBASE_CONSOLE') {
                   console.error("VAPID key is not configured in src/lib/firebase.ts. Notifications will fail.");
                   toast({ variant: 'destructive', title: "Configuration Error", description: "VAPID Key for notifications is missing." });
                   return;
                }
                const newServiceWorker = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                const newToken = await getToken(messaging, { vapidKey: firebaseConfig.vapidKey, serviceWorkerRegistration: newServiceWorker });

                if (newToken) {
                    if (!currentUser.notificationTokens?.includes(newToken)) {
                        await updateUserProfile(currentUser.id, { 
                            notificationTokens: arrayUnion(newToken) 
                        });
                        toast({title: "Notifications Enabled!", description: "You'll now receive updates on this device."});
                    }
                } else {
                     console.log('No registration token available after permission grant.');
                }
            } else {
                 console.log('User denied notification permission.');
            }
        } catch (err: any) {
            console.error("Error setting up notification token", err);
            // Provide a more specific error message if the VAPID key is the issue.
            if (err.message.includes("applicationServerKey")) {
               toast({ variant: 'destructive', title: "Notification Error", description: "The VAPID key is invalid. Please check your Firebase configuration." });
            } else {
               toast({ variant: 'destructive', title: "Notification Error", description: "Could not enable notifications. Check browser settings." });
            }
        }
    };

    const timer = setTimeout(() => {
        setupFcmToken();
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
           <div className='px-4 md:px-8 bg-card border-b border-border sticky top-16 z-20'>
             <div className="max-w-7xl mx-auto overflow-x-auto">
                <TabsList className="h-auto">
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
