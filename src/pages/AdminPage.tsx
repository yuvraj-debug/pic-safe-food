import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Users, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
    // Get all profiles
    const { data: profiles } = await supabase.from("profiles").select("*");
    // Get all plans
    const { data: plans } = await supabase.from("user_plans").select("*");
    // Get scan counts
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
    const { error } = await supabase
      .from("user_plans")
      .update({ plan: newPlan as any })
      .eq("user_id", userId);

    if (error) {
      toast.error("Failed to update plan");
    } else {
      toast.success("Plan updated!");
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, plan: newPlan } : u))
      );
    }
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
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          <h2 className="font-display font-semibold text-lg text-foreground">Admin Panel</h2>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-card rounded-2xl border border-border p-4 text-center">
            <Users className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold font-display text-foreground">{users.length}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </div>
          <div className="bg-gradient-card rounded-2xl border border-border p-4 text-center">
            <Crown className="w-6 h-6 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold font-display text-foreground">
              {users.filter((u) => u.plan !== "free").length}
            </p>
            <p className="text-xs text-muted-foreground">Paid Users</p>
          </div>
        </div>
      </div>

      {/* User list */}
      <div className="px-4 space-y-3">
        <h3 className="font-display font-semibold text-sm text-muted-foreground uppercase tracking-wider">
          All Users
        </h3>
        {users.map((user) => (
          <div key={user.id} className="bg-gradient-card rounded-2xl border border-border p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground truncate">{user.email}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(user.created_at).toLocaleDateString()} · {user.scan_count} scans
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {["free", "basic", "premium"].map((plan) => (
                <button
                  key={plan}
                  onClick={() => changePlan(user.id, plan)}
                  className={`flex-1 text-xs font-display font-semibold py-2 rounded-xl transition-all ${
                    user.plan === plan
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                >
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminPage;
