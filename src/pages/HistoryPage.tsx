import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { History, Clock, ChevronRight, Trash2, Loader2, Search, Filter, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { SideMenu } from "@/components/SideMenu";
import { toast } from "sonner";
import type { AnalysisResult } from "@/types/analysis";
import { normalizeAnalysis } from "@/lib/analysisNormalizer";

interface ScanRecord {
  id: string;
  product_name: string;
  safety_score: number;
  safety_level: string;
  analysis: AnalysisResult;
  created_at: string;
}

type SafetyFilter = "all" | "safe" | "moderate" | "unsafe";
type DateFilter = "all" | "today" | "week" | "month";

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

const safetyFilters: { value: SafetyFilter; label: string; color: string }[] = [
  { value: "all", label: "All", color: "bg-muted text-muted-foreground" },
  { value: "safe", label: "Safe", color: "bg-safe/15 text-safe border-safe/20" },
  { value: "moderate", label: "Moderate", color: "bg-moderate/15 text-moderate border-moderate/20" },
  { value: "unsafe", label: "Unsafe", color: "bg-unsafe/15 text-unsafe border-unsafe/20" },
];

const dateFilters: { value: DateFilter; label: string }[] = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
];

const HistoryPage = () => {
  const navigate = useNavigate();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [safetyFilter, setSafetyFilter] = useState<SafetyFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("scan_results")
        .select("id, product_name, safety_score, safety_level, analysis, created_at")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        toast.error("Failed to load history");
      } else {
        setScans(
          (data ?? []).map((row) => ({
            id: row.id,
            product_name: row.product_name,
            safety_score: row.safety_score,
            safety_level: row.safety_level,
            analysis: normalizeAnalysis(row.analysis),
            created_at: row.created_at,
          }))
        );
      }
      setLoading(false);
    };

    void fetchHistory();
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    const { error } = await supabase.from("scan_results").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
    } else {
      setScans((prev) => prev.filter((scan) => scan.id !== id));
      toast.success("Scan removed");
    }
  }, []);

  const filteredScans = useMemo(() => {
    let result = scans;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((scan) => scan.product_name.toLowerCase().includes(query));
    }

    if (safetyFilter !== "all") {
      result = result.filter((scan) => {
        if (safetyFilter === "safe") return scan.safety_score > 60;
        if (safetyFilter === "moderate") return scan.safety_score > 30 && scan.safety_score <= 60;
        return scan.safety_score <= 30;
      });
    }

    if (dateFilter !== "all") {
      const now = new Date();
      let cutoff: Date;
      if (dateFilter === "today") {
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateFilter === "week") {
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      result = result.filter((scan) => new Date(scan.created_at) >= cutoff);
    }

    return result;
  }, [dateFilter, safetyFilter, scans, searchQuery]);

  const activeFilterCount = (safetyFilter !== "all" ? 1 : 0) + (dateFilter !== "all" ? 1 : 0);

  return (
    <div className="min-h-screen bg-background flex flex-col pb-24">
      <div className="p-4 pb-2">
        <div className="flex items-center gap-2 mb-1">
          <History className="w-5 h-5 text-primary" />
          <h1 className="font-display font-bold text-xl text-foreground">Scan History</h1>
        </div>
        <p className="text-muted-foreground text-sm">
          {scans.length} scan{scans.length !== 1 ? "s" : ""} saved
        </p>
      </div>

      {!loading && scans.length > 0 && (
        <div className="px-4 space-y-2 mb-3">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-card border border-border rounded-xl py-2.5 pl-9 pr-8 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/40 transition-colors"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 rounded-xl border transition-colors text-sm font-medium ${
                activeFilterCount > 0
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-card border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-bold">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {showFilters && (
            <div className="bg-card border border-border rounded-xl p-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">Safety Level</p>
                <div className="flex flex-wrap gap-1.5">
                  {safetyFilters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setSafetyFilter(filter.value)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                        safetyFilter === filter.value
                          ? filter.value === "all"
                            ? "bg-primary/15 text-primary border-primary/30"
                            : `${filter.color} border`
                          : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-muted-foreground font-medium mb-2 uppercase tracking-wider">Date Range</p>
                <div className="flex flex-wrap gap-1.5">
                  {dateFilters.map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setDateFilter(filter.value)}
                      className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                        dateFilter === filter.value
                          ? "bg-primary/15 text-primary border-primary/30"
                          : "bg-muted/50 text-muted-foreground border-transparent hover:bg-muted"
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setSafetyFilter("all"); setDateFilter("all"); }}
                  className="text-xs text-destructive hover:underline font-medium"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>
      )}

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
      ) : filteredScans.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
          <Search className="w-10 h-10 text-muted-foreground/40 mb-3" />
          <p className="text-muted-foreground text-sm">No scans match your filters</p>
          <button
            onClick={() => { setSearchQuery(""); setSafetyFilter("all"); setDateFilter("all"); }}
            className="mt-3 text-primary text-sm font-medium hover:underline"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="px-4 space-y-2">
          {filteredScans.map((item) => (
            <div
              key={item.id}
              className="w-full bg-gradient-card rounded-xl border border-border p-3 flex items-center gap-3 hover:border-primary/30 transition-all"
            >
              <button
                onClick={() => navigate("/results", { state: { analysis: item.analysis } })}
                className="flex-1 flex items-center gap-3 text-left"
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
                      {new Date(item.created_at).toLocaleDateString()} - {new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              <button
                onClick={() => void handleDelete(item.id)}
                className="p-2 text-muted-foreground hover:text-destructive transition-colors rounded-lg hover:bg-destructive/10"
                aria-label={`Delete ${item.product_name}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <SideMenu />
      <BottomNav />
    </div>
  );
};

export default HistoryPage;
