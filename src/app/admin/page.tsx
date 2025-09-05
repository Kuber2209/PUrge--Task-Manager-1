
'use client';

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Header } from '@/components/dashboard/header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UserManagementTable } from '@/components/admin/user-management-table';
import { WhitelistManagement } from '@/components/admin/whitelist-management';

const ADMIN_EMAIL = 'f20240819@hyderabad.bits-pilani.ac.in';

export default function AdminPage() {
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
    return <div className="flex min-h-screen items-center justify-center">Verifying credentials...</div>;
  }

  // After the initial load, if the user is not the designated admin, deny access.
  if (user?.email !== ADMIN_EMAIL) {
    return (
      <div className="flex min-h-screen w-full flex-col">
        <Header />
        <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 text-center">
            <ShieldAlert className="h-16 w-16 text-destructive" />
            <h1 className="text-3xl font-bold font-headline">Access Denied</h1>
            <p className="text-muted-foreground">You do not have permission to view this page.</p>
            <Button onClick={() => router.push('/dashboard')}>Return to Dashboard</Button>
        </main>
      </div>
    );
  }

  // If we have an admin user, render the admin dashboard.
  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/20">
      <Header />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
            <h1 className="text-3xl font-bold font-headline mb-6">Admin Dashboard</h1>
            <div className="grid gap-6">
                <Card>
                    <CardHeader>
                        <CardTitle>User Role Management</CardTitle>
                        <CardDescription>Assign roles and manage user access. Changes are saved automatically.</CardDescription>
                    </CardHeader>
                    <CardContent>
                       <UserManagementTable />
                    </CardContent>
                </Card>
                 <Card>
                    <CardHeader>
                        <CardTitle>Whitelist Management</CardTitle>
                        <CardDescription>Control which email addresses are allowed to sign up.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <WhitelistManagement />
                    </CardContent>
                </Card>
            </div>
        </div>
      </main>
    </div>
  );
}
