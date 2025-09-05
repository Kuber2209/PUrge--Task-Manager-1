
'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@/lib/types';
import { getUsers, updateUserProfile, addEmailToBlacklist } from '@/services/firestore';
import { useToast } from '@/hooks/use-toast';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Check, X } from 'lucide-react';

export function ApprovalQueue() {
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchPendingUsers = useCallback(async () => {
    setLoading(true);
    try {
      const users = await getUsers('pending');
      setPendingUsers(users);
    } catch (error) {
      console.error("Failed to fetch pending users:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not load pending users.' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  const handleApprove = async (userId: string) => {
    try {
      await updateUserProfile(userId, { status: 'active' });
      toast({ title: 'User Approved', description: 'The user can now access the app.' });
      fetchPendingUsers(); // Refresh the list
    } catch (error) {
      console.error("Failed to approve user:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not approve the user.' });
    }
  };

  const handleDecline = async (user: User) => {
    try {
      await updateUserProfile(user.id, { status: 'declined' });
      await addEmailToBlacklist(user.email);
      toast({ title: 'User Declined', description: 'The user has been declined and their email blacklisted.' });
      fetchPendingUsers(); // Refresh the list
    } catch (error) {
      console.error("Failed to decline user:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Could not decline the user.' });
    }
  };

  if (loading) {
    return <Skeleton className="h-24 w-full" />;
  }
  
  if (pendingUsers.length === 0) {
      return (
          <div className="text-center text-muted-foreground py-4">
              There are no pending user approvals.
          </div>
      )
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>User</TableHead>
            <TableHead>Email</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pendingUsers.map(user => (
            <TableRow key={user.id}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium">{user.name}</span>
                </div>
              </TableCell>
              <TableCell className="text-muted-foreground">{user.email}</TableCell>
              <TableCell className="text-right">
                <div className="flex gap-2 justify-end">
                    <Button size="sm" variant="outline" className="bg-green-500/10 hover:bg-green-500/20 text-green-700" onClick={() => handleApprove(user.id)}>
                        <Check className="h-4 w-4 mr-2" /> Approve
                    </Button>
                     <Button size="sm" variant="destructive" onClick={() => handleDecline(user)}>
                        <X className="h-4 w-4 mr-2" /> Decline
                    </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
