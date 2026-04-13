import { useState, useEffect, createContext, useContext, createElement } from "react";
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

    const fetchUserData = async (userId: string) => {
      try {
        const [{ data: roles }, { data: plan }] = await Promise.all([
          supabase.from("user_roles").select("role").eq("user_id", userId),
          supabase.from("user_plans").select("plan").eq("user_id", userId).single(),
        ]);
        if (!mounted) return;
        setIsAdmin(roles?.some((roleRow) => roleRow.role === "admin") ?? false);
        setUserPlan(plan?.plan ?? "free");
      } catch {
        if (!mounted) return;
        setIsAdmin(false);
        setUserPlan("free");
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (newSession?.user) {
          // Fire and forget
          fetchUserData(newSession.user.id);
        } else {
          setIsAdmin(false);
          setUserPlan("free");
        }
        setLoading(false);
      }
    );

    // THEN get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!mounted) return;
      setSession(s);
      setUser(s?.user ?? null);
      if (s?.user) {
        fetchUserData(s.user.id);
      }
      setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // Safety timeout
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = { user, session, loading, isAdmin, userPlan, signOut };

  return createElement(AuthContext.Provider, { value }, children);
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
