import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface AnalysisCardProps {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  variant?: "default" | "warning" | "safe";
}

const AnalysisCard = ({ title, icon, children, defaultOpen = false, variant = "default" }: AnalysisCardProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  const borderColor = variant === "warning"
    ? "border-l-unsafe"
    : variant === "safe"
    ? "border-l-safe"
    : "border-l-primary";

  return (
    <div className={`bg-gradient-card rounded-2xl border border-border overflow-hidden border-l-4 ${borderColor}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-3">
          <span className="text-primary">{icon}</span>
          <span className="font-display font-semibold text-foreground">{title}</span>
        </div>
        <ChevronDown
          className={`w-5 h-5 text-muted-foreground transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}
      >
        <div className="px-4 pb-4 text-sm text-secondary-foreground leading-relaxed">
          {children}
        </div>
      </div>
    </div>
  );
};

export default AnalysisCard;
