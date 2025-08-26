
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
    if (!currentUser) return;
    
    const requestPermission = async () => {
        if (!('Notification' in window)) {
            console.log("This browser does not support desktop notification");
            return;
        }

        if (Notification.permission === 'default') {
            console.log('Requesting notification permission...');
            const permission = await Notification.requestPermission();
            if (permission === 'granted') {
                await setupNotifications();
            }
        } else if (Notification.permission === 'granted') {
            await setupNotifications();
        } else {
             // User has explicitly denied permission. We won't bug them.
             // You could store a flag in localStorage to only ask once per session.
             console.log('Notification permission was previously denied.');
        }
    }
    
    const setupNotifications = async () => {
        if (!currentUser) return;
        try {
            const messaging = getMessaging(app);
            const currentToken = await getToken(messaging, { vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY });
            if (currentToken) {
                if (!currentUser.notificationTokens?.includes(currentToken)) {
                    await updateUserProfile(currentUser.id, { 
                        notificationTokens: arrayUnion(currentToken) 
                    });
                    toast({title: "Notifications Enabled!", description: "You'll now receive updates on this device."});
                }
            }
        } catch (err) {
            console.error("Error getting notification token", err);
            toast({ variant: 'destructive', title: "Notification Error", description: "Could not enable notifications. Check browser settings." });
        }
    };

    // Use a small timeout to let the page settle before asking for permission
    const timer = setTimeout(() => {
        requestPermission();
    }, 3000);

    return () => clearTimeout(timer);

  }, [currentUser, toast]);


  if (!currentUser) {
    return <div className="flex items-center justify-center min-h-screen">Loading user data...</div>
  }

  const isJPT = currentUser.role === 'JPT';
  const isSPT = currentUser.role === 'SPT';
  const isAssociate = currentUser.role === 'Associate';
  
  // Use a key on the Tabs component to force re-render when user changes, resetting the tab selection.
  const tabsKey = `${currentUser.id}-${currentUser.role}`;

  const defaultTab = 'announcements';

  return (
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Tabs defaultValue={defaultTab} className="w-full" key={tabsKey}>
           <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            
            {(isJPT || isSPT) && <TabsTrigger value="posted-tasks">My Posted Tasks</TabsTrigger>}
            
            {(isJPT || isAssociate) && <TabsTrigger value="available-tasks">Available Tasks</TabsTrigger>}
            
            {(isJPT || isAssociate) && <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>}
            
            {(isJPT || isSPT) && <TabsTrigger value="live-tasks">Live Tasks</TabsTrigger>}

            {(isJPT || isSPT) && <TabsTrigger value="team-logs">Team Logs</TabsTrigger>}
          </TabsList>

          <TabsContent value="announcements">
            <Announcements />
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

        </Tabs>
      </main>
    </div>
  );
}
