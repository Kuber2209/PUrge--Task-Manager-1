"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { Session, User as SupabaseAuthUser } from "@supabase/supabase-js";
import type { User } from "@/lib/types";
import {
  createUserProfile,
  getUserProfile,
  isEmailBlacklisted,
  isEmailWhitelisted,
} from "@/services/db";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  /** The raw Supabase auth user (replaces the old firebaseUser). */
  supabaseUser: SupabaseAuthUser | null;
  loading: boolean;
  logIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string, name: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  logOut: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = "f20240819@hyderabad.bits-pilani.ac.in";
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches (or creates) the user's profile in Supabase.
 * Includes a retry mechanism for transient network issues.
 */
async function fetchUserProfileWithRetry(
  sbUser: SupabaseAuthUser,
  retries = 3,
  delay = 2000,
): Promise<User | null | "blacklisted" | "denied"> {
  for (let i = 0; i < retries; i++) {
    try {
      const rawEmail = sbUser.email;
      if (!rawEmail) {
        await supabase.auth.signOut();
        return null;
      }

      const normalizedEmail = normalizeEmail(rawEmail);
      const isAdmin = normalizedEmail === ADMIN_EMAIL;

      const [{ isBlacklisted, isWhitelisted }, userProfile] = await Promise.all([
        (async () => {
          if (isAdmin) return { isBlacklisted: false, isWhitelisted: true };
          const [bl, wl] = await Promise.all([
            isEmailBlacklisted(normalizedEmail),
            isEmailWhitelisted(normalizedEmail),
          ]);
          return { isBlacklisted: bl, isWhitelisted: wl };
        })(),
        getUserProfile(sbUser.id),
      ]);

      if (isBlacklisted) {
        await supabase.auth.signOut();
        return "blacklisted";
      }

      if (!isWhitelisted) {
        await supabase.auth.signOut();
        return "denied";
      }

      if (userProfile) {
        if (!isAdmin && userProfile.status !== "active") {
          await supabase.auth.signOut();
          return "denied";
        }
        return userProfile;
      }

      // ── New user creation ──────────────────────────────────────────────────
      const newUser: User = {
        id: sbUser.id,
        name:
          sbUser.user_metadata?.full_name ||
          sbUser.user_metadata?.name ||
          "New User",
        email: normalizedEmail,
        role: isAdmin ? "SPT" : "Associate",
        avatar:
          sbUser.user_metadata?.avatar_url ||
          sbUser.user_metadata?.picture ||
          `https://i.pravatar.cc/150?u=${sbUser.id}`,
        isOnHoliday: false,
        status: "active",
      };

      await createUserProfile(newUser);
      return newUser;
    } catch (error: any) {
      if (i < retries - 1) {
        console.warn(
          `DB error, attempt ${i + 1} of ${retries}. Retrying in ${delay}ms...`,
          error,
        );
        await sleep(delay);
      } else {
        console.error(
          "Failed to fetch or create user profile after multiple retries:",
          error,
        );
        throw error;
      }
    }
  }
  return null;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [supabaseUser, setSupabaseUser] = useState<SupabaseAuthUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Get the initial session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        await handleUserSession(session.user);
      }
      setLoading(false);
    });

    // Listen for auth state changes (login, logout, token refresh, OAuth callback)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setLoading(true);
      if (session?.user) {
        setSupabaseUser(session.user);
        await handleUserSession(session.user);
      } else {
        setSupabaseUser(null);
        setUser(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUserSession = async (sbUser: SupabaseAuthUser) => {
    try {
      const userProfile = await fetchUserProfileWithRetry(sbUser);

      if (userProfile === "blacklisted") {
        router.replace("/access-declined");
      } else if (userProfile === "denied") {
        router.replace("/access-declined");
      } else if (userProfile) {
        if (userProfile.status === "declined") {
          await supabase.auth.signOut();
          router.replace("/access-declined");
        } else {
          setUser(userProfile);
        }
      } else {
        await supabase.auth.signOut();
        setUser(null);
        setSupabaseUser(null);
      }
    } catch (error: any) {
      console.error("handleUserSession: Final error after retries:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description:
          "Could not connect to the database. Please check your internet connection and try again.",
      });
      await supabase.auth.signOut();
      setUser(null);
      setSupabaseUser(null);
    }
  };

  const logIn = async (email: string, pass: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizeEmail(email),
      password: pass,
    });
    if (error) throw error;
    return data;
  };

  const signUp = async (email: string, pass: string, _name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password: pass,
    });
    if (error) throw error;
    // onAuthStateChange listener handles profile creation.
    return data;
  };

  const signInWithGoogle = async () => {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw error;
    return data;
  };

  const logOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSupabaseUser(null);
  };

  const value: AuthContextType = {
    user,
    setUser,
    supabaseUser,
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
