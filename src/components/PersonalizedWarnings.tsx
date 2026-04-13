import { AlertTriangle, ShieldAlert } from "lucide-react";
import type { PersonalizedWarning } from "@/lib/personalizedScoring";

interface Props {
  warnings: PersonalizedWarning[];
  baseScore: number;
  personalizedScore: number;
  penaltyTotal: number;
}

const PersonalizedWarnings = ({
  warnings,
  baseScore,
  personalizedScore,
  penaltyTotal,
}: Props) => {
  if (warnings.length === 0) return null;

  return (
    <div className="rounded-2xl border border-unsafe/20 bg-unsafe/5 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-5 h-5 text-unsafe" />
        <h3 className="font-display font-semibold text-sm text-foreground">
          Personalized Health Warnings
        </h3>
      </div>

      <div className="flex items-center gap-3 text-xs">
        <span className="px-2 py-1 rounded-lg bg-muted text-muted-foreground">
          Base: {baseScore}
        </span>
        <span className="text-muted-foreground">-&gt;</span>
        <span className="px-2 py-1 rounded-lg bg-unsafe/10 text-unsafe font-semibold">
          Your Score: {personalizedScore}
        </span>
        <span className="text-unsafe/70 ml-auto">-{penaltyTotal} pts</span>
      </div>

      <ul className="space-y-2">
        {warnings.map((warning, index) => (
          <li key={index} className="flex items-start gap-2">
            <AlertTriangle
              className={`w-4 h-4 mt-0.5 shrink-0 ${
                warning.severity === "high" ? "text-unsafe" : "text-moderate"
              }`}
            />
            <span className="text-sm text-foreground">{warning.message}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PersonalizedWarnings;
