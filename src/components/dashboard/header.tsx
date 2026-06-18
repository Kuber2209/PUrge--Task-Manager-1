
'use client';

import type { User } from '@/lib/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { LogOut, Shield } from 'lucide-react';
import Link from 'next/link';
import { ThemeToggle } from '../theme-toggle';
import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';

function LogoIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <defs>
        <linearGradient id="logo-grad-dashboard" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#329992" />
          <stop offset="100%" stopColor="#663399" />
        </linearGradient>
      </defs>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="url(#logo-grad-dashboard)" fill="url(#logo-grad-dashboard)" fillOpacity="0.15" strokeWidth="2" />
      <path d="m9 11 2 2 4-4" stroke="url(#logo-grad-dashboard)" strokeWidth="2.5" />
    </svg>
  );
}


export function Header() {
  const { user, logOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logOut();
    router.push('/login');
  };

  const isAdmin = user?.role === 'SPT';
  const isAdminPage = pathname === '/admin';
  
  return (
    <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-card px-4 md:px-8 z-30">
      <div className="flex items-center gap-8 max-w-7xl mx-auto w-full">
        <Link href="/dashboard" className="flex items-center gap-3">
          <LogoIcon className="h-6 w-6" />
          <h1 className="text-xl font-bold font-headline text-card-foreground hidden sm:block">PUrge BPHC</h1>
        </Link>
        <div className="ml-auto flex items-center gap-4">

          {user && (
            <div className="flex items-center gap-2">
              <Link href={`/profile/${user.id}`}>
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                </Avatar>
              </Link>
              <div className='hidden sm:flex flex-col text-left'>
                <span className="text-sm font-medium text-card-foreground">{user.name}</span>
                <span className="text-xs text-muted-foreground">{user.role}</span>
              </div>
            </div>
          )}

          {isAdmin && (
             <Button variant="ghost" size="icon" asChild>
               <Link href={isAdminPage ? "/dashboard" : "/admin"}>
                <Shield className="h-5 w-5" />
                <span className="sr-only">Admin</span>
              </Link>
            </Button>
          )}

          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-5 w-5" />
            <span className="sr-only">Logout</span>
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
