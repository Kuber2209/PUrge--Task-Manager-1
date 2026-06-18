"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import type { User as SupabaseAuthUser } from "@supabase/supabase-js";
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
  supabaseUser: SupabaseAuthUser | null;
  loading: boolean;
  logIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string, name: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  logOut: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * SESSION RESULT TYPES
 * - User object  → active user, let them in
 * - "pending"    → new signup, not whitelisted → show pending-approval page
 * - "blacklisted"→ rejected → show access-declined page
 * - "declined"   → admin manually declined → show access-declined page
 * - null         → something went wrong
 */
type SessionResult = User | "pending" | "blacklisted" | "declined" | "non-bits-email" | null;

async function fetchUserProfileWithRetry(
  sbUser: SupabaseAuthUser,
  retries = 3,
  delay = 2000,
): Promise<SessionResult> {
  const rawEmail = sbUser.email;
  if (!rawEmail) return null;

  const normalizedEmail = normalizeEmail(rawEmail);
  if (!normalizedEmail.endsWith('bits-pilani.ac.in')) {
    return "non-bits-email";
  }

  for (let i = 0; i < retries; i++) {
    try {

      // Run blacklist check, whitelist check, and profile fetch in parallel
      const [isBlacklisted, isWhitelisted, userProfile] = await Promise.all([
        isEmailBlacklisted(normalizedEmail),
        isEmailWhitelisted(normalizedEmail),
        getUserProfile(sbUser.id),
      ]);

      // ── 1. Blacklisted → always reject ────────────────────────────────────
      if (isBlacklisted) {
        await supabase.auth.signOut();
        return "blacklisted";
      }

      // ── 2. Existing profile in DB ──────────────────────────────────────────
      if (userProfile) {
        if (userProfile.status === "declined") {
          await supabase.auth.signOut();
          return "declined";
        }
        if (userProfile.status === "pending") {
          // Keep them signed in so /pending-approval can show their email
          return "pending";
        }
        // status === "active"
        return userProfile;
      }

      // ── 3. No profile yet — first time signing in ──────────────────────────
      const displayName =
        sbUser.user_metadata?.full_name ||
        sbUser.user_metadata?.name ||
        sbUser.user_metadata?.display_name ||
        "New User";

      const avatar =
        sbUser.user_metadata?.avatar_url ||
        sbUser.user_metadata?.picture ||
        `https://i.pravatar.cc/150?u=${sbUser.id}`;

      if (isWhitelisted) {
        // Whitelisted → create as active, let them straight in
        const newUser: User = {
          id: sbUser.id,
          name: displayName,
          email: normalizedEmail,
          role: "Associate",
          avatar,
          isOnHoliday: false,
          status: "active",
        };
        await createUserProfile(newUser);
        return newUser;
      } else {
        // Not whitelisted → create as pending → waitlist
        const pendingUser: User = {
          id: sbUser.id,
          name: displayName,
          email: normalizedEmail,
          role: "Associate",
          avatar,
          isOnHoliday: false,
          status: "pending",
        };
        await createUserProfile(pendingUser);
        return "pending";
      }
    } catch (error: any) {
      if (i < retries - 1) {
        console.warn(
          `DB error on attempt ${i + 1}/${retries}. Retrying in ${delay}ms…`,
          error,
        );
        await sleep(delay);
      } else {
        console.error("fetchUserProfileWithRetry: all retries failed", error);
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
    // Handle the initial session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        setSupabaseUser(session.user);
        await handleUserSession(session.user);
      }
      setLoading(false);
    });

    // Listen for subsequent auth state changes (login, logout, token refresh)
    // Skip INITIAL_SESSION — it's already handled by getSession() above
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "INITIAL_SESSION") return;
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
      const result = await fetchUserProfileWithRetry(sbUser);

      switch (result) {
        case "non-bits-email":
          await supabase.auth.signOut();
          setUser(null);
          setSupabaseUser(null);
          toast({
            variant: "destructive",
            title: "Access Denied",
            description: "Only BITS Pilani email addresses are allowed.",
          });
          router.replace("/login");
          break;

        case "blacklisted":
        case "declined":
          router.replace("/access-declined");
          break;

        case "pending":
          // User is signed in to Supabase Auth but their app profile is pending.
          // Keep them signed in so the page can show their email.
          // Set a minimal user object so the pending page can display the email.
          setUser({
            id: sbUser.id,
            name: sbUser.user_metadata?.full_name || "New User",
            email: normalizeEmail(sbUser.email || ""),
            role: "Associate",
            avatar: `https://i.pravatar.cc/150?u=${sbUser.id}`,
            isOnHoliday: false,
            status: "pending",
          });
          router.replace("/pending-approval");
          break;

        case null:
          await supabase.auth.signOut();
          setUser(null);
          setSupabaseUser(null);
          break;

        default:
          // Full active user object
          setUser(result);
          break;
      }
    } catch (error: any) {
      console.error("handleUserSession failed:", error);
      toast({
        variant: "destructive",
        title: "Login Failed",
        description:
          "Could not connect to the database. Check your internet connection and try again.",
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

  const signUp = async (email: string, pass: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: normalizeEmail(email),
      password: pass,
      options: {
        // Store name in auth metadata so fetchUserProfileWithRetry can use it
        data: { full_name: name },
      },
    });
    if (error) throw error;
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
