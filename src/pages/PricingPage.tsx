import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Crown, Zap, Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";

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

const PricingPage = () => {
  const navigate = useNavigate();
  const { userPlan } = useAuth();

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h2 className="font-display font-semibold text-lg text-foreground">Plans & Pricing</h2>
      </div>

      <div className="px-4">
        <p className="text-muted-foreground text-sm text-center mb-6">
          Choose a plan that fits your needs
        </p>

        <div className="space-y-4">
          {plans.map((plan) => {
            const isCurrent = userPlan === plan.plan;
            return (
              <div
                key={plan.plan}
                className={`relative rounded-2xl border p-5 transition-all ${
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

                <div className="space-y-2 mt-4">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-secondary-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

                {isCurrent && (
                  <div className="mt-4 text-center text-xs font-semibold text-primary">
                    ✓ Current Plan
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Contact admin to upgrade your plan
        </p>
      </div>

      <BottomNav />
    </div>
  );
};

export default PricingPage;
