import { forwardRef } from "react";
import type { AnalysisResult } from "@/types/analysis";

interface ShareCardProps {
  analysis: AnalysisResult;
  displayScore: number;
  displayLevel: string;
  productName: string;
  baseScore?: number;
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ analysis, displayScore, displayLevel, productName, baseScore }, ref) => {
    const isPersonalized = baseScore !== undefined && baseScore !== displayScore;

    const scoreColor =
      displayScore <= 30
        ? "#e5484d"
        : displayScore <= 60
        ? "#f59e0b"
        : "#34d399";

    const baseScoreColor =
      baseScore !== undefined
        ? baseScore <= 30
          ? "#e5484d"
          : baseScore <= 60
          ? "#f59e0b"
          : "#34d399"
        : scoreColor;

    const topConcerns = analysis.harmful_ingredients.slice(0, 3);
    const topBenefits = analysis.beneficial_ingredients.slice(0, 2);

    const radius = 70;
    const circumference = Math.PI * radius;
    const progress = (displayScore / 100) * circumference;

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1080,
          background: "linear-gradient(160deg, #0d1117 0%, #111827 50%, #0d1117 100%)",
          fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          padding: 80,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -200,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${scoreColor}15, transparent 70%)`,
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 40 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}88)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
            }}
          >
            🔍
          </div>
          <span style={{ fontSize: 28, fontWeight: 700, color: "#e5e7eb", letterSpacing: "-0.02em" }}>
            PicSafe Food
          </span>
        </div>

        {/* Product Name */}
        <h1
          style={{
            fontSize: 48,
            fontWeight: 700,
            color: "#f9fafb",
            lineHeight: 1.2,
            marginBottom: 36,
            letterSpacing: "-0.03em",
            maxHeight: 120,
            overflow: "hidden",
          }}
        >
          {productName}
        </h1>

        {/* Score Section */}
        <div style={{ display: "flex", alignItems: "center", gap: 40, marginBottom: 36 }}>
          {/* Score Gauge */}
          <div style={{ position: "relative", width: 180, height: 110 }}>
            <svg width="180" height="110" viewBox="0 0 180 110">
              <path d="M 20 100 A 70 70 0 0 1 160 100" fill="none" stroke="#1f2937" strokeWidth="12" strokeLinecap="round" />
              <path
                d="M 20 100 A 70 70 0 0 1 160 100"
                fill="none"
                stroke={scoreColor}
                strokeWidth="12"
                strokeLinecap="round"
                strokeDasharray={`${progress} ${circumference}`}
                style={{ filter: `drop-shadow(0 0 8px ${scoreColor}66)` }}
              />
            </svg>
            <div style={{ position: "absolute", bottom: 4, left: "50%", transform: "translateX(-50%)", textAlign: "center" }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                {displayScore}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
                out of 100
              </div>
            </div>
          </div>

          {/* Level + score labels */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 30, fontWeight: 700, color: scoreColor, marginBottom: 8 }}>
              {displayLevel}
            </div>

            {isPersonalized ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{
                    fontSize: 16, fontWeight: 600, color: "#9ca3af",
                    padding: "4px 12px", borderRadius: 8,
                    background: `${baseScoreColor}15`, border: `1px solid ${baseScoreColor}30`,
                  }}>
                    Base Score: <span style={{ color: baseScoreColor, fontWeight: 700 }}>{baseScore}</span>
                  </div>
                  <span style={{ fontSize: 18, color: "#4b5563" }}>→</span>
                  <div style={{
                    fontSize: 16, fontWeight: 600, color: "#9ca3af",
                    padding: "4px 12px", borderRadius: 8,
                    background: `${scoreColor}15`, border: `1px solid ${scoreColor}30`,
                  }}>
                    Your Score: <span style={{ color: scoreColor, fontWeight: 700 }}>{displayScore}</span>
                  </div>
                </div>
                <div style={{ fontSize: 14, color: "#6b7280", fontStyle: "italic" }}>
                  ❤️ Adjusted based on your health profile
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 16, color: "#9ca3af", maxWidth: 400, lineHeight: 1.5 }}>
                {analysis.overall_verdict || analysis.simple_summary?.slice(0, 80)}
              </div>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: "linear-gradient(90deg, transparent, #374151, transparent)", marginBottom: 32 }} />

        {/* Concerns & Benefits */}
        <div style={{ display: "flex", gap: 40, flex: 1 }}>
          {topConcerns.length > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 16 }}>
                ⚠️ Concerns
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {topConcerns.map((c, i) => (
                  <div key={i} style={{
                    background: "rgba(229,72,77,0.08)", border: "1px solid rgba(229,72,77,0.2)",
                    borderRadius: 14, padding: "12px 18px", fontSize: 20, color: "#fca5a5", fontWeight: 500,
                  }}>
                    ⚠ {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {topBenefits.length > 0 && (
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.08em", marginBottom: 16 }}>
                ✅ Good Points
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {topBenefits.map((b, i) => (
                  <div key={i} style={{
                    background: "rgba(52,211,153,0.08)", border: "1px solid rgba(52,211,153,0.2)",
                    borderRadius: 14, padding: "12px 18px", fontSize: 20, color: "#6ee7b7", fontWeight: 500,
                  }}>
                    ✅ {b}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginTop: 32, paddingTop: 24, borderTop: "1px solid #1f293766",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}88)`,
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
            }}>
              🛡️
            </div>
            <span style={{ fontSize: 20, fontWeight: 600, color: "#9ca3af" }}>
              Scanned with PicSafe Food
            </span>
          </div>
          <span style={{ fontSize: 16, color: "#4b5563" }}>pic-safe-food.lovable.app</span>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
export default ShareCard;
