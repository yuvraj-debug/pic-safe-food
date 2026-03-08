import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { HealthProfile } from "@/types/healthProfile";
import { DEFAULT_HEALTH_PROFILE } from "@/types/healthProfile";

export function useHealthProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<HealthProfile>(DEFAULT_HEALTH_PROFILE);
  const [loading, setLoading] = useState(true);
  const [hasProfile, setHasProfile] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("health_profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data && !error) {
        setProfile({
          allergies: (data as any).allergies ?? [],
          diet_type: (data as any).diet_type ?? "none",
          health_conditions: (data as any).health_conditions ?? [],
          low_sugar_preference: (data as any).low_sugar_preference ?? false,
          avoid_additives: (data as any).avoid_additives ?? false,
          low_sodium_preference: (data as any).low_sodium_preference ?? false,
        });
        setHasProfile(true);
      }
      setLoading(false);
    };

    fetch();
  }, [user]);

  const saveProfile = useCallback(
    async (newProfile: HealthProfile) => {
      if (!user) return;

      const payload = {
        user_id: user.id,
        ...newProfile,
        updated_at: new Date().toISOString(),
      };

      if (hasProfile) {
        await supabase
          .from("health_profiles")
          .update(payload as any)
          .eq("user_id", user.id);
      } else {
        await supabase
          .from("health_profiles")
          .insert(payload as any);
        setHasProfile(true);
      }

      setProfile(newProfile);
    },
    [user, hasProfile]
  );

  return { profile, loading, hasProfile, saveProfile };
}
