import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

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

    const { data: profiles } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("user_id", uid)
      .limit(1);
    const profile = profiles && profiles.length > 0 ? profiles[0] : null;

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
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || "Sign up failed") };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || "Sign in failed") };
    }
  };

  const signInWithGoogleAuth = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin + "/dashboard" },
    });
    if (error) throw new Error(error.message);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setRole(null);
    setOrganization(null);
  };

  const resetPasswordFn = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) return { error: new Error(error.message) };
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || "Reset password failed") };
    }
  };

  const updatePasswordFn = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) return { error: new Error(error.message) };
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
