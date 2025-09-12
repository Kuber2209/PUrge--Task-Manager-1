

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
import { arrayUnion, arrayRemove } from 'firebase/firestore';


export function Dashboard() {
  const { user: currentUser, setUser } = useAuth();
  const { toast } = useToast();
  
  useEffect(() => {
    if (!currentUser || typeof window === 'undefined' || !('serviceWorker' in navigator)) return;
    
    // This function handles the entire notification setup process
    const setupNotifications = async () => {
      try {
        const messaging = getMessaging(app);

        // 1. Request Permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          toast({
            title: "Notifications Disabled",
            description: "You won't receive updates when the app is closed.",
            variant: "destructive"
          });
          return;
        }

        // 2. Get Token
        const currentToken = await getToken(messaging, { 
          vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY 
        });

        if (currentToken) {
          // 3. Check if token is already on the user's profile
          if (!currentUser.notificationTokens?.includes(currentToken)) {
            // 4. If not, add it to the user's profile in Firestore
            await updateUserProfile(currentUser.id, {
              notificationTokens: arrayUnion(currentToken)
            });
            // Also update the local user object to prevent repeated writes
            setUser({ ...currentUser, notificationTokens: [...(currentUser.notificationTokens || []), currentToken] });

            toast({ title: "Notifications Enabled!", description: "You'll now receive updates on this device." });
          }
        } else {
          console.log('No registration token available. Request permission to generate one.');
          toast({
            title: "Could Not Get Notification Token",
            description: "Please ensure your browser settings allow notifications.",
            variant: "destructive"
          });
        }
      } catch (err) {
        console.error("An error occurred while setting up notifications:", err);
        // This is often a VAPID key issue or a browser-specific problem.
        toast({
          variant: 'destructive',
          title: "Notification Error",
          description: "Could not enable notifications. This might be due to a configuration issue or browser settings."
        });
      }
    };

    // Use a timer to ask for permission a few seconds after the page loads
    // This is less intrusive than an immediate popup.
    const timer = setTimeout(setupNotifications, 3000);

    return () => {
      clearTimeout(timer);
    };

  }, [currentUser, setUser, toast]);


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
           <div className='px-4 md:px-8 bg-header border-b border-border'>
             <div className="max-w-7xl mx-auto">
                <TabsList className="flex flex-wrap h-auto">
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
