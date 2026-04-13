import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Heart,
  Leaf,
  ShieldAlert,
  Save,
  AlertTriangle,
  Candy,
  FlaskConical,
  Droplets,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useHealthProfile } from "@/hooks/useHealthProfile";
import { BottomNav } from "@/components/BottomNav";
import { SideMenu } from "@/components/SideMenu";
import type { HealthProfile } from "@/types/healthProfile";
import {
  ALLERGY_OPTIONS,
  HEALTH_CONDITION_OPTIONS,
  DEFAULT_HEALTH_PROFILE,
} from "@/types/healthProfile";

const HealthProfilePage = () => {
  const navigate = useNavigate();
  const { profile, loading, saveProfile } = useHealthProfile();
  const [form, setForm] = useState<HealthProfile>(DEFAULT_HEALTH_PROFILE);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!loading) setForm(profile);
  }, [loading, profile]);

  const toggleArrayItem = (
    key: "allergies" | "health_conditions",
    item: string
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(item)
        ? prev[key].filter((i) => i !== item)
        : [...prev[key], item],
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await saveProfile(form);
      toast.success("Health profile saved!");
    } catch {
      toast.error("Failed to save profile.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 max-w-lg mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <Heart className="w-5 h-5 text-primary" />
        <h2 className="font-display font-semibold text-lg text-foreground">
          Health Profile
        </h2>
      </div>

      <div className="max-w-lg mx-auto px-4 space-y-5">
        {/* Info banner */}
        <div className="rounded-2xl p-4 border border-primary/20 bg-primary/5">
          <p className="text-sm text-foreground leading-relaxed">
            Set your health preferences to get{" "}
            <span className="font-semibold text-primary">personalized safety scores</span>{" "}
            and warnings tailored to your needs.
          </p>
        </div>

        {/* Allergies */}
        <Section
          icon={<ShieldAlert className="w-5 h-5 text-unsafe" />}
          title="Allergies"
        >
          <div className="flex flex-wrap gap-2">
            {ALLERGY_OPTIONS.map((a) => (
              <ChipToggle
                key={a}
                label={a}
                active={form.allergies.includes(a)}
                onClick={() => toggleArrayItem("allergies", a)}
                activeColor="unsafe"
              />
            ))}
          </div>
        </Section>

        {/* Diet Type */}
        <Section
          icon={<Leaf className="w-5 h-5 text-safe" />}
          title="Diet Type"
        >
          <div className="flex flex-wrap gap-2">
            {(["none", "vegetarian", "vegan"] as const).map((d) => (
              <ChipToggle
                key={d}
                label={d === "none" ? "No restriction" : d.charAt(0).toUpperCase() + d.slice(1)}
                active={form.diet_type === d}
                onClick={() => setForm((prev) => ({ ...prev, diet_type: d }))}
                activeColor="safe"
              />
            ))}
          </div>
        </Section>

        {/* Health Conditions */}
        <Section
          icon={<AlertTriangle className="w-5 h-5 text-moderate" />}
          title="Health Conditions"
        >
          <div className="flex flex-wrap gap-2">
            {HEALTH_CONDITION_OPTIONS.map((c) => (
              <ChipToggle
                key={c}
                label={c}
                active={form.health_conditions.includes(c)}
                onClick={() => toggleArrayItem("health_conditions", c)}
                activeColor="moderate"
              />
            ))}
          </div>
        </Section>

        {/* Preferences */}
        <Section
          icon={<FlaskConical className="w-5 h-5 text-primary" />}
          title="Preferences"
        >
          <div className="space-y-3">
            <ToggleRow
              icon={<Candy className="w-4 h-4" />}
              label="Prefer low sugar"
              checked={form.low_sugar_preference}
              onChange={() =>
                setForm((p) => ({
                  ...p,
                  low_sugar_preference: !p.low_sugar_preference,
                }))
              }
            />
            <ToggleRow
              icon={<FlaskConical className="w-4 h-4" />}
              label="Avoid additives & preservatives"
              checked={form.avoid_additives}
              onChange={() =>
                setForm((p) => ({ ...p, avoid_additives: !p.avoid_additives }))
              }
            />
            <ToggleRow
              icon={<Droplets className="w-4 h-4" />}
              label="Prefer low sodium"
              checked={form.low_sodium_preference}
              onChange={() =>
                setForm((p) => ({
                  ...p,
                  low_sodium_preference: !p.low_sodium_preference,
                }))
              }
            />
          </div>
        </Section>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display font-semibold py-4 rounded-2xl glow-primary hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {saving ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Save className="w-5 h-5" />
          )}
          {saving ? "Saving..." : "Save Profile"}
        </button>
      </div>

      <SideMenu />
      <BottomNav />
    </div>
  );
};

/* Helper components */

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-gradient-card rounded-2xl border border-border p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <h3 className="font-display font-semibold text-sm text-foreground">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function ChipToggle({
  label,
  active,
  onClick,
  activeColor,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  activeColor: "safe" | "unsafe" | "moderate" | "primary";
}) {
  const activeClassMap: Record<typeof activeColor, string> = {
    safe: "bg-safe/15 text-safe border-safe/30",
    unsafe: "bg-unsafe/15 text-unsafe border-unsafe/30",
    moderate: "bg-moderate/15 text-moderate border-moderate/30",
    primary: "bg-primary/15 text-primary border-primary/30",
  };

  return (
    <button
      onClick={onClick}
      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all active:scale-95 ${
        active
          ? activeClassMap[activeColor]
          : "bg-card text-muted-foreground border-border hover:border-muted-foreground/30"
      }`}
    >
      {label}
    </button>
  );
}

function ToggleRow({
  icon,
  label,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <button
      onClick={onChange}
      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border hover:border-primary/20 transition-all"
    >
      <div className="text-muted-foreground">{icon}</div>
      <span className="text-sm text-foreground flex-1 text-left">{label}</span>
      <div
        className={`w-10 h-6 rounded-full transition-all relative ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <div
          className={`w-4 h-4 rounded-full bg-foreground absolute top-1 transition-all ${
            checked ? "left-5" : "left-1"
          }`}
        />
      </div>
    </button>
  );
}

export default HealthProfilePage;
