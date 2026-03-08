import { useEffect, useState, useRef } from "react";

interface SafetyMeterProps {
  score: number;
  label: string;
}

const SafetyMeter = ({ score, label }: SafetyMeterProps) => {
  const [current, setCurrent] = useState(0);
  const animRef = useRef<number>();

  useEffect(() => {
    const duration = 900;
    const frameRate = 16;
    const steps = duration / frameRate;
    const increment = score / steps;
    let val = 0;

    const interval = setInterval(() => {
      val += increment;
      if (val >= score) {
        val = score;
        clearInterval(interval);
      }
      setCurrent(val);
    }, frameRate);

    return () => clearInterval(interval);
  }, [score]);

  const displayValue = Math.floor(current);
  const arcLength = 377;
  const offset = arcLength - (current / 100) * arcLength;
  const rotation = (current / 100) * 180 - 90;

  const getColor = (s: number) => {
    if (s <= 30) return "unsafe";
    if (s <= 60) return "moderate";
    return "safe";
  };

  const glowLabel = getColor(displayValue);

  return (
    <div className={`flex flex-col items-center glow-${glowLabel} rounded-3xl p-4`}>
      <div className="w-full max-w-[320px]">
        <svg viewBox="0 0 300 200" className="w-full">
          {/* Background arc */}
          <path
            d="M30 150 A120 120 0 0 1 270 150"
            stroke="hsl(var(--muted))"
            strokeWidth="20"
            fill="none"
          />

          {/* Gradient */}
          <defs>
            <linearGradient id="gaugeGrad">
              <stop offset="0%" stopColor="hsl(var(--safe))" />
              <stop offset="50%" stopColor="hsl(var(--moderate))" />
              <stop offset="100%" stopColor="hsl(var(--unsafe))" />
            </linearGradient>
          </defs>

          {/* Progress arc */}
          <path
            d="M30 150 A120 120 0 0 1 270 150"
            stroke="url(#gaugeGrad)"
            strokeWidth="20"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={arcLength}
            strokeDashoffset={offset}
            style={{ transition: "stroke-dashoffset 0.05s linear" }}
          />

          {/* Needle */}
          <line
            x1="150"
            y1="150"
            x2="150"
            y2="60"
            stroke={`hsl(var(--${glowLabel}))`}
            strokeWidth="4"
            style={{
              transformOrigin: "150px 150px",
              transform: `rotate(${rotation}deg)`,
              transition: "transform 0.05s linear",
            }}
          />

          {/* Center dot */}
          <circle cx="150" cy="150" r="6" fill={`hsl(var(--${glowLabel}))`} />

          {/* Score text */}
          <text x="150" y="185" textAnchor="middle" className="font-display font-bold" style={{ fontSize: "28px", fill: `hsl(var(--${glowLabel}))` }}>
            <tspan>{displayValue}</tspan>
            <tspan style={{ fontSize: "14px", fill: "hsl(var(--muted-foreground))" }}> / 100</tspan>
          </text>
        </svg>
      </div>

      <p
        className="mt-1 text-center text-lg font-semibold font-display"
        style={{ color: `hsl(var(--${glowLabel}))` }}
      >
        {label}
      </p>
    </div>
  );
};

export default SafetyMeter;
