import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Users, Crown, Loader2, Search, RefreshCw, Shield, BarChart3 } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";

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

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    setLoading(true);
    const { data: profiles } = await supabase.from("profiles").select("*");
    const { data: plans } = await supabase.from("user_plans").select("*");
    const { data: scans } = await supabase.from("scan_logs").select("user_id");

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

  const changePlan = async (userId: string, newPlan: string) => {
    setUpdatingUser(userId);
    const { error } = await supabase
      .from("user_plans")
      .update({ plan: newPlan as any })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to update plan: " + error.message);
    } else {
      toast.success("Plan updated successfully!");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u))
      );
    }
    setUpdatingUser(null);
  };

  const filteredUsers = users.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: users.length,
    paid: users.filter((u) => u.plan !== "free").length,
    totalScans: users.reduce((sum, u) => sum + u.scan_count, 0),
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;

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
            <h2 className="font-display font-semibold text-lg text-foreground">Admin Panel</h2>
          </div>
          <button
            onClick={fetchUsers}
            className="p-2 rounded-xl bg-card border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="px-4 pb-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-card rounded-2xl border border-border p-3 text-center">
              <Users className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold font-display text-foreground">{stats.total}</p>
              <p className="text-[10px] text-muted-foreground">Users</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-3 text-center">
              <Crown className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold font-display text-foreground">{stats.paid}</p>
              <p className="text-[10px] text-muted-foreground">Paid</p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-3 text-center">
              <BarChart3 className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-xl font-bold font-display text-foreground">{stats.totalScans}</p>
              <p className="text-[10px] text-muted-foreground">Scans</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search users by email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-xl py-3 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      </div>

      {/* User list */}
      <div className="px-4 space-y-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}
        </p>
        {filteredUsers.map((user) => (
          <div key={user.id} className="bg-gradient-card rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Joined {new Date(user.created_at).toLocaleDateString()} · {user.scan_count} scans
                </p>
              </div>
              <span className={`text-[10px] font-display font-bold uppercase px-2 py-1 rounded-lg ${
                user.plan === "premium"
                  ? "bg-primary/15 text-primary"
                  : user.plan === "basic"
                  ? "bg-accent/15 text-accent"
                  : "bg-muted text-muted-foreground"
              }`}>
                {user.plan}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {["free", "basic", "premium"].map((plan) => (
                <button
                  key={plan}
                  onClick={() => changePlan(user.id, plan)}
                  disabled={updatingUser === user.id}
                  className={`flex-1 text-xs font-display font-semibold py-2.5 rounded-xl transition-all disabled:opacity-50 ${
                    user.plan === plan
                      ? "bg-primary text-primary-foreground glow-primary"
                      : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  }`}
                >
                  {updatingUser === user.id ? (
                    <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                  ) : (
                    plan.charAt(0).toUpperCase() + plan.slice(1)
                  )}
                </button>
              ))}
            </div>
          </div>
        ))}
        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-muted-foreground text-sm">
            No users found
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
};

export default AdminPage;
