import type { HealthProfile } from "@/types/healthProfile";
import type { AnalysisResult } from "@/types/analysis";

export interface PersonalizedWarning {
  message: string;
  severity: "high" | "medium";
}

export interface PersonalizedResult {
  baseScore: number;
  personalizedScore: number;
  warnings: PersonalizedWarning[];
  penaltyTotal: number;
}

export function computePersonalizedScore(
  analysis: AnalysisResult,
  profile: HealthProfile
): PersonalizedResult {
  const baseScore = analysis.safety_score;
  const warnings: PersonalizedWarning[] = [];
  let penalty = 0;

  const allText = [
    analysis.product_summary,
    analysis.simple_summary,
    ...analysis.harmful_ingredients,
    ...analysis.beneficial_ingredients,
    ...analysis.allergens,
    ...analysis.health_warnings,
    ...analysis.ingredient_explanations.map(
      (ie) => `${ie.ingredient} ${ie.use} ${ie.health_impact}`
    ),
  ]
    .join(" ")
    .toLowerCase();

  // Allergy checks
  const allergenMap: Record<string, string[]> = {
    Peanuts: ["peanut", "groundnut", "arachis"],
    "Tree Nuts": ["almond", "cashew", "walnut", "hazelnut", "pistachio", "pecan", "macadamia", "brazil nut", "tree nut"],
    "Milk/Dairy": ["milk", "dairy", "lactose", "casein", "whey", "cream", "butter", "cheese"],
    Eggs: ["egg", "albumin", "lysozyme"],
    "Wheat/Gluten": ["wheat", "gluten", "flour", "semolina", "spelt"],
    Soy: ["soy", "soya", "lecithin"],
    Fish: ["fish", "anchovy", "cod", "salmon", "tuna"],
    Shellfish: ["shellfish", "shrimp", "crab", "lobster", "prawn"],
    Sesame: ["sesame", "tahini"],
  };

  for (const allergy of profile.allergies) {
    const keywords = allergenMap[allergy] || [allergy.toLowerCase()];
    if (keywords.some((kw) => allText.includes(kw))) {
      penalty += 40;
      warnings.push({
        message: `Contains ${allergy.toLowerCase()} — dangerous for your ${allergy} allergy`,
        severity: "high",
      });
    }
  }

  // Diet checks
  if (profile.diet_type === "vegan") {
    const animalKeywords = ["dairy", "milk", "egg", "meat", "chicken", "beef", "pork", "fish", "gelatin", "honey", "whey", "casein", "lard", "tallow"];
    if (animalKeywords.some((kw) => allText.includes(kw))) {
      penalty += 20;
      warnings.push({
        message: "Contains animal-derived ingredients — not suitable for vegan diet",
        severity: "medium",
      });
    }
  } else if (profile.diet_type === "vegetarian") {
    const meatKeywords = ["meat", "chicken", "beef", "pork", "fish", "gelatin", "lard", "tallow", "anchovy"];
    if (meatKeywords.some((kw) => allText.includes(kw))) {
      penalty += 20;
      warnings.push({
        message: "Contains meat-derived ingredients — not suitable for vegetarian diet",
        severity: "medium",
      });
    }
  }

  // Health condition checks
  for (const condition of profile.health_conditions) {
    switch (condition) {
      case "Diabetes": {
        const sugarKeywords = ["sugar", "high fructose", "corn syrup", "dextrose", "sucrose", "glucose"];
        if (sugarKeywords.some((kw) => allText.includes(kw))) {
          penalty += 25;
          warnings.push({
            message: "High sugar content — not recommended for diabetes",
            severity: "high",
          });
        }
        break;
      }
      case "Hypertension": {
        const sodiumKeywords = ["sodium", "salt", "msg", "monosodium"];
        if (sodiumKeywords.some((kw) => allText.includes(kw))) {
          penalty += 20;
          warnings.push({
            message: "High sodium content — not recommended for hypertension",
            severity: "high",
          });
        }
        break;
      }
      case "Heart Disease": {
        const heartKeywords = ["trans fat", "saturated fat", "hydrogenated", "cholesterol"];
        if (heartKeywords.some((kw) => allText.includes(kw))) {
          penalty += 20;
          warnings.push({
            message: "Contains heart-unfriendly fats — caution for heart disease",
            severity: "high",
          });
        }
        break;
      }
      case "Celiac Disease": {
        const glutenKeywords = ["gluten", "wheat", "barley", "rye", "spelt"];
        if (glutenKeywords.some((kw) => allText.includes(kw))) {
          penalty += 35;
          warnings.push({
            message: "Contains gluten — dangerous for Celiac Disease",
            severity: "high",
          });
        }
        break;
      }
      case "Lactose Intolerance": {
        const lactoseKeywords = ["lactose", "milk", "dairy", "whey", "cream"];
        if (lactoseKeywords.some((kw) => allText.includes(kw))) {
          penalty += 25;
          warnings.push({
            message: "Contains lactose/dairy — not suitable for Lactose Intolerance",
            severity: "high",
          });
        }
        break;
      }
      case "Kidney Disease": {
        const kidneyKeywords = ["phosphorus", "potassium", "sodium", "salt"];
        if (kidneyKeywords.some((kw) => allText.includes(kw))) {
          penalty += 20;
          warnings.push({
            message: "Contains minerals to limit — caution for Kidney Disease",
            severity: "medium",
          });
        }
        break;
      }
    }
  }

  // Preference checks
  if (profile.low_sugar_preference) {
    const sugarKw = ["sugar", "syrup", "fructose", "dextrose", "sucrose"];
    if (sugarKw.some((kw) => allText.includes(kw))) {
      penalty += 10;
      warnings.push({
        message: "Contains sugar — conflicts with your low-sugar preference",
        severity: "medium",
      });
    }
  }

  if (profile.avoid_additives) {
    const additiveKw = ["additive", "preservative", "artificial", "e1", "e2", "e3", "e4", "e5", "e6", "e9", "bht", "bha", "benzoate", "nitrate", "nitrite"];
    if (additiveKw.some((kw) => allText.includes(kw))) {
      penalty += 15;
      warnings.push({
        message: "Contains additives/preservatives — conflicts with your preference",
        severity: "medium",
      });
    }
  }

  if (profile.low_sodium_preference) {
    const sodiumKw = ["sodium", "salt", "msg"];
    if (sodiumKw.some((kw) => allText.includes(kw))) {
      penalty += 10;
      warnings.push({
        message: "Contains sodium/salt — conflicts with your low-sodium preference",
        severity: "medium",
      });
    }
  }

  const personalizedScore = Math.max(0, Math.min(100, baseScore - penalty));

  return { baseScore, personalizedScore, warnings, penaltyTotal: penalty };
}
