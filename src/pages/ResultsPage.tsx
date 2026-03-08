import { useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
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
} from "lucide-react";
import { toast } from "sonner";
import SafetyMeter from "@/components/SafetyMeter";
import AnalysisCard from "@/components/AnalysisCard";
import type { AnalysisResult } from "@/types/analysis";

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

const ResultsPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const analysis = location.state?.analysis as AnalysisResult | undefined;
  const [showDetails, setShowDetails] = useState(false);

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

  const scoreColor = analysis.safety_score <= 30 ? "unsafe" : analysis.safety_score <= 60 ? "moderate" : "safe";

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="font-display font-semibold text-lg text-foreground">Results</h2>
        </div>
      </div>

      {/* Safety Meter */}
      <div className="px-6 mb-4">
        <SafetyMeter score={analysis.safety_score} label={analysis.safety_level} />
      </div>

      {/* Simple Summary - Always visible */}
      <div className="px-4 mb-4">
        <div className={`rounded-2xl p-4 border bg-gradient-card border-${scoreColor}/20`}>
          {/* Verdict */}
          {analysis.overall_verdict && (
            <p className="font-display font-bold text-foreground text-base mb-2">
              {analysis.overall_verdict}
            </p>
          )}
          
          {/* Simple explanation */}
          <p className="text-secondary-foreground text-sm leading-relaxed">
            {analysis.simple_summary || analysis.product_summary}
          </p>

          {/* Quick recommendation */}
          <div className={`mt-3 flex items-start gap-2 p-3 rounded-xl bg-${scoreColor}/10 border border-${scoreColor}/20`}>
            <Info className={`w-4 h-4 mt-0.5 text-${scoreColor} shrink-0`} />
            <p className={`text-sm font-medium text-${scoreColor}`}>
              {analysis.recommendation}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Overview Chips */}
      <div className="px-4 mb-4">
        <div className="flex flex-wrap gap-2">
          {analysis.harmful_ingredients.length > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-unsafe/10 text-unsafe border border-unsafe/20 font-medium">
              ⚠️ {analysis.harmful_ingredients.length} Concern{analysis.harmful_ingredients.length > 1 ? "s" : ""}
            </span>
          )}
          {analysis.beneficial_ingredients.length > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-safe/10 text-safe border border-safe/20 font-medium">
              ✅ {analysis.beneficial_ingredients.length} Good ingredient{analysis.beneficial_ingredients.length > 1 ? "s" : ""}
            </span>
          )}
          {analysis.allergens.length > 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-moderate/10 text-moderate border border-moderate/20 font-medium">
              🔶 {analysis.allergens.length} Allergen{analysis.allergens.length > 1 ? "s" : ""}
            </span>
          )}
          {analysis.allergens.length === 0 && (
            <span className="text-xs px-3 py-1.5 rounded-full bg-safe/10 text-safe border border-safe/20 font-medium">
              ✅ No allergens detected
            </span>
          )}
        </div>
      </div>

      {/* Toggle Details */}
      <div className="px-4 mb-3">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-all text-sm font-medium"
        >
          {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showDetails ? "Hide Detailed Analysis" : "Show Detailed Analysis"}
        </button>
      </div>

      {/* Detailed Analysis Cards */}
      {showDetails && (
        <div className="px-4 space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Product Summary */}
          <AnalysisCard title="Product Summary" icon={<FileText className="w-5 h-5" />} defaultOpen>
            <p>{analysis.product_summary}</p>
          </AnalysisCard>

          {/* Ingredient Breakdown */}
          <AnalysisCard title="Ingredient Breakdown" icon={<FlaskConical className="w-5 h-5" />}>
            <div className="space-y-3">
              {analysis.ingredient_explanations.map((item, i) => (
                <div key={i} className="bg-muted/50 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
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

          {/* Health Warnings */}
          {analysis.health_warnings.length > 0 && (
            <AnalysisCard title="Health Warnings" icon={<AlertTriangle className="w-5 h-5" />} variant="warning">
              <ul className="space-y-2">
                {analysis.health_warnings.map((w, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5">⚠️</span>
                    <span className="text-sm">{w}</span>
                  </li>
                ))}
              </ul>
            </AnalysisCard>
          )}

          {/* Positive Ingredients */}
          {analysis.beneficial_ingredients.length > 0 && (
            <AnalysisCard title="Good Ingredients" icon={<Leaf className="w-5 h-5" />} variant="safe">
              <ul className="space-y-2">
                {analysis.beneficial_ingredients.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-0.5">✅</span>
                    <span className="text-sm">{b}</span>
                  </li>
                ))}
              </ul>
            </AnalysisCard>
          )}

          {/* Allergen Alerts */}
          {analysis.allergens.length > 0 && (
            <AnalysisCard title="Allergen Alerts" icon={<ShieldAlert className="w-5 h-5" />} variant="warning">
              <div className="flex flex-wrap gap-2">
                {analysis.allergens.map((a, i) => (
                  <span key={i} className="bg-unsafe/10 text-unsafe px-3 py-1.5 rounded-full text-sm font-medium border border-unsafe/20">
                    {a}
                  </span>
                ))}
              </div>
            </AnalysisCard>
          )}

          {/* Consumption Advice */}
          <AnalysisCard title="What Should You Do?" icon={<Utensils className="w-5 h-5" />} defaultOpen>
            <p className="font-medium text-foreground">{analysis.recommendation}</p>
          </AnalysisCard>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-4 mt-6 space-y-3">
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
    </div>
  );
};

export default ResultsPage;
