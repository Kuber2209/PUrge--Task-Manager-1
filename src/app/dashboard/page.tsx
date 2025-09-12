
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
    // If auth is done checking and there's no user, redirect to the root
    // which will handle sending them to the login page.
    if (!loading && !user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // If loading, or if there's no user yet (and redirect is imminent), 
  // show a loading state to prevent a flash of unauthenticated content.
  if (loading || !user) {
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
