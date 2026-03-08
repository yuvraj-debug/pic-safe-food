import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, Crown, Zap, Star, Gem, MessageCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { SideMenu } from "@/components/SideMenu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const plans = [
  {
    name: "Free",
    price: "₹0",
    period: "forever",
    scans: "20 scans / month",
    icon: <Zap className="w-6 h-6" />,
    features: ["20 monthly scans", "Basic ingredient analysis", "Safety score", "Watermark on share cards"],
    plan: "free",
    popular: false,
  },
  {
    name: "Basic",
    price: "₹99",
    period: "/ month",
    scans: "100 scans / month",
    icon: <Star className="w-6 h-6" />,
    features: ["100 monthly scans", "Personalized health scoring", "Full ingredient explanations", "No watermark on shares", "Health warnings"],
    plan: "basic",
    popular: true,
  },
  {
    name: "Pro",
    price: "₹249",
    period: "/ month",
    scans: "300 scans / month",
    icon: <Crown className="w-6 h-6" />,
    features: ["300 monthly scans", "Everything in Basic", "Family health profiles", "Product comparison", "Safer alternatives", "Advanced nutrition insights"],
    plan: "pro",
    popular: false,
  },
  {
    name: "Lifetime",
    price: "₹999",
    period: "one-time",
    scans: "500 scans / month",
    icon: <Gem className="w-6 h-6" />,
    features: ["500 monthly scans", "All Pro features", "No subscription renewal", "Lifetime access forever", "Priority support"],
    plan: "lifetime",
    popular: false,
  },
];

const ADMIN_EMAIL = "ys8800221@gmail.com";
const WHATSAPP_NUMBER = "917206981457";

const PricingPage = () => {
  const navigate = useNavigate();
  const { userPlan } = useAuth();

  const handleBuyNow = async (planName: string, planKey: string, price: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("purchase_intents").insert({ user_id: user.id, plan: planKey });
    }

    const message = encodeURIComponent(
      `Hi, I would like to upgrade my plan to ${planName} (${price}) on PicSafe Food. Please share the payment details.\n\nEmail: ${user?.email || "N/A"}`
    );
    const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

    const a = document.createElement("a");
    a.href = whatsappUrl;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    toast.success("Opening WhatsApp...", {
      description: "If WhatsApp didn't open, tap below to copy the link.",
      action: {
        label: "Copy Link",
        onClick: () => {
          navigator.clipboard.writeText(whatsappUrl);
          toast.success("WhatsApp link copied to clipboard!");
        },
      },
    });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    MOST POPULAR
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

                <div className="space-y-2 mt-2 flex-1">
                  {plan.features.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-secondary-foreground">
                      <Check className="w-4 h-4 text-primary shrink-0" />
                      {f}
                    </div>
                  ))}
                </div>

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
                      onClick={() => handleBuyNow(plan.name, plan.plan, plan.price)}
                      className={`w-full flex items-center justify-center gap-2 font-display font-semibold py-3 rounded-xl transition-all active:scale-[0.97] ${
                        plan.popular
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110"
                          : "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border"
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      Buy Now
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          Contact us on WhatsApp or at {ADMIN_EMAIL} to upgrade
        </p>
      </div>

      <SideMenu />
      <BottomNav />
    </div>
  );
};

export default PricingPage;
