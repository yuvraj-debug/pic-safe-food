import { describe, it, expect } from "vitest";
import { normalizeAnalysis } from "@/lib/analysisNormalizer";

describe("normalizeAnalysis", () => {
  it("returns safe defaults for invalid payloads", () => {
    const result = normalizeAnalysis(null);

    expect(result.safety_score).toBe(0);
    expect(result.safety_level).toBe("Unknown");
    expect(result.harmful_ingredients).toEqual([]);
    expect(result.beneficial_ingredients).toEqual([]);
    expect(result.allergens).toEqual([]);
    expect(result.ingredient_explanations).toEqual([]);
  });

  it("normalizes malformed payload fields and clamps score", () => {
    const result = normalizeAnalysis({
      safety_score: 180,
      product_summary: "Sample Product",
      harmful_ingredients: ["Sugar", 123, ""],
      beneficial_ingredients: "not-an-array",
      allergens: ["Milk", null],
      ingredient_explanations: [
        { ingredient: "Sugar", use: "Sweetener", health_impact: "Raises sugar", risk_level: "high" },
        { use: "Preservative" },
        "invalid",
      ],
      recommendation: "Limit use",
    });

    expect(result.safety_score).toBe(100);
    expect(result.safety_level).toBe("Safe");
    expect(result.product_summary).toBe("Sample Product");
    expect(result.harmful_ingredients).toEqual(["Sugar"]);
    expect(result.beneficial_ingredients).toEqual([]);
    expect(result.allergens).toEqual(["Milk"]);
    expect(result.ingredient_explanations).toHaveLength(2);
    expect(result.ingredient_explanations[0].risk_level).toBe("high");
    expect(result.ingredient_explanations[1].ingredient).toBe("Unknown ingredient");
  });
});
