import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import ResultsPage from "@/pages/ResultsPage";
import type { AnalysisResult } from "@/types/analysis";

vi.mock("@/hooks/useHealthProfile", () => ({
  useHealthProfile: () => ({
    profile: {
      allergies: [],
      diet_type: "none",
      health_conditions: [],
      low_sugar_preference: false,
      avoid_additives: false,
      low_sodium_preference: false,
    },
    loading: false,
    hasProfile: false,
  }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    userPlan: "free",
  }),
}));

vi.mock("@/components/ShareModal", () => ({
  default: () => null,
}));

vi.mock("@/components/SafetyMeter", () => ({
  default: ({ score, label }: { score: number; label: string }) => (
    <div data-testid="safety-meter">{score}-{label}</div>
  ),
}));

vi.mock("@/components/AnalysisCard", () => ({
  default: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section>
      <h3>{title}</h3>
      {children}
    </section>
  ),
}));

vi.mock("@/components/PersonalizedWarnings", () => ({
  default: () => null,
}));

const sampleAnalysis: AnalysisResult = {
  safety_score: 75,
  safety_level: "Safe",
  product_summary: "Sample product summary",
  simple_summary: "Sample simple summary",
  overall_verdict: "Sample verdict",
  harmful_ingredients: ["Sugar"],
  beneficial_ingredients: ["Fiber"],
  allergens: [],
  ingredient_explanations: [],
  recommendation: "Consume occasionally",
  health_warnings: [],
};

afterEach(() => {
  sessionStorage.clear();
});

describe("ResultsPage", () => {
  it("renders analysis from router state", async () => {
    render(
      <MemoryRouter initialEntries={[{ pathname: "/results", state: { analysis: sampleAnalysis } }]}>
        <Routes>
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Sample verdict")).toBeInTheDocument();
    expect(screen.getByTestId("safety-meter")).toHaveTextContent("75-Safe");
  });

  it("falls back to last analysis from session storage", async () => {
    sessionStorage.setItem("picsafe_last_analysis", JSON.stringify(sampleAnalysis));

    render(
      <MemoryRouter initialEntries={["/results"]}>
        <Routes>
          <Route path="/results" element={<ResultsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText("Sample verdict")).toBeInTheDocument();
    expect(screen.getByTestId("safety-meter")).toHaveTextContent("75-Safe");
  });
});
