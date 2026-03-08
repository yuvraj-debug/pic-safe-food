import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userPlan, setUserPlan] = useState<string>("free");

  useEffect(() => {
    let mounted = true;

    const fetchUserData = async (userId: string) => {
      const [{ data: roles }, { data: plan }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", userId),
        supabase.from("user_plans").select("plan").eq("user_id", userId).single(),
      ]);
      if (!mounted) return;
      setIsAdmin(roles?.some((r: any) => r.role === "admin") ?? false);
      setUserPlan(plan?.plan ?? "free");
    };

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        try {
          await fetchUserData(session.user.id);
        } catch (e) {
          console.error("Failed to fetch user data:", e);
        }
      }
      if (mounted) setLoading(false);
    }).catch((err) => {
      console.error("Failed to get session:", err);
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          await fetchUserData(session.user.id);
        } else {
          setIsAdmin(false);
          setUserPlan("free");
        }
        if (mounted) setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return { user, session, loading, isAdmin, userPlan, signOut };
}
