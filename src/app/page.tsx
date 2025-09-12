
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      // Still checking auth state, do nothing.
      return;
    }

    if (user) {
      // We have a user object, decide where to send them.
      if (user.status === 'pending') {
        router.push('/pending-approval');
      } else if (user.status === 'declined') {
        router.push('/access-declined');
      } else {
        // User is active or has an undefined status (legacy users), send to dashboard.
        router.push('/dashboard');
      }
    } else {
      // No user, not loading, send to login.
      router.push('/login');
    }
  }, [user, loading, router]);

  // Render a full-page loading indicator while the logic runs.
  return (
    <div className="flex h-screen items-center justify-center bg-background">
       <div className="flex flex-col items-center gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-muted-foreground">Initializing...</p>
      </div>
    </div>
  );
}
