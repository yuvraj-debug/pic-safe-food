export interface HealthProfile {
  allergies: string[];
  diet_type: "vegan" | "vegetarian" | "none";
  health_conditions: string[];
  low_sugar_preference: boolean;
  avoid_additives: boolean;
  low_sodium_preference: boolean;
}

export const DEFAULT_HEALTH_PROFILE: HealthProfile = {
  allergies: [],
  diet_type: "none",
  health_conditions: [],
  low_sugar_preference: false,
  avoid_additives: false,
  low_sodium_preference: false,
};

export const ALLERGY_OPTIONS = [
  "Peanuts",
  "Tree Nuts",
  "Milk/Dairy",
  "Eggs",
  "Wheat/Gluten",
  "Soy",
  "Fish",
  "Shellfish",
  "Sesame",
];

export const HEALTH_CONDITION_OPTIONS = [
  "Diabetes",
  "Hypertension",
  "Heart Disease",
  "Celiac Disease",
  "Lactose Intolerance",
  "Kidney Disease",
];
