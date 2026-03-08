import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Users, Crown, Loader2, Search, RefreshCw,
  Shield, BarChart3, Mail, Calendar, ChevronDown, ChevronUp, Clock,
} from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";

interface ScanEntry {
  id: string;
  scanned_at: string;
}

interface UserRow {
  id: string;
  email: string;
  created_at: string;
  plan: string;
  scan_count: number;
}

const AdminPage = () => {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingUser, setUpdatingUser] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "scans">("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [userScans, setUserScans] = useState<Record<string, ScanEntry[]>>({});
  const [loadingScans, setLoadingScans] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate("/");
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    const [{ data: profiles }, { data: plans }, { data: scans }] = await Promise.all([
      supabase.from("profiles").select("*"),
      supabase.from("user_plans").select("*"),
      supabase.from("scan_logs").select("user_id"),
    ]);

    const scanCounts: Record<string, number> = {};
    scans?.forEach((s: any) => {
      scanCounts[s.user_id] = (scanCounts[s.user_id] || 0) + 1;
    });

    const userList: UserRow[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      email: p.email,
      created_at: p.created_at,
      plan: (plans?.find((pl: any) => pl.user_id === p.id)?.plan as string) ?? "free",
      scan_count: scanCounts[p.id] ?? 0,
    }));

    setUsers(userList);
    setLoading(false);
  };

  const fetchUserScans = async (userId: string) => {
    if (userScans[userId]) return;
    setLoadingScans(userId);
    const { data } = await supabase
      .from("scan_logs")
      .select("id, scanned_at")
      .eq("user_id", userId)
      .order("scanned_at", { ascending: false })
      .limit(50);
    setUserScans((prev) => ({ ...prev, [userId]: data ?? [] }));
    setLoadingScans(null);
  };

  const handleExpand = (userId: string) => {
    const isExpanding = expandedUser !== userId;
    setExpandedUser(isExpanding ? userId : null);
    if (isExpanding) fetchUserScans(userId);
  };

  const changePlan = async (userId: string, newPlan: string) => {
    setUpdatingUser(userId);
    const { error } = await supabase
      .from("user_plans")
      .update({ plan: newPlan as any })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed: " + error.message);
    } else {
      toast.success(`Plan updated to ${newPlan}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u))
      );
    }
    setUpdatingUser(null);
  };

  const sortedUsers = [...users]
    .filter((u) => u.email.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "scans") return (a.scan_count - b.scan_count) * dir;
      return (new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) * dir;
    });

  const stats = {
    total: users.length,
    free: users.filter((u) => u.plan === "free").length,
    basic: users.filter((u) => u.plan === "basic").length,
    premium: users.filter((u) => u.plan === "premium").length,
    totalScans: users.reduce((sum, u) => sum + u.scan_count, 0),
  };

  const toggleSort = (key: "date" | "scans") => {
    if (sortBy === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(key); setSortDir("desc"); }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

  const planColors: Record<string, string> = {
    free: "bg-muted text-muted-foreground",
    basic: "bg-accent/15 text-accent-foreground",
    premium: "bg-primary/15 text-primary",
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="bg-gradient-hero border-b border-border">
        <div className="flex items-center gap-3 p-4">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <Shield className="w-5 h-5 text-primary" />
            <h1 className="font-display font-bold text-lg text-foreground">Admin Panel</h1>
          </div>
          <button onClick={fetchUsers} className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Grid */}
        <div className="px-4 pb-4 grid grid-cols-2 gap-3">
          <div className="bg-card rounded-2xl border border-border p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold font-display text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Total Users</p>
            </div>
          </div>
          <div className="bg-card rounded-2xl border border-border p-3 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-xl font-bold font-display text-foreground">{stats.totalScans}</p>
              <p className="text-[10px] text-muted-foreground">Total Scans</p>
            </div>
          </div>
          <div className="col-span-2 bg-card rounded-2xl border border-border p-3 flex items-center justify-around">
            {(["free", "basic", "premium"] as const).map((plan) => (
              <div key={plan} className="text-center">
                <p className="text-lg font-bold font-display text-foreground">{stats[plan]}</p>
                <span className={`text-[10px] font-semibold uppercase px-2 py-0.5 rounded-md ${planColors[plan]}`}>
                  {plan}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Sort */}
      <div className="px-4 py-3 space-y-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-xl py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
        <div className="flex gap-2">
          {(["date", "scans"] as const).map((key) => (
            <button
              key={key}
              onClick={() => toggleSort(key)}
              className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                sortBy === key ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {key === "date" ? "Date" : "Scans"}
              {sortBy === key && (sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />)}
            </button>
          ))}
        </div>
      </div>

      {/* User List */}
      <div className="px-4 space-y-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {sortedUsers.length} user{sortedUsers.length !== 1 ? "s" : ""} found
        </p>

        {sortedUsers.map((user) => {
          const isExpanded = expandedUser === user.id;
          const scans = userScans[user.id] ?? [];
          return (
            <div key={user.id} className="bg-gradient-card rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => handleExpand(user.id)}
                className="w-full p-4 flex items-center justify-between text-left"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(user.created_at).toLocaleDateString()}
                    </span>
                    <span>{user.scan_count} scans</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-[10px] font-display font-bold uppercase px-2 py-1 rounded-lg ${planColors[user.plan]}`}>
                    {user.plan}
                  </span>
                  {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>

              {isExpanded && (
                <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
                  {/* User Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-secondary/50 rounded-xl p-2.5">
                      <p className="text-muted-foreground mb-0.5">User ID</p>
                      <p className="text-foreground font-mono text-[10px] break-all">{user.id}</p>
                    </div>
                    <div className="bg-secondary/50 rounded-xl p-2.5">
                      <p className="text-muted-foreground mb-0.5">Scans Used</p>
                      <p className="text-foreground font-bold text-base">{user.scan_count}</p>
                    </div>
                  </div>

                  {/* Plan Switcher */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Change Plan</p>
                    <div className="flex items-center gap-2">
                      {["free", "basic", "premium"].map((plan) => (
                        <button
                          key={plan}
                          onClick={() => changePlan(user.id, plan)}
                          disabled={updatingUser === user.id || user.plan === plan}
                          className={`flex-1 text-xs font-display font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 ${
                            user.plan === plan
                              ? "bg-primary text-primary-foreground shadow-md"
                              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                          }`}
                        >
                          {updatingUser === user.id ? (
                            <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                          ) : (
                            <>
                              {plan === "premium" && <Crown className="w-3 h-3 inline mr-1" />}
                              {plan.charAt(0).toUpperCase() + plan.slice(1)}
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Scan History */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Scan History
                    </p>
                    {loadingScans === user.id ? (
                      <div className="flex justify-center py-3">
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      </div>
                    ) : scans.length === 0 ? (
                      <p className="text-xs text-muted-foreground text-center py-3">No scans yet</p>
                    ) : (
                      <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                        {scans.map((scan) => (
                          <div
                            key={scan.id}
                            className="flex items-center justify-between bg-secondary/50 rounded-lg px-3 py-2 text-xs"
                          >
                            <span className="text-foreground">
                              {new Date(scan.scanned_at).toLocaleDateString()}
                            </span>
                            <span className="text-muted-foreground">
                              {new Date(scan.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {sortedUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">No users found</div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default AdminPage;
