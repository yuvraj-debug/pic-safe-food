import { useNavigate } from "react-router-dom";
import { ScanLine, ShieldCheck, History, Clock, ChevronRight, Trash2 } from "lucide-react";
import { getHistory, clearHistory } from "@/lib/scanHistory";
import { useState } from "react";
import type { ScanHistoryItem } from "@/types/analysis";
import { useAuth } from "@/hooks/useAuth";
import { useScanLimit } from "@/hooks/useScanLimit";
import { BottomNav } from "@/components/BottomNav";

const getScoreColor = (score: number) => {
  if (score <= 30) return "text-unsafe";
  if (score <= 60) return "text-moderate";
  return "text-safe";
};

const getScoreBg = (score: number) => {
  if (score <= 30) return "bg-unsafe/10 border-unsafe/20";
  if (score <= 60) return "bg-moderate/10 border-moderate/20";
  return "bg-safe/10 border-safe/20";
};

const HomePage = () => {
  const navigate = useNavigate();
  const [history] = useState<ScanHistoryItem[]>(getHistory());
  const { remaining, limit, planName } = useScanLimit();

  const handleClearHistory = () => {
    clearHistory();
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col pb-24">
      {/* Hero Section */}
      <div className="flex flex-col items-center pt-12 pb-6 px-6">
        <div className="flex flex-col items-center gap-5 max-w-sm w-full">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center glow-primary">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>

          {/* Title */}
          <div className="text-center">
            <h1 className="text-3xl font-bold font-display text-gradient-primary">
              FoodScan AI
            </h1>
            <p className="mt-1 text-muted-foreground text-sm">
              Know what you're really eating
            </p>
          </div>

          {/* Scan limit badge */}
          <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border text-sm">
            <ScanLine className="w-4 h-4 text-primary" />
            <span className="text-muted-foreground">
              <span className="text-foreground font-semibold">{remaining}</span> / {limit} scans left
            </span>
            <span className="text-xs text-muted-foreground capitalize">({planName})</span>
          </div>

          {/* Scan Button */}
          <button
            onClick={() => navigate("/scan")}
            className="w-full flex items-center justify-center gap-3 bg-primary text-primary-foreground font-display font-semibold text-lg py-4 px-8 rounded-2xl glow-primary hover:brightness-110 active:scale-[0.98] transition-all duration-200"
          >
            <ScanLine className="w-6 h-6" />
            Scan Product
          </button>

          {/* How it works */}
          <div className="grid grid-cols-3 gap-3 w-full mt-1">
            {[
              { emoji: "📷", label: "Take Photo" },
              { emoji: "🔍", label: "Auto Detect" },
              { emoji: "✅", label: "Get Results" },
            ].map((step, i) => (
              <div key={i} className="bg-card rounded-xl border border-border p-3 text-center">
                <span className="text-lg">{step.emoji}</span>
                <p className="text-xs text-muted-foreground mt-1">{step.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* History Section */}
      {history.length > 0 && (
        <div className="flex-1 px-4 pb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Recent Scans
              </h2>
            </div>
            <button onClick={handleClearHistory} className="text-muted-foreground hover:text-destructive transition-colors p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2">
            {history.slice(0, 5).map((item) => (
              <button
                key={item.id}
                onClick={() => navigate("/results", { state: { analysis: item.analysis } })}
                className="w-full bg-gradient-card rounded-xl border border-border p-3 flex items-center gap-3 hover:border-primary/30 active:scale-[0.99] transition-all text-left"
              >
                <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border ${getScoreBg(item.safetyScore)}`}>
                  <span className={`text-lg font-bold font-display ${getScoreColor(item.safetyScore)}`}>
                    {item.safetyScore}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-sm font-medium truncate">
                    {item.productName}
                  </p>
                  <div className="flex items-center gap-1 mt-0.5">
                    <Clock className="w-3 h-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.timestamp).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default HomePage;
