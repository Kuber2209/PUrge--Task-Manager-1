
'use client';

import { useState, useEffect, useMemo } from 'react';
import type { User, Task } from '@/lib/types';
import { getUsers, getTasks } from '@/services/firestore';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Briefcase, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Skeleton } from '../ui/skeleton';

interface AllProfilesDashboardProps {
  currentUser: User;
}

export function AllProfilesDashboard({ currentUser }: AllProfilesDashboardProps) {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [allTasks, setAllTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
        getUsers(),
        getTasks()
    ]).then(([users, tasks]) => {
        setAllUsers(users);
        setAllTasks(tasks);
    }).finally(() => {
        setLoading(false);
    });
  }, []);

  const profilesToDisplay = useMemo(() => {
    if (currentUser.role === 'SPT') {
      return allUsers.filter(user => user.role === 'JPT' || user.role === 'Associate');
    }
    if (currentUser.role === 'JPT') {
      return allUsers.filter(user => user.role === 'Associate');
    }
    return [];
  }, [currentUser.role, allUsers]);
  
  if (currentUser.role === 'Associate') {
    return (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed shadow-sm h-64 bg-card">
            <h3 className="text-2xl font-bold tracking-tight font-headline">Access Denied</h3>
            <p className="text-sm text-muted-foreground">This view is not available for your role.</p>
        </div>
    );
  }

  if (loading) {
      return (
          <div>
            <Skeleton className="h-8 w-64 mb-4" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
                <Skeleton className="h-80 w-full" />
            </div>
          </div>
      )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold font-headline tracking-tight mb-4">Team Task Logs</h2>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {profilesToDisplay.map((user, index) => (
          <UserProfile key={user.id} user={user} allTasks={allTasks} index={index} />
        ))}
      </div>
    </div>
  );
}

function UserProfile({ user, allTasks, index }: { user: User, allTasks: Task[], index: number }) {
  const { completedTasks, inProgressTasks } = useMemo(() => {
      const assignedTasks = allTasks.filter(task => task.assignedTo.includes(user.id));
      return {
          completedTasks: assignedTasks.filter(task => task.status === 'Completed'),
          inProgressTasks: assignedTasks.filter(task => task.status !== 'Completed')
      }
  }, [user.id, allTasks])
  
  return (
    <Card 
      className="transition-all hover:shadow-lg flex flex-col task-card" 
      style={{animationDelay: `${index * 100}ms`}}
    >
      <CardHeader className="flex flex-row items-center gap-4">
        <Avatar className="h-12 w-12 transition-transform hover:scale-110">
          <AvatarImage src={user.avatar} alt={user.name} />
          <AvatarFallback>{user.name.slice(0, 2).toUpperCase()}</AvatarFallback>
        </Avatar>
        <div>
          <CardTitle className="font-headline">{user.name}</CardTitle>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            <Briefcase className="h-4 w-4" />{user.role}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 flex-grow">
        <div className="flex gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold">{completedTasks.length}</p>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{inProgressTasks.length}</p>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>
        </div>
        <div>
          <h4 className="font-semibold text-sm mb-2">Latest Completed Tasks:</h4>
          {completedTasks.length > 0 ? (
            <ul className="space-y-2">
              {completedTasks.slice(0, 3).map(task => (
                <li key={task.id} className="text-sm p-2 bg-secondary/50 rounded-md">
                  <p className="font-medium truncate">{task.title}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">No completed tasks yet.</p>
          )}
        </div>
      </CardContent>
      <CardFooter className="mt-auto">
        <Button asChild variant="secondary" className="w-full btn-bounce">
            <Link href={`/profile/${user.id}`}>
                View Profile <ArrowRight className="ml-2 h-4 w-4"/>
            </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
