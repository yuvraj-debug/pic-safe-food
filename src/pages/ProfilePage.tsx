import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useScanLimit } from "@/hooks/useScanLimit";
import { LogOut, Mail, Crown, ScanLine, Heart, Gift, ChevronRight, Shield } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { SideMenu } from "@/components/SideMenu";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, userPlan, signOut } = useAuth();
  const { scanCount, limit, bonusScans, remaining, daysUntilReset } = useScanLimit();

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const usagePercent = Math.min(100, (scanCount / (limit + bonusScans)) * 100);

  return (
    <div className="min-h-screen bg-gradient-hero pb-24">
      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">

        {/* Avatar & Name Header */}
        <div className="flex flex-col items-center pt-4 pb-2">
          <div className="w-20 h-20 rounded-full bg-primary/15 border-2 border-primary/30 flex items-center justify-center mb-3">
            <span className="text-3xl font-bold font-display text-primary">
              {user?.email?.charAt(0).toUpperCase() ?? "?"}
            </span>
          </div>
          <p className="text-foreground font-display font-semibold text-lg">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-display font-semibold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full capitalize flex items-center gap-1.5">
              <Crown className="w-3 h-3" />
              {userPlan} Plan
            </span>
          </div>
        </div>

        {/* Scan Usage Card */}
        <div className="bg-gradient-card rounded-2xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ScanLine className="w-4 h-4 text-primary" />
              <span className="text-sm font-display font-semibold text-foreground">Scan Usage</span>
            </div>
            <span className="text-[11px] text-muted-foreground bg-muted px-2.5 py-1 rounded-full">
              Resets in {daysUntilReset}d
            </span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-muted rounded-full h-3 mb-3 overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-700 ease-out"
              style={{ width: `${usagePercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              <span className="text-foreground font-semibold font-display">{scanCount}</span> / {limit}
              {bonusScans > 0 && <span className="text-primary font-semibold"> +{bonusScans}</span>}
              {" "}used
            </span>
            <span className="text-sm font-display font-semibold text-primary">{remaining} left</span>
          </div>
        </div>

        {/* Quick Links */}
        <div className="space-y-2">
          {[
            { icon: Crown, label: "Manage Plan", desc: "View and upgrade your plan", onClick: () => navigate("/pricing") },
            { icon: Heart, label: "Health Profile", desc: "Allergies, diet & preferences", onClick: () => navigate("/health-profile") },
            { icon: Gift, label: "Earn Free Scans", desc: "Invite friends, get bonus scans", onClick: () => navigate("/earn-scans") },
          ].map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full bg-gradient-card rounded-2xl border border-border p-4 flex items-center gap-3 hover:border-primary/30 active:scale-[0.99] transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/15 transition-colors">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </button>
          ))}
        </div>

        {/* Account Section */}
        <div className="pt-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3 px-1">Account</p>
          <div className="bg-gradient-card rounded-2xl border border-border overflow-hidden">
            <div className="px-4 py-3.5 flex items-center gap-3 border-b border-border">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground">Email</p>
                <p className="text-sm text-foreground truncate">{user?.email}</p>
              </div>
            </div>
            <div className="px-4 py-3.5 flex items-center gap-3">
              <Shield className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground">Member since</p>
                <p className="text-sm text-foreground">
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 text-destructive font-display font-semibold py-4 rounded-2xl border border-destructive/20 bg-destructive/5 hover:bg-destructive/10 active:scale-[0.98] transition-all"
        >
          <LogOut className="w-5 h-5" />
          Sign Out
        </button>
      </div>

      <SideMenu />
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
