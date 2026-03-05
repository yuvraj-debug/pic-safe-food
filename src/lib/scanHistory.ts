import type { ScanHistoryItem, AnalysisResult } from "@/types/analysis";

const STORAGE_KEY = "foodscan_history";

export const saveToHistory = (
  analysis: AnalysisResult,
  thumbnail?: string
): ScanHistoryItem => {
  const item: ScanHistoryItem = {
    id: crypto.randomUUID(),
    timestamp: Date.now(),
    productName: analysis.product_summary.split(".")[0].slice(0, 60),
    safetyScore: analysis.safety_score,
    safetyLevel: analysis.safety_level,
    recommendation: analysis.recommendation,
    analysis,
    thumbnail,
  };

  const history = getHistory();
  history.unshift(item);
  // Keep last 20
  const trimmed = history.slice(0, 20);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return item;
};

export const getHistory = (): ScanHistoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const clearHistory = () => {
  localStorage.removeItem(STORAGE_KEY);
};
