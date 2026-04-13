import type { AnalysisResult, IngredientExplanation } from "@/types/analysis";

const LAST_ANALYSIS_KEY = "picsafe_last_analysis";

const DEFAULT_ANALYSIS: AnalysisResult = {
  safety_score: 0,
  safety_level: "Unknown",
  product_summary: "Unknown product",
  simple_summary: "We could not extract enough product details to analyze.",
  overall_verdict: "Analysis unavailable",
  harmful_ingredients: [],
  beneficial_ingredients: [],
  allergens: [],
  ingredient_explanations: [],
  recommendation: "Try scanning a clearer image or paste ingredients manually.",
  health_warnings: [],
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function asNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => (typeof item === "string" ? item.trim() : ""))
    .filter(Boolean);
}

function normalizeRiskLevel(value: unknown): IngredientExplanation["risk_level"] {
  if (value === "low" || value === "medium" || value === "high") return value;
  return undefined;
}

function normalizeIngredientExplanation(value: unknown): IngredientExplanation | null {
  if (!isRecord(value)) return null;

  const ingredient = asString(value.ingredient);
  const use = asString(value.use);
  const healthImpact = asString(value.health_impact);

  if (!ingredient && !use && !healthImpact) return null;

  return {
    ingredient: ingredient || "Unknown ingredient",
    use: use || "No usage details provided",
    health_impact: healthImpact || "No health details provided",
    risk_level: normalizeRiskLevel(value.risk_level),
  };
}

function normalizeIngredientExplanations(value: unknown): IngredientExplanation[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(normalizeIngredientExplanation)
    .filter((item): item is IngredientExplanation => item !== null);
}

function deriveSafetyLevel(score: number, level: string): string {
  if (level) return level;
  if (score <= 30) return "Unsafe";
  if (score <= 60) return "Moderate";
  return "Safe";
}

export function normalizeAnalysis(input: unknown): AnalysisResult {
  if (!isRecord(input)) {
    return { ...DEFAULT_ANALYSIS };
  }

  const score = Math.max(0, Math.min(100, Math.round(asNumber(input.safety_score, 0))));
  const harmful = asStringArray(input.harmful_ingredients);
  const beneficial = asStringArray(input.beneficial_ingredients);
  const allergens = asStringArray(input.allergens);
  const warnings = asStringArray(input.health_warnings);

  const productSummary = asString(input.product_summary, DEFAULT_ANALYSIS.product_summary);
  const simpleSummary = asString(input.simple_summary, DEFAULT_ANALYSIS.simple_summary);
  const recommendation = asString(input.recommendation, DEFAULT_ANALYSIS.recommendation);
  const overallVerdict = asString(input.overall_verdict, DEFAULT_ANALYSIS.overall_verdict);
  const safetyLevel = deriveSafetyLevel(score, asString(input.safety_level));

  return {
    safety_score: score,
    safety_level: safetyLevel,
    product_summary: productSummary,
    simple_summary: simpleSummary,
    overall_verdict: overallVerdict,
    harmful_ingredients: harmful,
    beneficial_ingredients: beneficial,
    allergens,
    ingredient_explanations: normalizeIngredientExplanations(input.ingredient_explanations),
    recommendation,
    health_warnings: warnings,
  };
}

export function persistLastAnalysis(analysis: AnalysisResult): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(LAST_ANALYSIS_KEY, JSON.stringify(analysis));
  } catch {
    // Ignore storage failures (private mode / disabled storage).
  }
}

export function loadLastAnalysis(): AnalysisResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(LAST_ANALYSIS_KEY);
    if (!raw) return null;
    return normalizeAnalysis(JSON.parse(raw));
  } catch {
    return null;
  }
}
