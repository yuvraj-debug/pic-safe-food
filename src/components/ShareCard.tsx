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

    const baseScoreColor =
      baseScore !== undefined
        ? baseScore <= 30 ? "#e5484d" : baseScore <= 60 ? "#f59e0b" : "#34d399"
        : scoreColor;

    const scoreColor =
      displayScore <= 30
        ? "#e5484d"
        : displayScore <= 60
        ? "#f59e0b"
        : "#34d399";

    const topConcerns = analysis.harmful_ingredients.slice(0, 3);
    const topBenefits = analysis.beneficial_ingredients.slice(0, 2);

    // Arc gauge math
    const radius = 58;
    const circumference = Math.PI * radius;
    const progress = (displayScore / 100) * circumference;

    const summary =
      analysis.simple_summary?.slice(0, 120) ||
      analysis.product_summary?.split(".")[0]?.slice(0, 120) ||
      "";

    return (
      <div
        ref={ref}
        style={{
          width: 1080,
          height: 1080,
          background: "linear-gradient(160deg, #0a1a0a 0%, #0d1f0d 30%, #091209 60%, #050d05 100%)",
          fontFamily: "'Space Grotesk', 'Inter', system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          padding: 60,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow top-right */}
        <div
          style={{
            position: "absolute",
            top: -100,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,197,94,0.12), transparent 70%)",
            pointerEvents: "none",
          }}
        />
        {/* Ambient glow bottom-left */}
        <div
          style={{
            position: "absolute",
            bottom: -80,
            left: -80,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(34,197,94,0.08), transparent 70%)",
            pointerEvents: "none",
          }}
        />

        {/* Header: Logo + Brand */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 28, position: "relative", zIndex: 1 }}>
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 14,
              background: "linear-gradient(135deg, #22c55e, #16a34a)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              boxShadow: "0 4px 20px rgba(34,197,94,0.3)",
            }}
          >
            🍏
          </div>
          <span style={{ fontSize: 30, fontWeight: 700, color: "#e5e7eb", letterSpacing: "-0.02em" }}>
            PicSafe Food
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: 42,
            fontWeight: 800,
            color: "#f9fafb",
            letterSpacing: "-0.03em",
            marginBottom: 28,
            position: "relative",
            zIndex: 1,
          }}
        >
          Food Safety Analysis
        </h1>

        {/* Main Glass Card */}
        <div
          style={{
            flex: 1,
            background: "linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)",
            border: "1px solid rgba(34,197,94,0.2)",
            borderRadius: 28,
            padding: 48,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            zIndex: 1,
            boxShadow: "0 8px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}
        >
          {/* Glass border glow */}
          <div
            style={{
              position: "absolute",
              top: -1,
              left: "20%",
              right: "20%",
              height: 2,
              background: "linear-gradient(90deg, transparent, rgba(34,197,94,0.4), transparent)",
              borderRadius: 2,
            }}
          />

          {/* Product + Score Row */}
          <div style={{ display: "flex", alignItems: "center", gap: 36, marginBottom: 28 }}>
            {/* Score Gauge */}
            <div style={{ position: "relative", width: 150, height: 95, flexShrink: 0 }}>
              <svg width="150" height="95" viewBox="0 0 150 95">
                <path
                  d="M 15 85 A 58 58 0 0 1 135 85"
                  fill="none"
                  stroke="rgba(255,255,255,0.08)"
                  strokeWidth="14"
                  strokeLinecap="round"
                />
                <path
                  d="M 15 85 A 58 58 0 0 1 135 85"
                  fill="none"
                  stroke={scoreColor}
                  strokeWidth="14"
                  strokeLinecap="round"
                  strokeDasharray={`${progress} ${circumference}`}
                  style={{ filter: `drop-shadow(0 0 10px ${scoreColor}88)` }}
                />
              </svg>
              <div
                style={{
                  position: "absolute",
                  bottom: 0,
                  left: "50%",
                  transform: "translateX(-50%)",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 44, fontWeight: 800, color: scoreColor, lineHeight: 1 }}>
                  {displayScore}
                </div>
                <div style={{ fontSize: 14, color: "#6b7280", fontWeight: 500 }}>
                  {displayScore} / 100
                </div>
              </div>
            </div>

            {/* Product Info */}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#f9fafb", marginBottom: 8, lineHeight: 1.1 }}>
                {productName}
              </div>
              {isPersonalized ? (
                <>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "#e5e7eb", marginBottom: 4 }}>
                    Personalized Score
                  </div>
                  <div style={{ fontSize: 16, color: "#9ca3af" }}>
                    (Adjusted for your health profile)
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 22, fontWeight: 700, color: "#e5e7eb" }}>
                  Product Score
                </div>
              )}
            </div>
          </div>

          {/* Summary */}
          {summary && (
            <div
              style={{
                fontSize: 20,
                color: "#d1d5db",
                lineHeight: 1.5,
                textAlign: "center",
                marginBottom: 24,
                maxHeight: 64,
                overflow: "hidden",
              }}
            >
              {summary}
            </div>
          )}

          {/* Risk Level Label */}
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <span
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: scoreColor,
                letterSpacing: "0.02em",
                textShadow: `0 0 20px ${scoreColor}44`,
              }}
            >
              {displayLevel}
            </span>
          </div>

          {/* Concerns & Benefits */}
          <div style={{ display: "flex", gap: 24, flex: 1 }}>
            {topConcerns.length > 0 && (
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#9ca3af",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.1em",
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  ⚠️ Concerns
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {topConcerns.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        background: "rgba(229,72,77,0.08)",
                        border: "1px solid rgba(229,72,77,0.15)",
                        borderRadius: 14,
                        padding: "14px 18px",
                        fontSize: 19,
                        color: "#fca5a5",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span style={{ color: "#f59e0b", fontSize: 16 }}>⚠</span> {c}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {topBenefits.length > 0 && (
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#9ca3af",
                    textTransform: "uppercase" as const,
                    letterSpacing: "0.1em",
                    marginBottom: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  ✅ Good Points
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {topBenefits.map((b, i) => (
                    <div
                      key={i}
                      style={{
                        background: "rgba(34,197,94,0.08)",
                        border: "1px solid rgba(34,197,94,0.15)",
                        borderRadius: 14,
                        padding: "14px 18px",
                        fontSize: 19,
                        color: "#86efac",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <span style={{ color: "#22c55e", fontSize: 16 }}>✓</span> {b}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            textAlign: "center",
            marginTop: 28,
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: "#22c55e", marginBottom: 10 }}>
            Scan your food with AI
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
              }}
            >
              🍏
            </div>
            <span style={{ fontSize: 18, color: "#9ca3af", fontWeight: 500 }}>
              picsafefood.in
            </span>
          </div>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";
export default ShareCard;
