import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
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
      setProfile(DEFAULT_HEALTH_PROFILE);
      setHasProfile(false);
      setLoading(false);
      return;
    }

    const fetch = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("health_profiles")
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (data) {
          setProfile({
            allergies: data.allergies ?? [],
            diet_type: data.diet_type === "vegan" || data.diet_type === "vegetarian" ? data.diet_type : "none",
            health_conditions: data.health_conditions ?? [],
            low_sugar_preference: data.low_sugar_preference ?? false,
            avoid_additives: data.avoid_additives ?? false,
            low_sodium_preference: data.low_sodium_preference ?? false,
          });
          setHasProfile(true);
        } else {
          setProfile(DEFAULT_HEALTH_PROFILE);
          setHasProfile(false);
        }
      } catch {
        setProfile(DEFAULT_HEALTH_PROFILE);
        setHasProfile(false);
      } finally {
        setLoading(false);
      }
    };

    void fetch();
  }, [user]);

  const saveProfile = useCallback(
    async (newProfile: HealthProfile) => {
      if (!user) return;

      const basePayload: TablesInsert<"health_profiles"> = {
        user_id: user.id,
        ...newProfile,
        updated_at: new Date().toISOString(),
      };

      if (hasProfile) {
        const updatePayload: TablesUpdate<"health_profiles"> = {
          ...basePayload,
        };
        const { error } = await supabase
          .from("health_profiles")
          .update(updatePayload)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("health_profiles")
          .insert(basePayload);
        if (error) throw error;
        setHasProfile(true);
      }

      setProfile(newProfile);
    },
    [user, hasProfile]
  );

  return { profile, loading, hasProfile, saveProfile };
}
