import { useState, useEffect, createContext, useContext } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  userPlan: string;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");

  useEffect(() => {
    let mounted = true;

    // Safety timeout - never stay loading forever
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        console.warn("[useAuth] Auth timeout - forcing loading=false");
        setLoading(false);
      }
    }, 5000);

    const fetchUserData = async (userId: string) => {
      try {
        const [{ data: roles }, { data: plan }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", userId),
          supabase.from("user_plans").select("plan").eq("user_id", userId).single(),
        ]);
        if (!mounted) return;
        setIsAdmin(roles?.some((r: any) => r.role === "admin") ?? false);
        setUserPlan(plan?.plan ?? "free");
      } catch (e) {
        console.error("Failed to fetch user data:", e);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("[useAuth] onAuthStateChange:", _event, !!session);
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchUserData(session.user.id);
        } else {
          setIsAdmin(false);
          setUserPlan("free");
        }
        // Also set loading false here in case getSession is slow
        if (mounted) setLoading(false);
      }
    );

    // THEN get initial session
    console.log("[useAuth] calling getSession...");
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[useAuth] getSession resolved:", !!session);
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchUserData(session.user.id);
      }
      setLoading(false);
    }).catch((err) => {
      console.error("[useAuth] getSession failed:", err);
      if (mounted) setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = { user, session, loading, isAdmin, userPlan, signOut };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
