import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, Share2, Gift, Trophy, Users, Star, Check } from "lucide-react";
import { toast } from "sonner";
import { useReferral } from "@/hooks/useReferral";
import { BottomNav } from "@/components/BottomNav";
import { SideMenu } from "@/components/SideMenu";
import { useState } from "react";

const MILESTONES = [
  { count: 1, reward: 10, label: "First invite" },
  { count: 3, reward: 50, label: "3 invites" },
  { count: 5, reward: 100, label: "5 invites" },
  { count: 10, reward: 200, label: "10 invites" },
];

const EarnScansPage = () => {
  const navigate = useNavigate();
  const { profile, loading, leaderboard, nextMilestone } = useReferral();
  const [copied, setCopied] = useState(false);

  const referralCode = profile?.referral_code ?? "...";
  const referralCount = profile?.referral_count ?? 0;
  const totalEarned = profile?.referral_rewards_scans ?? 0;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    toast.success("Referral code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleInvite = async () => {
    const text = `Try PicSafe Food — scan food products with AI and see if they are safe.\n\nUse my referral code to get bonus scans:\n\nReferral Code: ${referralCode}\n\nDownload the app and enter the code during signup.`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "PicSafe Food", text });
        return;
      } catch (e: unknown) {
        if (e instanceof DOMException && e.name === "AbortError") return;
      }
    }
    await navigator.clipboard.writeText(text);
    toast.success("Invite message copied to clipboard!");
  };

  // Progress bar toward next milestone
  const prevMilestoneCount = nextMilestone
    ? ([...MILESTONES].reverse().find((m) => m.count < nextMilestone.count)?.count ?? 0)
    : (MILESTONES[MILESTONES.length - 1]?.count ?? 10);
  const targetCount = nextMilestone?.count ?? MILESTONES[MILESTONES.length - 1].count;
  const progressPercent = nextMilestone
    ? Math.min(100, ((referralCount - prevMilestoneCount) / (targetCount - prevMilestoneCount)) * 100)
    : 100;

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 max-w-lg mx-auto">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="font-display font-semibold text-lg text-foreground">Earn Free Scans</h2>
      </div>

      <div className="px-4 max-w-lg mx-auto space-y-5">
        {/* Explanation */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Gift className="w-8 h-8 text-primary" />
          </div>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Invite friends and earn free scans when they join PicSafe Food and complete their first scan.
          </p>
        </div>

        {/* Referral Code Card */}
        <div className="bg-gradient-card rounded-2xl border border-border p-5">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Your Referral Code</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-card rounded-xl border border-border px-4 py-3 text-center">
              <span className="font-display font-bold text-xl tracking-widest text-foreground">
                {loading ? "..." : referralCode}
              </span>
            </div>
            <button
              onClick={handleCopy}
              className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors active:scale-95"
            >
              {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
            </button>
          </div>

          <button
            onClick={handleInvite}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display font-semibold py-3.5 rounded-2xl glow-primary hover:brightness-110 active:scale-[0.98] transition-all"
          >
            <Share2 className="w-5 h-5" />
            Invite Friends
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gradient-card rounded-2xl border border-border p-4 text-center">
            <Users className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold font-display text-foreground">{referralCount}</p>
            <p className="text-xs text-muted-foreground">Total Referrals</p>
          </div>
          <div className="bg-gradient-card rounded-2xl border border-border p-4 text-center">
            <Star className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-2xl font-bold font-display text-foreground">{totalEarned}</p>
            <p className="text-xs text-muted-foreground">Scans Earned</p>
          </div>
        </div>

        {/* Progress to next milestone */}
        <div className="bg-gradient-card rounded-2xl border border-border p-5">
          <p className="text-sm font-display font-semibold text-foreground mb-3">
            Progress to Next Reward
          </p>

          {nextMilestone ? (
            <>
              <div className="w-full bg-muted rounded-full h-3 mb-2 overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{referralCount} / {nextMilestone.count} invites</span>
                <span className="text-primary font-semibold">+{nextMilestone.reward} scans</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-primary font-semibold">🎉 All milestones reached!</p>
          )}
        </div>

        {/* Milestone Rewards */}
        <div className="bg-gradient-card rounded-2xl border border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-primary" />
            <p className="text-sm font-display font-semibold text-foreground">Milestone Rewards</p>
          </div>
          <div className="space-y-3">
            {MILESTONES.map((m) => {
              const reached = referralCount >= m.count;
              return (
                <div
                  key={m.count}
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
                    reached ? "bg-primary/10 border border-primary/20" : "bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    reached ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {reached ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">{m.count}</span>}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${reached ? "text-foreground" : "text-muted-foreground"}`}>
                      {m.label}
                    </p>
                  </div>
                  <span className={`text-sm font-display font-bold ${reached ? "text-primary" : "text-muted-foreground"}`}>
                    +{m.reward} scans
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Leaderboard */}
        {leaderboard.length > 0 && (
          <div className="bg-gradient-card rounded-2xl border border-border p-5">
            <div className="flex items-center gap-2 mb-4">
              <Trophy className="w-5 h-5 text-primary" />
              <p className="text-sm font-display font-semibold text-foreground">Top Referrers</p>
            </div>
            <div className="space-y-2">
              {leaderboard.slice(0, 5).map((entry, i) => (
                <div
                  key={entry.referral_code}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/30"
                >
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                    i === 0 ? "bg-primary text-primary-foreground" :
                    i === 1 ? "bg-primary/20 text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <span className="flex-1 text-sm text-foreground font-medium font-mono">
                    {entry.referral_code}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {entry.referral_count} invite{entry.referral_count !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="bg-card rounded-2xl border border-border p-5">
          <p className="text-sm font-display font-semibold text-foreground mb-3">How it works</p>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>1. Share your referral code with friends</p>
            <p>2. They enter the code during signup</p>
            <p>3. Once they complete their first scan, you both get rewarded</p>
            <p>4. You get +10 scans, they get +5 bonus scans</p>
            <p>5. Reach milestones for even bigger rewards!</p>
          </div>
        </div>
      </div>

      <SideMenu />
      <BottomNav />
    </div>
  );
};

export default EarnScansPage;
