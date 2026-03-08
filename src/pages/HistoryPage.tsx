import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { History, Clock, ChevronRight, Trash2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";
import type { AnalysisResult } from "@/types/analysis";

interface ScanRecord {
  id: string;
  product_name: string;
  safety_score: number;
  safety_level: string;
  analysis: AnalysisResult;
  created_at: string;
}

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

const HistoryPage = () => {
  const navigate = useNavigate();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("scan_results")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast.error("Failed to load history");
    } else {
      setScans((data as ScanRecord[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { error } = await supabase.from("scan_results").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      setScans((prev) => prev.filter((s) => s.id !== id));
      toast.success("Scan removed");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <History className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-xl text-foreground">Scan History</h1>
        </div>
        <p className="text-muted-foreground text-sm">Your past scan results, saved across devices.</p>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : scans.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <History className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No scans yet. Start scanning products!</p>
          <button
            onClick={() => navigate("/scan")}
            className="mt-4 bg-primary text-primary-foreground font-display font-semibold py-3 px-8 rounded-2xl hover:brightness-110 active:scale-[0.98] transition-all"
          >
            Scan Now
          </button>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {scans.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate("/results", { state: { analysis: item.analysis } })}
              className="w-full bg-gradient-card rounded-xl border border-border p-3 flex items-center gap-3 hover:border-primary/30 active:scale-[0.99] transition-all text-left"
            >
              <div className={`w-12 h-12 rounded-xl flex flex-col items-center justify-center border ${getScoreBg(item.safety_score)}`}>
                <span className={`text-lg font-bold font-display ${getScoreColor(item.safety_score)}`}>
                  {item.safety_score}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-foreground text-sm font-medium truncate">
                  {item.product_name}
                </p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.created_at).toLocaleDateString()} · {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <button
                onClick={(e) => handleDelete(item.id, e)}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      <BottomNav />
    </div>
  );
};

export default HistoryPage;
