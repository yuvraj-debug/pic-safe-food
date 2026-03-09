import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { SideMenu } from "@/components/SideMenu";
import { ArrowLeft, Trophy, Shield, AlertTriangle, Leaf, Bug } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { AnalysisResult } from "@/types/analysis";

interface ScanRecord {
  id: string;
  product_name: string;
  safety_score: number;
  safety_level: string;
  analysis: AnalysisResult;
}

const getScoreColor = (score: number) => {
  if (score <= 30) return "text-unsafe";
  if (score <= 60) return "text-moderate";
  return "text-safe";
};

const getScoreBorder = (score: number) => {
  if (score <= 30) return "border-unsafe/30";
  if (score <= 60) return "border-moderate/30";
  return "border-safe/30";
};

const ProductCard = ({ scan, isWinner }: { scan: ScanRecord; isWinner: boolean }) => {
  const analysis = scan.analysis;
  return (
    <div className={`flex-1 min-w-0 bg-gradient-card rounded-xl border ${getScoreBorder(scan.safety_score)} p-3 space-y-3 relative`}>
      {isWinner && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-safe/20 text-safe text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 border border-safe/30">
          <Trophy className="w-3 h-3" /> Healthier
        </div>
      )}

      {/* Score */}
      <div className="text-center pt-2">
        <p className="text-xs text-muted-foreground truncate mb-1">{scan.product_name}</p>
        <span className={`text-3xl font-bold font-display ${getScoreColor(scan.safety_score)}`}>
          {scan.safety_score}
        </span>
        <span className="text-xs text-muted-foreground">/100</span>
      </div>

      {/* Harmful */}
      {analysis?.harmful_ingredients?.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1">
            <AlertTriangle className="w-3 h-3 text-unsafe" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Harmful</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {analysis.harmful_ingredients.map((ing, i) => (
              <span key={i} className="text-[10px] bg-unsafe/10 text-unsafe border border-unsafe/20 rounded-md px-1.5 py-0.5">
                {ing}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Beneficial */}
      {analysis?.beneficial_ingredients?.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Leaf className="w-3 h-3 text-safe" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Good</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {analysis.beneficial_ingredients.map((ing, i) => (
              <span key={i} className="text-[10px] bg-safe/10 text-safe border border-safe/20 rounded-md px-1.5 py-0.5">
                {ing}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Allergens */}
      {analysis?.allergens?.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Bug className="w-3 h-3 text-moderate" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Allergens</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {analysis.allergens.map((a, i) => (
              <span key={i} className="text-[10px] bg-moderate/10 text-moderate border border-moderate/20 rounded-md px-1.5 py-0.5">
                {a}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Warnings */}
      {analysis?.health_warnings?.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-1">
            <Shield className="w-3 h-3 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Warnings</span>
          </div>
          <ul className="space-y-0.5">
            {analysis.health_warnings.slice(0, 3).map((w, i) => (
              <li key={i} className="text-[10px] text-muted-foreground">• {w}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const ComparePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [productA, setProductA] = useState<string>("");
  const [productB, setProductB] = useState<string>("");

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("scan_results")
        .select("id, product_name, safety_score, safety_level, analysis")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (data) setScans(data as unknown as ScanRecord[]);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const scanA = scans.find((s) => s.id === productA);
  const scanB = scans.find((s) => s.id === productB);
  const bothSelected = scanA && scanB;
  const winnerId = bothSelected
    ? scanA.safety_score >= scanB.safety_score
      ? scanA.id
      : scanB.id
    : null;

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-6 pb-4">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center">
          <ArrowLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-lg font-bold font-display text-foreground">Compare Products</h1>
      </div>

      {/* Selectors */}
      <div className="px-4 space-y-3 mb-4">
        <Select value={productA} onValueChange={setProductA}>
          <SelectTrigger className="bg-card border-border">
            <SelectValue placeholder="Select first product" />
          </SelectTrigger>
          <SelectContent>
            {scans
              .filter((s) => s.id !== productB)
              .map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.product_name} ({s.safety_score}/100)
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <div className="flex items-center justify-center">
          <span className="text-xs text-muted-foreground font-display font-semibold">VS</span>
        </div>

        <Select value={productB} onValueChange={setProductB}>
          <SelectTrigger className="bg-card border-border">
            <SelectValue placeholder="Select second product" />
          </SelectTrigger>
          <SelectContent>
            {scans
              .filter((s) => s.id !== productA)
              .map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.product_name} ({s.safety_score}/100)
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Comparison */}
      {bothSelected ? (
        <div className="px-4 flex gap-2">
          <ProductCard scan={scanA} isWinner={winnerId === scanA.id && scanA.safety_score !== scanB.safety_score} />
          <ProductCard scan={scanB} isWinner={winnerId === scanB.id && scanA.safety_score !== scanB.safety_score} />
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="text-center">
            <Shield className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              {loading ? "Loading your scans..." : scans.length < 2 ? "You need at least 2 scanned products to compare" : "Select two products to compare"}
            </p>
          </div>
        </div>
      )}

      {/* Verdict */}
      {bothSelected && scanA.safety_score !== scanB.safety_score && (
        <div className="px-4 mt-4">
          <div className="bg-safe/10 border border-safe/20 rounded-xl p-3 text-center">
            <p className="text-sm text-safe font-medium">
              🏆 <span className="font-semibold">{winnerId === scanA.id ? scanA.product_name : scanB.product_name}</span> is the healthier choice
            </p>
            <p className="text-[10px] text-muted-foreground mt-1">
              Score difference: {Math.abs(scanA.safety_score - scanB.safety_score)} points
            </p>
          </div>
        </div>
      )}

      <SideMenu />
      <BottomNav />
    </div>
  );
};

export default ComparePage;
