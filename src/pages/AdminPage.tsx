import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  ArrowLeft, Users, Crown, Loader2, Search, RefreshCw,
  Shield, BarChart3, Mail, Calendar, ChevronDown, ChevronUp, Clock, ShoppingCart,
  Key, Save, Eye, EyeOff, Check, AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { SideMenu } from "@/components/SideMenu";

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

interface PurchaseIntent {
  id: string;
  user_id: string;
  plan: string;
  created_at: string;
  email?: string;
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
  const [confirmDialog, setConfirmDialog] = useState<{ userId: string; email: string; currentPlan: string; newPlan: string } | null>(null);
  const [intents, setIntents] = useState<PurchaseIntent[]>([]);
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [apiKeyVisible, setApiKeyVisible] = useState<Record<string, boolean>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [apiKeyStatus, setApiKeyStatus] = useState<Record<string, "saved" | "error" | null>>({});

  useEffect(() => {
    if (!authLoading && !isAdmin) navigate("/");
  }, [isAdmin, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchIntents();
      fetchApiKeys();
    }
  }, [isAdmin]);

  const API_KEY_NAMES = ["STEPFUN_API_KEY", "GROQ_API_KEY", "LOVABLE_API_KEY"];

  const fetchApiKeys = async () => {
    const { data } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", API_KEY_NAMES);
    const keys: Record<string, string> = {};
    data?.forEach((row: any) => { keys[row.key] = row.value; });
    setApiKeys(keys);
  };

  const saveApiKey = async (keyName: string) => {
    const value = apiKeys[keyName]?.trim();
    if (!value) {
      toast.error("API key cannot be empty");
      return;
    }
    setSavingKey(keyName);
    setApiKeyStatus((p) => ({ ...p, [keyName]: null }));

    // Upsert: try update first, then insert
    const { data: existing } = await supabase
      .from("app_settings")
      .select("id")
      .eq("key", keyName)
      .maybeSingle();

    let error;
    if (existing) {
      ({ error } = await supabase
        .from("app_settings")
        .update({ value, updated_at: new Date().toISOString() } as any)
        .eq("key", keyName));
    } else {
      ({ error } = await supabase
        .from("app_settings")
        .insert({ key: keyName, value } as any));
    }

    if (error) {
      toast.error("Failed to save: " + error.message);
      setApiKeyStatus((p) => ({ ...p, [keyName]: "error" }));
    } else {
      toast.success(`${keyName} saved successfully`);
      setApiKeyStatus((p) => ({ ...p, [keyName]: "saved" }));
      setTimeout(() => setApiKeyStatus((p) => ({ ...p, [keyName]: null })), 3000);
    }
    setSavingKey(null);
  };

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

  const fetchIntents = async () => {
    const [{ data: intentData }, { data: profiles }] = await Promise.all([
      supabase.from("purchase_intents").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("id, email"),
    ]);
    const emailMap: Record<string, string> = {};
    profiles?.forEach((p: any) => { emailMap[p.id] = p.email; });
    setIntents((intentData ?? []).map((i: any) => ({ ...i, email: emailMap[i.user_id] || "Unknown" })));
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
    pro: "bg-primary/15 text-primary",
    lifetime: "bg-primary/20 text-primary",
    premium: "bg-primary/15 text-primary",
  };

  return (
    <div className="min-h-screen bg-background pb-24 max-w-4xl mx-auto">
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
            {(["free", "basic", "pro", "lifetime"] as const).map((plan) => (
              <div key={plan} className="text-center">
                <p className="text-lg font-bold font-display text-foreground">
                  {users.filter((u) => u.plan === plan).length}
                </p>
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
                      {["free", "basic", "pro", "lifetime"].map((plan) => (
                        <button
                          key={plan}
                          onClick={() => setConfirmDialog({ userId: user.id, email: user.email, currentPlan: user.plan, newPlan: plan })}
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

      {/* Purchase Intents */}
      {intents.length > 0 && (
        <div className="px-4 mt-6 space-y-3">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5" />
            Recent Purchase Intents ({intents.length})
          </p>
          <div className="space-y-2">
            {intents.map((intent) => (
              <div key={intent.id} className="bg-gradient-card rounded-xl border border-border p-3 flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground truncate">{intent.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(intent.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`text-[10px] font-display font-bold uppercase px-2 py-1 rounded-lg shrink-0 ${planColors[intent.plan] || "bg-muted text-muted-foreground"}`}>
                  {intent.plan}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* API Key Management */}
      <div className="px-4 mt-6 space-y-3">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
          <Key className="w-3.5 h-3.5" />
          API Key Management
        </p>
        <div className="space-y-3">
          {API_KEY_NAMES.map((keyName) => (
            <div key={keyName} className="bg-gradient-card rounded-2xl border border-border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-display font-semibold text-foreground">{keyName}</p>
                {apiKeyStatus[keyName] === "saved" && (
                  <span className="flex items-center gap-1 text-xs text-safe">
                    <Check className="w-3 h-3" /> Saved
                  </span>
                )}
                {apiKeyStatus[keyName] === "error" && (
                  <span className="flex items-center gap-1 text-xs text-unsafe">
                    <AlertCircle className="w-3 h-3" /> Error
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type={apiKeyVisible[keyName] ? "text" : "password"}
                    value={apiKeys[keyName] || ""}
                    onChange={(e) => setApiKeys((p) => ({ ...p, [keyName]: e.target.value }))}
                    placeholder={`Enter ${keyName}...`}
                    className="w-full bg-card border border-border rounded-xl py-2.5 px-3 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono"
                  />
                  <button
                    onClick={() => setApiKeyVisible((p) => ({ ...p, [keyName]: !p[keyName] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {apiKeyVisible[keyName] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <button
                  onClick={() => saveApiKey(keyName)}
                  disabled={savingKey === keyName}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:brightness-110 transition-all disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingKey === keyName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {keyName === "STEPFUN_API_KEY"
                  ? "Primary AI model for food analysis. Get from NVIDIA AI Foundation Models."
                  : keyName === "GROQ_API_KEY"
                  ? "Fallback AI model for food analysis. Get from groq.com"
                  : "Used for OCR image scanning. Managed by Lovable Cloud."}
              </p>
            </div>
          ))}
        </div>
      </div>

      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div className="bg-card border border-border rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
            <h3 className="font-display font-bold text-foreground text-lg">Confirm Plan Change</h3>
            <p className="text-sm text-muted-foreground">
              Change <span className="text-foreground font-medium">{confirmDialog.email}</span> from{" "}
              <span className="font-semibold text-foreground capitalize">{confirmDialog.currentPlan}</span> to{" "}
              <span className="font-semibold text-primary capitalize">{confirmDialog.newPlan}</span>?
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const { userId, newPlan } = confirmDialog;
                  setConfirmDialog(null);
                  await changePlan(userId, newPlan);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      <SideMenu />
      <BottomNav />
    </div>
  );
};

export default AdminPage;
