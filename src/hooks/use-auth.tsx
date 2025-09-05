

'use client';

import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import {onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, type User as FirebaseUser} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User, UserRole } from '@/lib/types';
import { createUserProfile, getUserProfile, isEmailWhitelisted } from '@/services/firestore';
import { toast } from '@/hooks/use-toast';

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

const handleUnauthorizedAccess = async (email: string | null) => {
    await signOut(auth);
    toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: `The email ${email} is not authorized. Please contact an admin.`,
        duration: 5000,
    });
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      try {
        if (fbUser) {
          setFirebaseUser(fbUser);
          
          let userProfile = await getUserProfile(fbUser.uid);

          if (userProfile) {
            setUser(userProfile);
          } else {
             // This is a new user (or first-time login via Google)
            const isWhitelisted = await isEmailWhitelisted(fbUser.email || '');

            if (!isWhitelisted) {
                await handleUnauthorizedAccess(fbUser.email);
                return;
            }

            const newUser: User = {
                id: fbUser.uid,
                name: fbUser.displayName || 'New User',
                email: fbUser.email || '',
                role: 'Associate', 
                avatar: fbUser.photoURL || `https://i.pravatar.cc/150?u=${fbUser.uid}`,
                isOnHoliday: false,
            };
            await createUserProfile(newUser);
            setUser(newUser);
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
  }, []);

  const logIn = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };
  
  const signUp = async (email: string, pass:string, name: string) => {
    const isWhitelisted = await isEmailWhitelisted(email);
    if (!isWhitelisted) {
        toast({
            variant: 'destructive',
            title: 'Unauthorized Email',
            description: 'This email is not on the whitelist. Please contact an administrator.',
        });
        throw new Error("Email not whitelisted");
    }

    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const fbUser = userCredential.user;

    const newUser: User = {
        id: fbUser.uid,
        name: name,
        email: fbUser.email || '',
        role: 'Associate',
        avatar: `https://i.pravatar.cc/150?u=${fbUser.uid}`,
        isOnHoliday: false,
    };
    await createUserProfile(newUser);
    setUser(newUser); // Set user immediately after creation
  };

  const signInWithGoogle = () => {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }

  const logOut = () => {
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
