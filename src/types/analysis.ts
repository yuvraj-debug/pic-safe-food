export interface IngredientExplanation {
  ingredient: string;
  use: string;
  health_impact: string;
  risk_level?: "low" | "medium" | "high";
}

export interface AnalysisResult {
  safety_score: number;
  safety_level: string;
  product_summary: string;
  simple_summary: string;
  overall_verdict: string;
  harmful_ingredients: string[];
  beneficial_ingredients: string[];
  allergens: string[];
  ingredient_explanations: IngredientExplanation[];
  recommendation: string;
  health_warnings: string[];
}

export interface ScanHistoryItem {
  id: string;
  timestamp: number;
  productName: string;
  safetyScore: number;
  safetyLevel: string;
  recommendation: string;
  analysis: AnalysisResult;
  thumbnail?: string;
}
