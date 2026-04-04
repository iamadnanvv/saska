import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  sendPasswordResetEmail,
  confirmPasswordReset,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  signOut as firebaseSignOut,
  updatePassword as firebaseUpdatePassword,
} from "firebase/auth";
import { firebaseAuth } from "@/lib/firebase";

type AppRole = "admin" | "manager" | "agent";

type Organization = {
  id: string;
  name: string;
  logo_url: string | null;
  brand_primary_color: string | null;
  brand_secondary_color: string | null;
  brand_font: string | null;
  website: string | null;
  phone: string | null;
  address: string | null;
  industry: string | null;
};

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  role: AppRole | null;
  organization: Organization | null;
  signUp: (email: string, password: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  refreshOrg: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const googleProvider = new GoogleAuthProvider();

async function bridgeFirebaseToSupabase(idToken: string) {
  const { data, error } = await supabase.functions.invoke("firebase-auth-bridge", {
    body: { idToken },
  });
  if (error) throw new Error(error.message || "Auth bridge failed");
  if (data?.error) throw new Error(data.error);
  return data.session as { access_token: string; refresh_token: string };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<AppRole | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);

  const loadUserMeta = async (uid: string) => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", uid)
      .limit(1);
    if (roles && roles.length > 0) {
      setRole(roles[0].role as AppRole);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("user_id", uid)
      .single();

    if (profile?.org_id) {
      const { data: org } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.org_id)
        .single();
      if (org) setOrganization(org as Organization);
    }
  };

  const refreshOrg = async () => {
    if (user) await loadUserMeta(user.id);
  };

  useEffect(() => {
    // Listen to Supabase auth state (session persistence)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => loadUserMeta(session.user.id), 0);
      } else {
        setRole(null);
        setOrganization(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadUserMeta(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      // Create user in Firebase
      const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      const idToken = await cred.user.getIdToken();

      // Bridge to Supabase (creates user + returns session)
      const bridgeSession = await bridgeFirebaseToSupabase(idToken);

      // Set Supabase session (triggers onAuthStateChange)
      await supabase.auth.setSession({
        access_token: bridgeSession.access_token,
        refresh_token: bridgeSession.refresh_token,
      });

      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || "Sign up failed") };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      // Sign in with Firebase
      const cred = await signInWithEmailAndPassword(firebaseAuth, email, password);
      const idToken = await cred.user.getIdToken();

      // Bridge to Supabase
      const bridgeSession = await bridgeFirebaseToSupabase(idToken);

      await supabase.auth.setSession({
        access_token: bridgeSession.access_token,
        refresh_token: bridgeSession.refresh_token,
      });

      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || "Sign in failed") };
    }
  };

  const signInWithGoogleAuth = async () => {
    const cred = await signInWithPopup(firebaseAuth, googleProvider);
    const idToken = await cred.user.getIdToken();

    const bridgeSession = await bridgeFirebaseToSupabase(idToken);

    await supabase.auth.setSession({
      access_token: bridgeSession.access_token,
      refresh_token: bridgeSession.refresh_token,
    });
  };

  const handleSignOut = async () => {
    await firebaseSignOut(firebaseAuth);
    await supabase.auth.signOut();
    setRole(null);
    setOrganization(null);
  };

  const resetPasswordFn = async (email: string) => {
    try {
      await sendPasswordResetEmail(firebaseAuth, email, {
        url: `${window.location.origin}/reset-password`,
        handleCodeInApp: false,
      });
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || "Reset password failed") };
    }
  };

  const updatePasswordFn = async (password: string) => {
    try {
      const currentUser = firebaseAuth.currentUser;
      if (!currentUser) throw new Error("No authenticated user");
      await firebaseUpdatePassword(currentUser, password);
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || "Update password failed") };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        role,
        organization,
        signUp,
        signIn,
        signInWithGoogle: signInWithGoogleAuth,
        signOut: handleSignOut,
        resetPassword: resetPasswordFn,
        updatePassword: updatePasswordFn,
        refreshOrg,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
