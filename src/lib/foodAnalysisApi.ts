import { supabase } from "@/integrations/supabase/client";
import type { AnalysisResult } from "@/types/analysis";
import { normalizeAnalysis } from "@/lib/analysisNormalizer";

export type FoodAnalysisBody = {
  image?: string;
  barcode?: string;
  ingredients_text?: string;
};

export type FoodAnalysisResult =
  | { unableToFetch: true; message: string }
  | { unableToFetch: false; analysis: AnalysisResult; source?: string };

export function isFoodAnalysisSuccess(result: FoodAnalysisResult): result is { unableToFetch: false; analysis: AnalysisResult; source?: string } {
  return result.unableToFetch === false;
}

export async function invokeFoodAnalysis(body: FoodAnalysisBody): Promise<FoodAnalysisResult> {
  const { data, error } = await supabase.functions.invoke("analyze-food", { body });
  if (error) throw error;
  if (!data) throw new Error("No response from analysis service");

  const payload = data as Record<string, unknown>;

  if (payload.unable_to_fetch === true) {
    return {
      unableToFetch: true,
      message:
        typeof payload.message === "string" && payload.message.trim()
          ? payload.message
          : "Unable to fetch product details. Try ingredients mode.",
    };
  }

  if (typeof payload.error === "string" && payload.error.trim()) {
    throw new Error(payload.error);
  }

  if (typeof payload.success === "boolean") {
    if (payload.success && payload.data) {
      return {
        unableToFetch: false,
        analysis: normalizeAnalysis(payload.data),
        source: typeof payload.source === "string" ? payload.source : undefined,
      };
    }

    if (!payload.success && payload.fallback) {
      return {
        unableToFetch: false,
        analysis: normalizeAnalysis(payload.fallback),
        source: "fallback",
      };
    }

    throw new Error(typeof payload.message === "string" ? payload.message : "Analysis service failed");
  }

  return {
    unableToFetch: false,
    analysis: normalizeAnalysis(payload),
  };
}

export function productNameFromAnalysis(analysis: AnalysisResult): string {
  const summary = analysis.product_summary.split(".")[0]?.trim();
  return summary ? summary.slice(0, 80) : "Unknown Product";
}
