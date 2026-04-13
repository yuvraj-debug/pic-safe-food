import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  ArrowLeft,
  FileText,
  FlaskConical,
  AlertTriangle,
  Leaf,
  ShieldAlert,
  Utensils,
  Eye,
  EyeOff,
  Info,
  ScanLine,
  Share2,
  Heart,
} from "lucide-react";
import { toast } from "sonner";
import ShareModal from "@/components/ShareModal";
import SafetyMeter from "@/components/SafetyMeter";
import AnalysisCard from "@/components/AnalysisCard";
import PersonalizedWarnings from "@/components/PersonalizedWarnings";
import { useHealthProfile } from "@/hooks/useHealthProfile";
import { computePersonalizedScore } from "@/lib/personalizedScoring";
import { useAuth } from "@/hooks/useAuth";
import { loadLastAnalysis, normalizeAnalysis, persistLastAnalysis } from "@/lib/analysisNormalizer";
import type { AnalysisResult } from "@/types/analysis";
import type { PersonalizedResult } from "@/lib/personalizedScoring";

type ResultsLocationState = { analysis?: unknown };
type ScoreTone = "safe" | "moderate" | "unsafe";

const SCORE_TONE_CLASSES: Record<ScoreTone, {
  text: string;
  border: string;
  bg: string;
}> = {
  safe: {
    text: "text-safe",
    border: "border-safe/20",
    bg: "bg-safe/10",
  },
  moderate: {
    text: "text-moderate",
    border: "border-moderate/20",
    bg: "bg-moderate/10",
  },
  unsafe: {
    text: "text-unsafe",
    border: "border-unsafe/20",
    bg: "bg-unsafe/10",
  },
};

const getRiskBadge = (level?: string) => {
  switch (level) {
    case "high":
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-unsafe/15 text-unsafe border border-unsafe/20">HIGH RISK</span>;
    case "medium":
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-moderate/15 text-moderate border border-moderate/20">MEDIUM</span>;
    default:
      return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-safe/15 text-safe border border-safe/20">LOW RISK</span>;
  }
};

const getToneFromScore = (score: number): ScoreTone => {
  if (score <= 30) return "unsafe";
  if (score <= 60) return "moderate";
  return "safe";
};

const getLabelFromScore = (score: number): string => {
  if (score <= 30) return "Unsafe";
  if (score <= 60) return "Moderate";
  return "Safe";
};

