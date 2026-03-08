import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

const PLAN_LIMITS: Record<string, number> = {
  free: 20,
  basic: 100,
  pro: 300,
  lifetime: 500,
  // legacy
  premium: 500,
};

export function useScanLimit() {
  const { user, userPlan } = useAuth();
  const [scanCount, setScanCount] = useState(0);
  const [resetDate, setResetDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const limit = PLAN_LIMITS[userPlan] ?? 20;
  const remaining = Math.max(0, limit - scanCount);
  const canScan = remaining > 0;

  const fetchUsage = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    // Reset if needed (server-side via security definer)
    await supabase.rpc("reset_scan_if_needed", { _user_id: user.id });

    const { data } = await supabase
      .from("scan_usage")
      .select("scan_count, reset_date")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setScanCount(data.scan_count);
      setResetDate(data.reset_date);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage, userPlan]);

  const logScan = async () => {
    if (!user) return false;

    // Increment via security definer function
    const { data: newCount, error } = await supabase.rpc("increment_scan_count", { _user_id: user.id });

    if (!error && newCount !== null) {
      setScanCount(newCount);
      // Also log to scan_logs for admin tracking
      await supabase.from("scan_logs").insert({ user_id: user.id });
      return true;
    }
    return false;
  };

  const daysUntilReset = resetDate
    ? Math.max(0, Math.ceil((new Date(resetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
    : 30;

  return {
    scanCount,
    limit,
    remaining,
    canScan,
    logScan,
    loading,
    planName: userPlan,
    daysUntilReset,
  };
}
