
'use client';

import React, {createContext, useContext, useState, useEffect, ReactNode} from 'react';
import {onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup, type User as FirebaseUser} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { User, UserRole } from '@/lib/types';
import { createUserProfile, getUserProfile } from '@/services/firestore';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string, name: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  logOut: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      console.log("onAuthStateChanged triggered");
      try {
        if (fbUser) {
          console.log("onAuthStateChanged: Firebase User found:", fbUser.uid, fbUser.email);
          setFirebaseUser(fbUser);
          
          let userProfile = await getUserProfile(fbUser.uid);
          console.log("onAuthStateChanged: Fetched user profile:", userProfile);

          if (userProfile) {
            setUser(userProfile);
          } else {
            console.log("onAuthStateChanged: No profile found for this user. Creating one.");
            const newUser: User = {
                id: fbUser.uid,
                name: fbUser.displayName || 'New User', // Name will be properly set on sign-up
                email: fbUser.email || '',
                role: 'Associate', 
                avatar: fbUser.photoURL || `https://i.pravatar.cc/150?u=${fbUser.uid}`,
            };
            await createUserProfile(newUser);
            setUser(newUser);
          }
        } else {
          console.log("onAuthStateChanged: No Firebase User found.");
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
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const fbUser = userCredential.user;

    const newUser: User = {
        id: fbUser.uid,
        name: name,
        email: fbUser.email || '',
        role: 'Associate',
        avatar: `https://i.pravatar.cc/150?u=${fbUser.uid}`,
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
