import { forwardRef } from "react";
import type { AnalysisResult } from "@/types/analysis";

interface ShareCardProps {
  analysis: AnalysisResult;
  displayScore: number;
  displayLevel: string;
  productName: string;
}

const ShareCard = forwardRef<HTMLDivElement, ShareCardProps>(
  ({ analysis, displayScore, displayLevel, productName }, ref) => {
    const scoreColor =
      displayScore <= 30
        ? "#e5484d"
        : displayScore <= 60
        ? "#f59e0b"
        : "#34d399";

    const scoreColorLight =
      displayScore <= 30
        ? "rgba(229,72,77,0.15)"
        : displayScore <= 60
        ? "rgba(245,158,11,0.15)"
        : "rgba(52,211,153,0.15)";

    const topConcerns = analysis.harmful_ingredients.slice(0, 3);
    const topBenefits = analysis.beneficial_ingredients.slice(0, 2);

    // SVG gauge for the score
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
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -100,
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${scoreColor}08, transparent 70%)`,
          }}
        />

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 48 }}>
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
          <span
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: "#e5e7eb",
              letterSpacing: "-0.02em",
            }}
          >
            PicSafe Food
          </span>
        </div>

        {/* Product Name */}
        <h1
          style={{
            fontSize: 52,
            fontWeight: 700,
            color: "#f9fafb",
            lineHeight: 1.2,
            marginBottom: 40,
            letterSpacing: "-0.03em",
            maxHeight: 130,
            overflow: "hidden",
          }}
        >
          {productName}
        </h1>

        {/* Score Section */}
        <div style={{ display: "flex", alignItems: "center", gap: 48, marginBottom: 48 }}>
          {/* Score Gauge */}
          <div style={{ position: "relative", width: 180, height: 110 }}>
            <svg width="180" height="110" viewBox="0 0 180 110">
              <path
                d="M 20 100 A 70 70 0 0 1 160 100"
                fill="none"
                stroke="#1f2937"
                strokeWidth="12"
                strokeLinecap="round"
              />
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
            <div
              style={{
                position: "absolute",
                bottom: 4,
                left: "50%",
                transform: "translateX(-50%)",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  color: scoreColor,
                  lineHeight: 1,
                }}
              >
                {displayScore}
              </div>
              <div style={{ fontSize: 14, color: "#6b7280", fontWeight: 500 }}>
                out of 100
              </div>
            </div>
          </div>

          {/* Level badge */}
          <div>
            <div
              style={{
                fontSize: 32,
                fontWeight: 700,
                color: scoreColor,
                marginBottom: 8,
              }}
            >
              {displayLevel}
            </div>
            <div
              style={{
                fontSize: 18,
                color: "#9ca3af",
                maxWidth: 400,
                lineHeight: 1.5,
              }}
            >
              {analysis.overall_verdict || analysis.simple_summary?.slice(0, 80)}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div
          style={{
            height: 1,
            background: "linear-gradient(90deg, transparent, #374151, transparent)",
            marginBottom: 40,
          }}
        />

        {/* Concerns & Benefits */}
        <div style={{ display: "flex", gap: 48, flex: 1 }}>
          {/* Concerns */}
          {topConcerns.length > 0 && (
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  marginBottom: 20,
                }}
              >
                ⚠️ Concerns
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {topConcerns.map((c, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(229,72,77,0.08)",
                      border: "1px solid rgba(229,72,77,0.2)",
                      borderRadius: 16,
                      padding: "14px 20px",
                      fontSize: 22,
                      color: "#fca5a5",
                      fontWeight: 500,
                    }}
                  >
                    ⚠ {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Benefits */}
          {topBenefits.length > 0 && (
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase" as const,
                  letterSpacing: "0.08em",
                  marginBottom: 20,
                }}
              >
                ✅ Good Points
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {topBenefits.map((b, i) => (
                  <div
                    key={i}
                    style={{
                      background: "rgba(52,211,153,0.08)",
                      border: "1px solid rgba(52,211,153,0.2)",
                      borderRadius: 16,
                      padding: "14px 20px",
                      fontSize: 22,
                      color: "#6ee7b7",
                      fontWeight: 500,
                    }}
                  >
                    ✅ {b}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer branding */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginTop: 40,
            paddingTop: 32,
            borderTop: "1px solid #1f293766",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: `linear-gradient(135deg, ${scoreColor}, ${scoreColor}88)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
              }}
            >
              🛡️
            </div>
            <span style={{ fontSize: 20, fontWeight: 600, color: "#9ca3af" }}>
              Scanned with PicSafe Food
            </span>
          </div>
          <span style={{ fontSize: 16, color: "#4b5563" }}>
            pic-safe-food.lovable.app
          </span>
        </div>
      </div>
    );
  }
);

ShareCard.displayName = "ShareCard";

export default ShareCard;
