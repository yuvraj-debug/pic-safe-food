import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useScanLimit } from "@/hooks/useScanLimit";
import { LogOut, Mail, Crown, ScanLine } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="p-4 max-w-lg mx-auto">
        <h2 className="font-display font-semibold text-lg text-foreground mb-6">Profile</h2>

        <div className="space-y-4">
          {/* Email */}
          <div className="bg-gradient-card rounded-2xl border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="text-sm text-foreground truncate">{user?.email}</p>
            </div>
          </div>

          {/* Plan */}
          <div className="bg-gradient-card rounded-2xl border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <Crown className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Current Plan</p>
              <p className="text-sm text-foreground font-semibold capitalize">{userPlan}</p>
            </div>
            <button
              onClick={() => navigate("/pricing")}
              className="text-xs text-primary font-semibold shrink-0"
            >
              View Plans
            </button>
          </div>

          {/* Scans */}
          <div className="bg-gradient-card rounded-2xl border border-border p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <ScanLine className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Monthly Scans</p>
              <p className="text-sm text-foreground font-semibold">
                {scanCount} / {limit}{bonusScans > 0 && <span className="text-primary"> +{bonusScans}</span>}
              </p>
            </div>
            <span className="text-xs text-muted-foreground shrink-0">
              Resets in {daysUntilReset}d
            </span>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 bg-destructive/10 text-destructive font-display font-semibold py-4 rounded-2xl border border-destructive/20 hover:bg-destructive/20 active:scale-[0.98] transition-all"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </div>

      <SideMenu />
      <BottomNav />
    </div>
  );
};

export default ProfilePage;
