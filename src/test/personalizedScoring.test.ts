import { describe, it, expect } from "vitest";
import { computePersonalizedScore } from "@/lib/personalizedScoring";
import type { AnalysisResult } from "@/types/analysis";
import type { HealthProfile } from "@/types/healthProfile";

const baseAnalysis: AnalysisResult = {
  safety_score: 80,
  safety_level: "Safe",
  product_summary: "Snack with sugar and milk",
  simple_summary: "Contains sugar and dairy.",
  overall_verdict: "Okay occasionally",
  harmful_ingredients: ["Sugar"],
  beneficial_ingredients: [],
  allergens: ["Milk"],
  ingredient_explanations: [],
  recommendation: "Limit intake",
  health_warnings: [],
};

describe("computePersonalizedScore", () => {
  it("applies allergy and diabetes penalties", () => {
    const profile: HealthProfile = {
      allergies: ["Milk/Dairy"],
      diet_type: "none",
      health_conditions: ["Diabetes"],
      low_sugar_preference: false,
      avoid_additives: false,
      low_sodium_preference: false,
    };

    const result = computePersonalizedScore(baseAnalysis, profile);

    expect(result.baseScore).toBe(80);
    expect(result.personalizedScore).toBeLessThan(80);
    expect(result.penaltyTotal).toBeGreaterThanOrEqual(65);
    expect(result.warnings.some((warning) => warning.message.toLowerCase().includes("dairy"))).toBe(true);
    expect(result.warnings.some((warning) => warning.message.toLowerCase().includes("diabetes"))).toBe(true);
  });

  it("never returns score below zero", () => {
    const profile: HealthProfile = {
      allergies: ["Milk/Dairy", "Peanuts", "Tree Nuts"],
      diet_type: "vegan",
      health_conditions: ["Diabetes", "Hypertension", "Heart Disease", "Celiac Disease", "Lactose Intolerance", "Kidney Disease"],
      low_sugar_preference: true,
      avoid_additives: true,
      low_sodium_preference: true,
    };

    const result = computePersonalizedScore({ ...baseAnalysis, safety_score: 10 }, profile);
    expect(result.personalizedScore).toBe(0);
  });
});
