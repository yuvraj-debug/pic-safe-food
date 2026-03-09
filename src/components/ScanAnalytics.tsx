import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronUp, AlertTriangle, Activity } from "lucide-react";
import type { AnalysisResult } from "@/types/analysis";

interface ScanRecord {
  safety_score: number;
  analysis: AnalysisResult;
  created_at: string;
}

const SCORE_COLORS = {
  safe: "hsl(var(--safe))",
  moderate: "hsl(var(--moderate))",
  unsafe: "hsl(var(--unsafe))",
};

export const ScanAnalytics = () => {
  const { user } = useAuth();
  const [scans, setScans] = useState<ScanRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchScans = async () => {
      const { data } = await supabase
        .from("scan_results")
        .select("safety_score, analysis, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      if (data) setScans(data as unknown as ScanRecord[]);
      setLoading(false);
    };
    fetchScans();
  }, [user]);

  const stats = useMemo(() => {
    if (scans.length < 2) return null;

    const avgScore = Math.round(scans.reduce((s, r) => s + r.safety_score, 0) / scans.length);

    // Weekly data (last 4 weeks)
    const now = new Date();
    const weeklyData = Array.from({ length: 4 }, (_, i) => {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (3 - i) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const weekScans = scans.filter((s) => {
        const d = new Date(s.created_at);
        return d >= weekStart && d < weekEnd;
      });
      const avg = weekScans.length
        ? Math.round(weekScans.reduce((a, b) => a + b.safety_score, 0) / weekScans.length)
        : 0;
      return {
        label: `W${4 - i}`,
        scans: weekScans.length,
        avgScore: avg,
      };
    }).reverse();

    // Safety distribution
    const safe = scans.filter((s) => s.safety_score > 60).length;
    const moderate = scans.filter((s) => s.safety_score > 30 && s.safety_score <= 60).length;
    const unsafe = scans.filter((s) => s.safety_score <= 30).length;
    const distribution = [
      { name: "Safe", value: safe, color: SCORE_COLORS.safe },
      { name: "Moderate", value: moderate, color: SCORE_COLORS.moderate },
      { name: "Unsafe", value: unsafe, color: SCORE_COLORS.unsafe },
    ].filter((d) => d.value > 0);

    // Top harmful ingredients
    const ingredientCount: Record<string, number> = {};
    scans.forEach((s) => {
      const analysis = s.analysis as AnalysisResult;
      analysis?.harmful_ingredients?.forEach((ing) => {
        const key = ing.toLowerCase().trim();
        ingredientCount[key] = (ingredientCount[key] || 0) + 1;
      });
    });
    const topHarmful = Object.entries(ingredientCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Trend (compare first half vs second half avg)
    const mid = Math.floor(scans.length / 2);
    const recentAvg = scans.slice(0, mid).reduce((a, b) => a + b.safety_score, 0) / mid;
    const olderAvg = scans.slice(mid).reduce((a, b) => a + b.safety_score, 0) / (scans.length - mid);
    const trend = recentAvg > olderAvg + 3 ? "up" : recentAvg < olderAvg - 3 ? "down" : "stable";

    return { avgScore, weeklyData, distribution, topHarmful, trend };
  }, [scans]);

  if (loading || !stats) return null;

  const TrendIcon = stats.trend === "up" ? TrendingUp : stats.trend === "down" ? TrendingDown : Minus;
  const trendColor = stats.trend === "up" ? "text-safe" : stats.trend === "down" ? "text-unsafe" : "text-muted-foreground";

  return (
    <div className="px-4 max-w-2xl mx-auto w-full mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full mb-3"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <h2 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
            Your Insights
          </h2>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="space-y-3">
          {/* Average Score + Trend */}
          <div className="bg-gradient-card rounded-xl border border-border p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="text-xs text-muted-foreground mb-1">Average Safety Score</p>
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold font-display text-foreground">{stats.avgScore}</span>
                <span className="text-xs text-muted-foreground">/100</span>
                <TrendIcon className={`w-5 h-5 ${trendColor}`} />
              </div>
              <p className="text-[10px] text-muted-foreground mt-1">
                Based on {scans.length} scans
              </p>
            </div>

            {/* Mini pie */}
            <div className="w-20 h-20">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.distribution}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    innerRadius={22}
                    outerRadius={36}
                    strokeWidth={0}
                  >
                    {stats.distribution.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg px-2 py-1 text-xs shadow-lg">
                          <span style={{ color: d.color }}>{d.name}</span>: {d.value}
                        </div>
                      );
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly bar chart */}
          <div className="bg-gradient-card rounded-xl border border-border p-4">
            <p className="text-xs text-muted-foreground mb-3">Weekly Scan Activity</p>
            <div className="h-24">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.weeklyData}>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                  <YAxis hide />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload;
                      return (
                        <div className="bg-card border border-border rounded-lg px-2 py-1 text-xs shadow-lg">
                          <div>{d.scans} scans</div>
                          {d.avgScore > 0 && <div>Avg: {d.avgScore}/100</div>}
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="scans" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Top harmful ingredients */}
          {stats.topHarmful.length > 0 && (
            <div className="bg-gradient-card rounded-xl border border-border p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-3.5 h-3.5 text-unsafe" />
                <p className="text-xs text-muted-foreground">Most Found Harmful Ingredients</p>
              </div>
              <div className="space-y-2">
                {stats.topHarmful.map((item) => (
                  <div key={item.name} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs text-foreground capitalize truncate">{item.name}</span>
                        <span className="text-[10px] text-muted-foreground ml-2">{item.count}x</span>
                      </div>
                      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-unsafe/70 rounded-full"
                          style={{ width: `${Math.min((item.count / scans.length) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-[10px] text-muted-foreground">
            {stats.distribution.map((d) => (
              <div key={d.name} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                <span>{d.name} ({d.value})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
