import { useEffect, useState, useRef, forwardRef } from "react";

interface SafetyMeterProps {
  score: number;
  label: string;
}

const SafetyMeter = forwardRef<HTMLDivElement, SafetyMeterProps>(({ score, label }, _ref) => {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const duration = 900;
    const startTime = performance.now();

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const val = eased * score;
      setCurrent(val);

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [score]);

  const displayValue = Math.floor(current);
  const arcLength = 377;
  const offset = arcLength - (current / 100) * arcLength;
  const rotation = (current / 100) * 180 - 90;

  const glowLabel = current <= 30 ? "unsafe" : current <= 60 ? "moderate" : "safe";

  return (
    <div className={`flex flex-col items-center glow-${glowLabel} rounded-3xl p-4`}>
      <div className="w-full max-w-[320px]">
        <svg viewBox="0 0 300 200" className="w-full">
          <path
            d="M30 150 A120 120 0 0 1 270 150"
            stroke="hsl(var(--muted))"
            strokeWidth="20"
            fill="none"
          />
          <path
            d="M30 150 A120 120 0 0 1 270 150"
            stroke={`hsl(var(--${glowLabel}))`}
            strokeWidth="20"
            strokeLinecap="round"
            fill="none"
            strokeDasharray={arcLength}
            strokeDashoffset={offset}
            style={{ filter: `drop-shadow(0 0 8px hsl(var(--${glowLabel}) / 0.4))`, transition: "stroke 0.3s ease" }}
          />
          <line
            x1="150" y1="150" x2="150" y2="60"
            stroke={`hsl(var(--${glowLabel}))`}
            strokeWidth="4"
            style={{
              transformOrigin: "150px 150px",
              transform: `rotate(${rotation}deg)`,
            }}
          />
          <circle cx="150" cy="150" r="6" fill={`hsl(var(--${glowLabel}))`} />
          <text x="150" y="185" textAnchor="middle" className="font-display font-bold" style={{ fontSize: "28px", fill: `hsl(var(--${glowLabel}))` }}>
            <tspan>{displayValue}</tspan>
            <tspan style={{ fontSize: "14px", fill: "hsl(var(--muted-foreground))" }}> / 100</tspan>
          </text>
        </svg>
      </div>
      <p className="mt-1 text-center text-lg font-semibold font-display" style={{ color: `hsl(var(--${glowLabel}))` }}>
        {label}
      </p>
    </div>
  );
});

SafetyMeter.displayName = "SafetyMeter";
export default SafetyMeter;
