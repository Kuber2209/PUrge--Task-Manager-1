

'use client';

import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import {onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, type User as FirebaseUser} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User, UserRole } from '@/lib/types';
import { createUserProfile, getUserProfile, isEmailBlacklisted, isEmailWhitelisted } from '@/services/firestore';
import { toast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string, name: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  logOut: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const handleBlacklistedAccess = async (email: string | null) => {
    if (!email) return;
    await signOut(auth);
    toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: `The email ${email} is on the blacklist.`,
        duration: 5000,
    });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          setFirebaseUser(fbUser);
          
          if (fbUser.email && await isEmailBlacklisted(fbUser.email)) {
            await handleBlacklistedAccess(fbUser.email);
            setLoading(false);
            router.push('/access-declined');
            return;
          }

          let userProfile = await getUserProfile(fbUser.uid);

          if (userProfile) {
            // Existing user
            if (userProfile.status === 'pending') {
              router.push('/pending-approval');
            } else if (userProfile.status === 'declined') {
               await signOut(auth);
               router.push('/access-declined');
            } else {
               // Active or undefined status (for existing users) is allowed
               setUser(userProfile);
            }
          } else {
             // This is a new user
             if (!fbUser.email) {
                setLoading(false);
                return;
             }

            const isWhitelisted = await isEmailWhitelisted(fbUser.email);

            const newUser: User = {
                id: fbUser.uid,
                name: fbUser.displayName || 'New User',
                email: fbUser.email,
                role: 'Associate', 
                avatar: fbUser.photoURL || `https://i.pravatar.cc/150?u=${fbUser.uid}`,
                isOnHoliday: false,
                status: isWhitelisted ? 'active' : 'pending',
            };
            await createUserProfile(newUser);
            setUser(newUser);
            
            if (newUser.status === 'pending') {
                router.push('/pending-approval');
            }
          }
        } else {
          setFirebaseUser(null);
          setUser(null);
        }
      } catch (error) {
        console.error("onAuthStateChanged: Error processing auth state:", error);
        setUser(null); 
        setFirebaseUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const logIn = async (email: string, pass: string) => {
     if (await isEmailBlacklisted(email)) {
        toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'This email is on the blacklist.',
        });
        throw new Error("Email is blacklisted");
    }
    return signInWithEmailAndPassword(auth, email, pass);
  };
  
  const signUp = async (email: string, pass:string, name: string) => {
    if (await isEmailBlacklisted(email)) {
        toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'This email is on the blacklist.',
        });
        throw new Error("Email is blacklisted");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    // onAuthStateChanged will handle the rest of the profile creation and redirection
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const email = result.user.email;
     if (email && await isEmailBlacklisted(email)) {
        await signOut(auth); // Sign out immediately
        toast({
            variant: 'destructive',
            title: 'Access Denied',
            description: 'This email is on the blacklist.',
        });
        throw new Error("Email is blacklisted");
    }
    // onAuthStateChanged will handle the rest
    return result;
  }

  const logOut = () => {
    router.push('/login');
    return signOut(auth);
  };


  const value = {
    user,
    setUser,
    firebaseUser,
    loading,
    logIn,
    signUp,
    signInWithGoogle,
    logOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
