
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Dashboard } from "@/app/dashboard/dashboard";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login');
    } else if (!loading && user && user.status === 'pending') {
      router.replace('/pending-approval');
    } else if (!loading && user && user.status === 'declined') {
      router.replace('/access-declined');
    }
  }, [user, loading, router]);

  const isActiveUser = user && user.status === 'active';

  if (loading || !isActiveUser) {
    return (
       <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  // After loading, if we have a user object, we can render the dashboard.
  return (
      <main className="min-h-screen">
          <Dashboard />
      </main>
  );
}