const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const { profile, loading: profileLoading, hasProfile } = useHealthProfile();
  const { userPlan } = useAuth();
  const [personalized, setPersonalized] = useState<PersonalizedResult | null>(null);
  const canPersonalize = userPlan !== "free";

  useEffect(() => {
    const routeAnalysis = (location.state as ResultsLocationState | null)?.analysis;
    if (routeAnalysis) {
      const normalized = normalizeAnalysis(routeAnalysis);
      persistLastAnalysis(normalized);
      setAnalysis(normalized);
      return;
    }
    setAnalysis(loadLastAnalysis());
  }, [location.state]);

  useEffect(() => {
    if (analysis && !profileLoading && hasProfile && canPersonalize) {
      setPersonalized(computePersonalizedScore(analysis, profile));
      return;
    }
    setPersonalized(null);
  }, [analysis, profile, profileLoading, hasProfile, canPersonalize]);

  if (!analysis) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">No analysis data found.</p>
          <button onClick={() => navigate("/")} className="text-primary font-display font-semibold underline">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const displayScore = personalized ? personalized.personalizedScore : analysis.safety_score;
  const displayLevel = getLabelFromScore(displayScore);
  const scoreTone = getToneFromScore(displayScore);
  const toneClasses = SCORE_TONE_CLASSES[scoreTone];

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="flex items-center justify-between p-4 max-w-2xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="font-display font-semibold text-lg text-foreground">Results</h2>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => navigate("/health-profile")}
            className={`p-2 rounded-xl transition-colors ${hasProfile ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground hover:bg-muted"}`}
            title="Health Profile"
          >
            <Heart className="w-5 h-5" />
          </button>
          <button
            onClick={async () => {
              const shareText = `${analysis.overall_verdict || "Food Safety Check"}\n\nSafety Score: ${displayScore}/100 (${displayLevel})\n\n${analysis.simple_summary || analysis.product_summary}\n\n${analysis.harmful_ingredients.length > 0 ? `${analysis.harmful_ingredients.length} concern(s) found` : "No major concerns"}\n\nScanned with PicSafe Food`;
              if (navigator.share) {
                try {
                  await navigator.share({ title: "PicSafe Food Scan Result", text: shareText });
                } catch {
                  // Ignore cancelled share.
                }
              } else {
                await navigator.clipboard.writeText(shareText);
                toast.success("Results copied to clipboard!");
              }
            }}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-xl hover:bg-muted"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-2xl mx-auto">
        <div className="px-4 sm:px-6 mb-4">
          <SafetyMeter score={displayScore} label={displayLevel} />
          {personalized && personalized.penaltyTotal > 0 && (
            <p className="text-center text-xs text-muted-foreground mt-1">
              Base score: <span className="font-semibold text-foreground">{personalized.baseScore}</span>
              {" -> "}
              Personalized: <span className={`font-semibold ${toneClasses.text}`}>{personalized.personalizedScore}</span>
            </p>
          )}
        </div>

        {personalized && personalized.warnings.length > 0 && (
          <div className="px-4 mb-4">
            <PersonalizedWarnings
              warnings={personalized.warnings}
              baseScore={personalized.baseScore}
              personalizedScore={personalized.personalizedScore}
              penaltyTotal={personalized.penaltyTotal}
            />
          </div>
        )}

        {!profileLoading && !hasProfile && canPersonalize && (
          <div className="px-4 mb-4">
            <button
              onClick={() => navigate("/health-profile")}
              className="w-full rounded-2xl p-3 border border-primary/20 bg-primary/5 flex items-center gap-3 hover:bg-primary/10 transition-all"
            >
              <Heart className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm text-foreground text-left">
                Set up your <span className="font-semibold text-primary">Health Profile</span> for personalized safety scores
              </p>
            </button>
          </div>
        )}
        {!canPersonalize && (
          <div className="px-4 mb-4">
            <button
              onClick={() => navigate("/pricing")}
              className="w-full rounded-2xl p-3 border border-primary/20 bg-primary/5 flex items-center gap-3 hover:bg-primary/10 transition-all"
            >
              <Heart className="w-5 h-5 text-primary shrink-0" />
              <p className="text-sm text-foreground text-left">
                Upgrade to <span className="font-semibold text-primary">Basic or above</span> for personalized health scoring
              </p>
            </button>
          </div>
        )}

        <div className="px-4 mb-4">
          <div className={`rounded-2xl p-4 border bg-gradient-card ${toneClasses.border}`}>
            {analysis.overall_verdict && (
              <p className="font-display font-bold text-foreground text-base mb-2">
                {analysis.overall_verdict}
              </p>
            )}
            <p className="text-secondary-foreground text-sm leading-relaxed">
              {analysis.simple_summary || analysis.product_summary}
            </p>
            <div className={`mt-3 flex items-start gap-2 p-3 rounded-xl border ${toneClasses.bg} ${toneClasses.border}`}>
              <Info className={`w-4 h-4 mt-0.5 shrink-0 ${toneClasses.text}`} />
              <p className={`text-sm font-medium ${toneClasses.text}`}>
                {analysis.recommendation}
              </p>
            </div>
          </div>
        </div>

        <div className="px-4 mb-4">
          <div className="flex flex-wrap gap-2">
            {analysis.harmful_ingredients.length > 0 && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-unsafe/10 text-unsafe border border-unsafe/20 font-medium">
                Warning: {analysis.harmful_ingredients.length} concern{analysis.harmful_ingredients.length > 1 ? "s" : ""}
              </span>
            )}
            {analysis.beneficial_ingredients.length > 0 && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-safe/10 text-safe border border-safe/20 font-medium">
                Good: {analysis.beneficial_ingredients.length} ingredient{analysis.beneficial_ingredients.length > 1 ? "s" : ""}
              </span>
            )}
            {analysis.allergens.length > 0 && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-moderate/10 text-moderate border border-moderate/20 font-medium">
                Allergens: {analysis.allergens.length}
              </span>
            )}
            {analysis.allergens.length === 0 && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-safe/10 text-safe border border-safe/20 font-medium">
                No allergens detected
              </span>
            )}
            {personalized && personalized.penaltyTotal > 0 && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-unsafe/10 text-unsafe border border-unsafe/20 font-medium">
                Personal warning{personalized.warnings.length > 1 ? "s" : ""}: {personalized.warnings.length}
              </span>
            )}
          </div>
        </div>

        <div className="px-4 mb-3">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all text-sm font-medium"
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showDetails ? "Hide Detailed Analysis" : "Show Detailed Analysis"}
          </button>
        </div>

        {showDetails && (
          <div className="px-4 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <AnalysisCard title="Product Summary" icon={<FileText className="w-5 h-5" />} defaultOpen>
              <p>{analysis.product_summary}</p>
            </AnalysisCard>

            <AnalysisCard title="Ingredient Breakdown" icon={<FlaskConical className="w-5 h-5" />}>
              <div className="space-y-3">
                {analysis.ingredient_explanations.map((item, index) => (
                  <div key={index} className="bg-muted/50 rounded-xl p-3">
                    <div className="flex items-center justify-between mb-1 flex-wrap gap-1">
                      <p className="font-semibold text-foreground text-sm">{item.ingredient}</p>
                      {getRiskBadge(item.risk_level)}
                    </div>
                    <p className="text-muted-foreground text-xs mt-1">
                      <span className="text-primary font-medium">What it does:</span> {item.use}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      <span className="text-primary font-medium">Your health:</span> {item.health_impact}
                    </p>
                  </div>
                ))}
              </div>
            </AnalysisCard>

            {analysis.health_warnings.length > 0 && (
              <AnalysisCard title="Health Warnings" icon={<AlertTriangle className="w-5 h-5" />} variant="warning">
                <ul className="space-y-2">
                  {analysis.health_warnings.map((warning, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-0.5">-</span>
                      <span className="text-sm">{warning}</span>
                    </li>
                  ))}
                </ul>
              </AnalysisCard>
            )}

            {analysis.beneficial_ingredients.length > 0 && (
              <AnalysisCard title="Good Ingredients" icon={<Leaf className="w-5 h-5" />} variant="safe">
                <ul className="space-y-2">
                  {analysis.beneficial_ingredients.map((benefit, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="mt-0.5">+</span>
                      <span className="text-sm">{benefit}</span>
                    </li>
                  ))}
                </ul>
              </AnalysisCard>
            )}

            {analysis.allergens.length > 0 && (
              <AnalysisCard title="Allergen Alerts" icon={<ShieldAlert className="w-5 h-5" />} variant="warning">
                <div className="flex flex-wrap gap-2">
                  {analysis.allergens.map((allergen, index) => (
                    <span key={index} className="bg-unsafe/10 text-unsafe px-3 py-1.5 rounded-full text-sm font-medium border border-unsafe/20">
                      {allergen}
                    </span>
                  ))}
                </div>
              </AnalysisCard>
            )}

            <AnalysisCard title="What Should You Do?" icon={<Utensils className="w-5 h-5" />} defaultOpen>
              <p className="font-medium text-foreground">{analysis.recommendation}</p>
            </AnalysisCard>
          </div>
        )}

        <div className="px-4 mt-6 space-y-3">
          <button
            onClick={() => setShowShareModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-card text-foreground font-display font-semibold py-4 rounded-2xl border border-primary/30 hover:border-primary/60 hover:bg-primary/5 active:scale-[0.98] transition-all"
          >
            <Share2 className="w-5 h-5 text-primary" />
            Share Result Card
          </button>
          <button
            onClick={() => navigate("/scan")}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display font-semibold py-4 rounded-2xl glow-primary hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <ScanLine className="w-5 h-5" />
            Scan Another Product
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground font-display font-medium py-3 rounded-2xl hover:bg-secondary/80 active:scale-[0.98] transition-all text-sm"
          >
            Back to Home
          </button>
        </div>

        {showShareModal && (
          <ShareModal
            analysis={analysis}
            displayScore={displayScore}
            displayLevel={displayLevel}
            baseScore={personalized ? personalized.baseScore : undefined}
            userPlan={userPlan}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default ResultsPage;
