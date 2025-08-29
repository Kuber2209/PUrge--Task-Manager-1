
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
    
    const requestPermissionAndSetupNotifications = async () => {
        if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
            console.log("This browser does not support desktop notification");
            return;
        }

        if (Notification.permission === 'default') {
            console.log('Requesting notification permission...');
            try {
                const permission = await Notification.requestPermission();
                if (permission === 'granted') {
                    await setupFcmToken();
                } else {
                    console.log('User denied notification permission.');
                }
            } catch (err) {
                console.error('Error requesting notification permission', err);
            }
        } else if (Notification.permission === 'granted') {
            await setupFcmToken();
        }
    }
    
    const setupFcmToken = async () => {
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
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }
        } catch (err) {
            console.error("Error getting notification token", err);
            toast({ variant: 'destructive', title: "Notification Error", description: "Could not enable notifications. Check browser settings." });
        }
    };

    const timer = setTimeout(() => {
        requestPermissionAndSetupNotifications();
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
    <div className="flex min-h-screen w-full flex-col">
      <Header />
      <main className="flex flex-1 flex-col gap-4 p-4 md:gap-8 md:p-8">
        <Tabs defaultValue={defaultTab} className="w-full" key={tabsKey}>
           <TabsList className="h-auto flex-wrap justify-start">
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            
            {(isJPT || isSPT) && <TabsTrigger value="posted-tasks">My Posted Tasks</TabsTrigger>}
            
            {(isJPT || isAssociate) && <TabsTrigger value="available-tasks">Available Tasks</TabsTrigger>}
            
            {(isJPT || isAssociate) && <TabsTrigger value="my-tasks">My Tasks</TabsTrigger>}
            
            {(isJPT || isSPT) && <TabsTrigger value="live-tasks">Live Tasks</TabsTrigger>}

            {(isJPT || isSPT) && <TabsTrigger value="team-logs">Team Logs</TabsTrigger>}
          </TabsList>

          <TabsContent value="announcements">
            <Announcements />
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

        </Tabs>
      </main>
    </div>
  );
}
