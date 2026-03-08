import { useNavigate } from "react-router-dom";
import { X, Zap, Star, Crown, Gem, MessageCircle, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const WHATSAPP_NUMBER = "917206981457";

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "",
    scans: "20 / month",
    icon: Zap,
    plan: "free",
    popular: false,
  },
  {
    name: "Basic",
    price: "₹99",
    period: "/mo",
    scans: "100 / month",
    icon: Star,
    plan: "basic",
    popular: true,
  },
  {
    name: "Pro",
    price: "₹249",
    period: "/mo",
    scans: "300 / month",
    icon: Crown,
    plan: "pro",
    popular: false,
  },
  {
    name: "Lifetime",
    price: "₹999",
    period: "once",
    scans: "500 / month",
    icon: Gem,
    plan: "lifetime",
    popular: false,
  },
];

interface UpgradeModalProps {
  onClose: () => void;
}

export const UpgradeModal = ({ onClose }: UpgradeModalProps) => {
  const navigate = useNavigate();
  const { userPlan } = useAuth();

  const handleBuy = async (planName: string, planKey: string, price: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("purchase_intents").insert({ user_id: user.id, plan: planKey });
    }

    const message = encodeURIComponent(
      `Hi, I'd like to upgrade to ${planName} (${price}) on PicSafe Food.\n\nEmail: ${user?.email || "N/A"}`
    );
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("Opening WhatsApp...");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-5 pb-3 text-center relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-3">
            <Zap className="w-7 h-7 text-destructive" />
          </div>
          <h3 className="font-display font-bold text-lg text-foreground">
            Monthly Scan Limit Reached
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Upgrade your plan for more scans
          </p>
        </div>

        {/* Plans */}
        <div className="px-4 pb-4 space-y-2">
          {plans.map((plan) => {
            const isCurrent = userPlan === plan.plan;
            const Icon = plan.icon;
            return (
              <div
                key={plan.plan}
                className={`relative rounded-2xl border p-4 transition-all ${
                  plan.popular
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-card"
                } ${isCurrent ? "ring-2 ring-primary" : ""}`}
              >
                {plan.popular && (
                  <span className="absolute -top-2.5 left-4 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                    MOST POPULAR
                  </span>
                )}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-display font-bold text-foreground text-sm">{plan.name}</span>
                      <span className="text-xs text-muted-foreground">{plan.scans}</span>
                    </div>
                    <span className="text-lg font-bold font-display text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-xs text-muted-foreground"> {plan.period}</span>}
                  </div>
                  {isCurrent ? (
                    <span className="text-xs font-semibold text-primary flex items-center gap-1">
                      <Check className="w-4 h-4" /> Current
                    </span>
                  ) : plan.plan !== "free" ? (
                    <button
                      onClick={() => handleBuy(plan.name, plan.plan, plan.price)}
                      className="flex items-center gap-1 text-xs font-display font-semibold px-3 py-2 rounded-xl bg-primary text-primary-foreground hover:brightness-110 active:scale-[0.97] transition-all"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      Buy
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 pb-5">
          <button
            onClick={() => { onClose(); navigate("/pricing"); }}
            className="w-full text-center text-sm text-primary font-semibold py-2"
          >
            View Full Plan Details →
          </button>
        </div>
      </div>
    </div>
  );
};
