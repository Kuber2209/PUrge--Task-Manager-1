
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

  // While the auth state is being checked, show a global loading indicator.
  if (loading) {
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
  if (user) {
    return (
        <main className="min-h-screen">
            <Dashboard />
        </main>
    );
  }
  
  // If `loading` is false and there is still no `user`, the useEffect is handling the redirect.
  // Return a loading state to prevent rendering anything while redirecting.
  return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-muted-foreground">Redirecting...</p>
        </div>
      </div>
  );
}
