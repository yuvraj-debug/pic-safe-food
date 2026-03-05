import { useEffect, useState } from "react";

interface SafetyMeterProps {
  score: number;
  label: string;
}

const SafetyMeter = ({ score, label }: SafetyMeterProps) => {
  const [animatedScore, setAnimatedScore] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedScore(score), 200);
    return () => clearTimeout(timer);
  }, [score]);

  const getColor = (s: number) => {
    if (s <= 30) return { color: "hsl(var(--unsafe))", class: "glow-unsafe" };
    if (s <= 60) return { color: "hsl(var(--moderate))", class: "glow-moderate" };
    return { color: "hsl(var(--safe))", class: "glow-safe" };
  };

  const { color, class: glowClass } = getColor(animatedScore);

  // Semicircle: angle from -90 to 90 degrees (left to right)
  const angle = -90 + (animatedScore / 100) * 180;
  const radians = (angle * Math.PI) / 180;

  // SVG arc parameters
  const cx = 150, cy = 140, r = 110;
  const needleX = cx + r * Math.cos(radians);
  const needleY = cy + r * Math.sin(radians);

  // Create arc segments
  const createArc = (startAngle: number, endAngle: number) => {
    const start = {
      x: cx + r * Math.cos((startAngle * Math.PI) / 180),
      y: cy + r * Math.sin((startAngle * Math.PI) / 180),
    };
    const end = {
      x: cx + r * Math.cos((endAngle * Math.PI) / 180),
      y: cy + r * Math.sin((endAngle * Math.PI) / 180),
    };
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
  };

  return (
    <div className={`flex flex-col items-center ${glowClass} rounded-3xl p-6`}>
      <svg viewBox="0 0 300 170" className="w-full max-w-[280px]">
        {/* Background track */}
        <path
          d={createArc(-180, 0)}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="18"
          strokeLinecap="round"
        />
        {/* Red zone */}
        <path
          d={createArc(-180, -180 + 54)}
          fill="none"
          stroke="hsl(var(--unsafe))"
          strokeWidth="18"
          strokeLinecap="round"
          opacity={0.7}
        />
        {/* Orange zone */}
        <path
          d={createArc(-180 + 54, -180 + 108)}
          fill="none"
          stroke="hsl(var(--moderate))"
          strokeWidth="18"
          strokeLinecap="round"
          opacity={0.7}
        />
        {/* Green zone */}
        <path
          d={createArc(-180 + 108, 0)}
          fill="none"
          stroke="hsl(var(--safe))"
          strokeWidth="18"
          strokeLinecap="round"
          opacity={0.7}
        />
        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          style={{
            transition: "all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        />
        {/* Center dot */}
        <circle cx={cx} cy={cy} r="6" fill={color} />
        {/* Score text */}
        <text
          x={cx}
          y={cy + 35}
          textAnchor="middle"
          fill="currentColor"
          className="font-display"
          fontSize="32"
          fontWeight="700"
          fontFamily="Space Grotesk"
        >
          {animatedScore}
        </text>
        <text
          x={cx}
          y={cy + 50}
          textAnchor="middle"
          fill="hsl(var(--muted-foreground))"
          fontSize="12"
          fontFamily="Inter"
        >
          / 100
        </text>
      </svg>
      <p
        className="mt-2 text-center text-lg font-semibold font-display"
        style={{ color }}
      >
        {label}
      </p>
    </div>
  );
};

export default SafetyMeter;
