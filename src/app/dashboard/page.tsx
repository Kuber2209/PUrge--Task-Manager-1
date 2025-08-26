
'use client';

import { useAuth } from '@/hooks/use-auth';
import { Dashboard } from "@/app/dashboard/dashboard";
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // If auth checking is done and there is no user, redirect to login.
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // While the auth state is being checked, show a global loading indicator.
  if (loading) {
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
  }

  // After the initial load, if we have a user object, we can render the dashboard.
  // This prevents rendering an intermediate state where `loading` is false but `user` is not yet populated.
  if (user) {
    return (
        <main className="min-h-screen">
            <Dashboard />
        </main>
    );
  }
  
  // If `loading` is false and there is no `user`, the useEffect is handling the redirect.
  // Return a loading state or null to prevent rendering anything while redirecting.
  return <div className="flex min-h-screen items-center justify-center">Loading...</div>;
}
