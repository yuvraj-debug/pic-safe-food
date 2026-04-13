import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface ReferralProfile {
  referral_code: string;
  referral_count: number;
  referral_rewards_scans: number;
  monthly_referral_scans: number;
  highest_milestone_reached: number;
  referred_by: string | null;
}

export interface LeaderboardEntry {
  referral_code: string;
  referral_count: number;
}

const MILESTONES = [
  { count: 1, reward: 10 },
  { count: 3, reward: 50 },
  { count: 5, reward: 100 },
  { count: 10, reward: 200 },
];

export function useReferral() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ReferralProfile | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("referral_profiles")
        .select("referral_code, referral_count, referral_rewards_scans, monthly_referral_scans, highest_milestone_reached, referred_by")
        .eq("user_id", user.id)
        .single();

      if (error) throw error;
      setProfile(data ? (data as ReferralProfile) : null);
    } catch {
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("referral_profiles")
        .select("referral_code, referral_count")
        .gt("referral_count", 0)
        .order("referral_count", { ascending: false })
        .limit(10);

      setLeaderboard((data as LeaderboardEntry[]) ?? []);
    } catch {
      setLeaderboard([]);
    }
  }, []);

  useEffect(() => {
    void fetchProfile();
    void fetchLeaderboard();
  }, [fetchProfile, fetchLeaderboard]);

  const nextMilestone = MILESTONES.find(
    (m) => (profile?.referral_count ?? 0) < m.count
  );

  const currentMilestone = [...MILESTONES]
    .reverse()
    .find((m) => (profile?.referral_count ?? 0) >= m.count);

  return {
    profile,
    loading,
    leaderboard,
    milestones: MILESTONES,
    nextMilestone,
    currentMilestone,
    refetch: fetchProfile,
  };
}
