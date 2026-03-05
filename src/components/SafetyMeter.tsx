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
    if (s <= 30) return { color: "hsl(var(--unsafe))", label: "unsafe" };
    if (s <= 60) return { color: "hsl(var(--moderate))", label: "moderate" };
    return { color: "hsl(var(--safe))", label: "safe" };
  };

  const { color, label: glowLabel } = getColor(animatedScore);

  const strokeWidth = 22;
  const diameter = 280;
  const coordinateForCircle = diameter / 2;
  const radius = (diameter - 2 * strokeWidth) / 2;
  const circumference = Math.PI * radius;
  const semiCirclePercentage = animatedScore * (circumference / 100);

  // Arrow needle position
  const needleAngle = 180 + (animatedScore / 100) * 180;
  const needleRadians = (needleAngle * Math.PI) / 180;
  const needleLength = radius - 10;
  const needleX = coordinateForCircle + needleLength * Math.cos(needleRadians);
  const needleY = coordinateForCircle + needleLength * Math.sin(needleRadians);

  // Arrow head
  const arrowSize = 10;
  const arrowAngle1 = needleRadians + 0.3;
  const arrowAngle2 = needleRadians - 0.3;
  const arrowTipX = coordinateForCircle + (needleLength + 5) * Math.cos(needleRadians);
  const arrowTipY = coordinateForCircle + (needleLength + 5) * Math.sin(needleRadians);
  const arrowBase1X = coordinateForCircle + (needleLength - arrowSize) * Math.cos(arrowAngle1);
  const arrowBase1Y = coordinateForCircle + (needleLength - arrowSize) * Math.sin(arrowAngle1);
  const arrowBase2X = coordinateForCircle + (needleLength - arrowSize) * Math.cos(arrowAngle2);
  const arrowBase2Y = coordinateForCircle + (needleLength - arrowSize) * Math.sin(arrowAngle2);

  return (
    <div className={`flex flex-col items-center glow-${glowLabel} rounded-3xl p-4`}>
      <div className="relative">
        <svg
          width={diameter}
          height={diameter / 2 + 20}
          viewBox={`0 0 ${diameter} ${diameter / 2 + 20}`}
          className="w-full max-w-[280px]"
        >
          <defs>
            <linearGradient id="meterGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--unsafe))" />
              <stop offset="40%" stopColor="hsl(var(--moderate))" />
              <stop offset="100%" stopColor="hsl(var(--safe))" />
            </linearGradient>
          </defs>

          {/* Background track */}
          <circle
            cx={coordinateForCircle}
            cy={coordinateForCircle}
            r={radius}
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth={8}
            strokeDasharray={circumference}
            style={{ strokeDashoffset: circumference }}
          />

          {/* Active arc */}
          <circle
            cx={coordinateForCircle}
            cy={coordinateForCircle}
            r={radius}
            fill="none"
            stroke="url(#meterGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            style={{
              strokeDashoffset: semiCirclePercentage,
              transition: "stroke-dashoffset 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
              transform: "rotateY(180deg)",
              transformOrigin: "center",
            }}
          />

          {/* Needle line */}
          <line
            x1={coordinateForCircle}
            y1={coordinateForCircle}
            x2={needleX}
            y2={needleY}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
            style={{
              transition: "all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />

          {/* Arrow head */}
          <polygon
            points={`${arrowTipX},${arrowTipY} ${arrowBase1X},${arrowBase1Y} ${arrowBase2X},${arrowBase2Y}`}
            fill={color}
            style={{
              transition: "all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />

          {/* Center dot */}
          <circle cx={coordinateForCircle} cy={coordinateForCircle} r="8" fill={color} />
          <circle cx={coordinateForCircle} cy={coordinateForCircle} r="4" fill="hsl(var(--background))" />
        </svg>
      </div>

      {/* Score text below */}
      <div className="text-center -mt-2">
        <span
          className="text-4xl font-bold font-display"
          style={{ color }}
        >
          {animatedScore}
        </span>
        <span className="text-muted-foreground text-sm ml-1">/ 100</span>
      </div>

      <p
        className="mt-1 text-center text-lg font-semibold font-display"
        style={{ color }}
      >
        {label}
      </p>
    </div>
  );
};

export default SafetyMeter;
