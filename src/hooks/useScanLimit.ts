import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const PLAN_LIMITS: Record<string, number> = {
  free: 1,
  basic: 10,
  premium: 99,
};

export function useScanLimit() {
  const { user, userPlan } = useAuth();
  const [scansToday, setScansToday] = useState(0);
  const [loading, setLoading] = useState(true);

  const limit = PLAN_LIMITS[userPlan] ?? 1;
  const remaining = Math.max(0, limit - scansToday);
  const canScan = remaining > 0;

  const fetchScansToday = async () => {
    if (!user) return;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { count } = await supabase
      .from("scan_logs")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("scanned_at", today.toISOString());

    setScansToday(count ?? 0);
    setLoading(false);
  };

  useEffect(() => {
    fetchScansToday();
  }, [user, userPlan]);

  const logScan = async () => {
    if (!user) return false;
    const { error } = await supabase
      .from("scan_logs")
      .insert({ user_id: user.id });
    if (!error) {
      setScansToday((prev) => prev + 1);
      return true;
    }
    return false;
  };

  return { scansToday, limit, remaining, canScan, logScan, loading, planName: userPlan };
}
