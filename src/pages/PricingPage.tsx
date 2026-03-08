import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Crown, Zap, Star, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { toast } from "sonner";

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    scans: "1 scan / day",
    icon: <Zap className="w-6 h-6" />,
    features: ["1 daily scan", "Basic analysis", "Safety score"],
    plan: "free",
    popular: false,
  },
  {
    name: "Basic",
    price: "₹99",
    period: "/ month",
    scans: "10 scans / day",
    icon: <Star className="w-6 h-6" />,
    features: ["10 daily scans", "Detailed analysis", "Ingredient breakdown", "Health warnings"],
    plan: "basic",
    popular: true,
  },
  {
    name: "Premium",
    price: "₹499",
    period: "/ month",
    scans: "99 scans / day",
    icon: <Crown className="w-6 h-6" />,
    features: ["99 daily scans", "Full detailed analysis", "Priority processing", "Allergen alerts", "Consumption advice"],
    plan: "premium",
    popular: false,
  },
];

const ADMIN_EMAIL = "ys8800221@gmail.com";
const WHATSAPP_NUMBER = "917206981457";

const PricingPage = () => {
  const navigate = useNavigate();
  const { userPlan } = useAuth();

  const handleBuyNow = (planName: string) => {
    const message = encodeURIComponent(
      `Hi, I would like to upgrade my plan to ${planName} on PicSafe Food. Please share the payment details.`
    );
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`, "_blank");
    toast.success("Opening WhatsApp...");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 max-w-3xl mx-auto">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="font-display font-semibold text-lg text-foreground">Plans & Pricing</h2>
      </div>

      <div className="px-4 max-w-3xl mx-auto">
        <p className="text-muted-foreground text-sm text-center mb-6">
          Choose a plan that fits your needs
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {plans.map((plan) => {
            const isCurrent = userPlan === plan.plan;
            return (
              <div
                key={plan.plan}
                className={`relative rounded-2xl border p-5 transition-all flex flex-col ${
                  plan.popular
                    ? "border-primary/50 bg-primary/5 glow-primary"
                    : "border-border bg-gradient-card"
                } ${isCurrent ? "ring-2 ring-primary" : ""}`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold px-3 py-1 rounded-full bg-primary text-primary-foreground">
                    POPULAR
                  </span>
                )}

                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    {plan.icon}
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground">{plan.scans}</p>
                  </div>
                  <div className="ml-auto text-right">
                    <span className="text-2xl font-bold font-display text-foreground">{plan.price}</span>
                    <span className="text-xs text-muted-foreground"> {plan.period}</span>
                  </div>
                </div>

                <div className="space-y-2 mt-4 flex-1">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-secondary-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                {/* Buy Now / Current Plan button */}
                <div className="mt-5">
                  {isCurrent ? (
                    <div className="w-full text-center text-sm font-semibold text-primary py-3 rounded-xl border border-primary/30 bg-primary/5">
                      ✓ Current Plan
                    </div>
                  ) : plan.plan === "free" ? (
                    <div className="w-full text-center text-sm text-muted-foreground py-3 rounded-xl border border-border">
                      Default Plan
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBuyNow(plan.name)}
                      className={`w-full flex items-center justify-center gap-2 font-display font-semibold py-3 rounded-xl transition-all active:scale-[0.97] ${
                        plan.popular
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                      }`}
                    >
                      <Mail className="w-4 h-4" />
                      Buy Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Contact us at {ADMIN_EMAIL} to upgrade your plan
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default PricingPage;
