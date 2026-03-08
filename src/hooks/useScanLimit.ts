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
  const [bonusScans, setBonusScans] = useState(0);
  const [loading, setLoading] = useState(true);

  const baseLimit = PLAN_LIMITS[userPlan] ?? 20;
  const effectiveLimit = baseLimit + bonusScans;
  const remaining = Math.max(0, effectiveLimit - scanCount);
  const canScan = remaining > 0;

  const fetchUsage = useCallback(async () => {
    if (!user) { setLoading(false); return; }

    // Reset if needed (server-side via security definer)
    await supabase.rpc("reset_scan_if_needed", { _user_id: user.id });

    const [usageRes, referralRes] = await Promise.all([
      supabase
        .from("scan_usage")
        .select("scan_count, reset_date")
        .eq("user_id", user.id)
        .single(),
      supabase
        .from("referral_profiles")
        .select("referral_rewards_scans")
        .eq("user_id", user.id)
        .single(),
    ]);

    if (usageRes.data) {
      setScanCount(usageRes.data.scan_count);
      setResetDate(usageRes.data.reset_date);
    }
    if (referralRes.data) {
      setBonusScans(referralRes.data.referral_rewards_scans ?? 0);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage, userPlan]);

  const logScan = async () => {
    if (!user) return false;

    const { data: newCount, error } = await supabase.rpc("increment_scan_count", { _user_id: user.id });

    if (!error && newCount !== null) {
      setScanCount(newCount);
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
    limit: baseLimit,
    bonusScans,
    effectiveLimit,
    remaining,
    canScan,
    logScan,
    loading,
    planName: userPlan,
    daysUntilReset,
  };
}
