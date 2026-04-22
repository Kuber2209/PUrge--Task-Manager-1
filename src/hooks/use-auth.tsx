"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  type User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import type { User, UserRole } from "@/lib/types";
import {
  createUserProfile,
  getUserProfile,
  isEmailBlacklisted,
  isEmailWhitelisted,
} from "@/services/firestore";
import { toast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";

interface AuthContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  logIn: (email: string, pass: string) => Promise<any>;
  signUp: (email: string, pass: string, name: string) => Promise<any>;
  signInWithGoogle: () => Promise<any>;
  logOut: () => Promise<any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = "f20240819@hyderabad.bits-pilani.ac.in";
const normalizeEmail = (email: string) => email.trim().toLowerCase();

const handleBlacklistedAccess = async (email: string | null) => {
  if (!email) return;
  await signOut(auth);
};

// Helper function to pause execution, useful for retries
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Fetches the user profile from Firestore. If the user doesn't exist, it creates a new one.
 * Includes a retry mechanism to handle transient network issues on initial load.
 */
async function fetchUserProfileWithRetry(
  fbUser: FirebaseUser,
  retries = 3,
  delay = 2000,
): Promise<User | null | "blacklisted" | "denied"> {
  for (let i = 0; i < retries; i++) {
    try {
      const rawEmail = fbUser.email;
      if (!rawEmail) {
        await signOut(auth);
        return null;
      }

      const normalizedEmail = normalizeEmail(rawEmail);
      const isAdmin = normalizedEmail === ADMIN_EMAIL;

      // Check for blacklisted status on every attempt
      if ((await isEmailBlacklisted(normalizedEmail)) && !isAdmin) {
        await handleBlacklistedAccess(normalizedEmail);
        return "blacklisted";
      }

      const isWhitelisted = await isEmailWhitelisted(normalizedEmail);
      if (!isAdmin && !isWhitelisted) {
        await signOut(auth);
        return "denied";
      }

      let userProfile = await getUserProfile(fbUser.uid);

      if (userProfile) {
        if (!isAdmin && userProfile.status !== "active") {
          await signOut(auth);
          return "denied";
        }
        return userProfile; // User profile found, return it.
      }

      // --- New User Creation Flow ---
      const newUser: User = {
        id: fbUser.uid,
        name: fbUser.displayName || "New User",
        email: normalizedEmail,
        role: isAdmin ? "SPT" : "Associate",
        avatar: fbUser.photoURL || `https://i.pravatar.cc/150?u=${fbUser.uid}`,
        isOnHoliday: false,
        status: "active",
      };

      await createUserProfile(newUser);
      return newUser; // Return the newly created user.
    } catch (error: any) {
      // Only retry on the specific 'unavailable' (offline) error code from Firestore.
      if (error.code === "unavailable" && i < retries - 1) {
        console.warn(
          `Firestore offline, attempt ${i + 1} of ${retries}. Retrying in ${delay}ms...`,
        );
        await sleep(delay);
      } else {
        // For any other error, or on the final retry attempt, throw the error to be caught by the calling function.
        console.error(
          "Failed to fetch or create user profile after multiple retries:",
          error,
        );
        throw error;
      }
    }
  }
  return null; // Should be unreachable if retries > 0
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      if (fbUser) {
        try {
          setFirebaseUser(fbUser);
          const userProfile = await fetchUserProfileWithRetry(fbUser);

          if (userProfile === "blacklisted") {
            router.push("/access-declined");
          } else if (userProfile === "denied") {
            router.push("/access-declined");
          } else if (userProfile) {
            if (userProfile.status === "declined") {
              await signOut(auth);
              router.push("/access-declined");
            } else {
              setUser(userProfile);
            }
          } else {
            // This case handles a null return from the retry function, which implies a failure.
            await signOut(auth);
            setUser(null);
            setFirebaseUser(null);
          }
        } catch (error: any) {
          // This block catches the final error thrown by fetchUserProfileWithRetry
          console.error(
            "onAuthStateChanged: Final error after retries:",
            error,
          );
          toast({
            variant: "destructive",
            title: "Login Failed",
            description:
              "Could not connect to the database. Please check your internet connection and try again.",
          });
          await signOut(auth);
          setUser(null);
          setFirebaseUser(null);
        } finally {
          setLoading(false);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [router]);

  const logIn = async (email: string, pass: string) => {
    const normalizedEmail = normalizeEmail(email);
    const isAdmin = normalizedEmail === ADMIN_EMAIL;
    if ((await isEmailBlacklisted(normalizedEmail)) && !isAdmin) {
      throw new Error("This email has been blacklisted.");
    }
    if (!isAdmin && !(await isEmailWhitelisted(normalizedEmail))) {
      throw new Error(
        "Access denied. Your email is not approved for this app.",
      );
    }
    return signInWithEmailAndPassword(auth, normalizedEmail, pass);
  };

  const signUp = async (email: string, pass: string, name: string) => {
    const normalizedEmail = normalizeEmail(email);
    const isAdmin = normalizedEmail === ADMIN_EMAIL;
    if ((await isEmailBlacklisted(normalizedEmail)) && !isAdmin) {
      throw new Error(
        "This email has been blacklisted and cannot be used to sign up.",
      );
    }
    if (!isAdmin && !(await isEmailWhitelisted(normalizedEmail))) {
      throw new Error(
        "Access denied. Your email is not approved for this app.",
      );
    }

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      normalizedEmail,
      pass,
    );
    // onAuthStateChanged listener will handle profile creation.
  };

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;
      if (!email) {
        await signOut(auth);
        throw new Error("Could not read email from Google account.");
      }

      const normalizedEmail = normalizeEmail(email);
      const isAdmin = normalizedEmail === ADMIN_EMAIL;

      if ((await isEmailBlacklisted(normalizedEmail)) && !isAdmin) {
        await handleBlacklistedAccess(normalizedEmail);
        throw new Error("This email has been blacklisted.");
      }
      if (!isAdmin && !(await isEmailWhitelisted(normalizedEmail))) {
        await signOut(auth);
        throw new Error(
          "Access denied. Your email is not approved for this app.",
        );
      }
      // `onAuthStateChanged` will handle profile creation and redirection.
      return result;
    } catch (err: any) {
      // Rethrow the error to be caught by the UI
      throw err;
    }
  };

  const logOut = async () => {
    await signOut(auth);
    setUser(null);
    setFirebaseUser(null);
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
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
