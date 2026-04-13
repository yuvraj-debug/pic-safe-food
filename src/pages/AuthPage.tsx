import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import { lovable } from "@/integrations/lovable/index";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff, ArrowLeft, Gift } from "lucide-react";
import logo from "@/assets/logo.png";
import { toast } from "sonner";

const AuthPage = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const linkReferral = async (userId: string) => {
    const code = referralCode.trim().toUpperCase();
    if (!code) return;

    // Look up referrer by code
    const { data: referrer } = await supabase
      .from("referral_profiles")
      .select("user_id")
      .eq("referral_code", code)
      .single();

    if (!referrer || referrer.user_id === userId) return; // Invalid or self-referral

    // Update the new user's referral profile
    const referralUpdate: TablesUpdate<"referral_profiles"> = { referred_by: referrer.user_id };
    await supabase
      .from("referral_profiles")
      .update(referralUpdate)
      .eq("user_id", userId);

    // Create a pending referral log
    const referralLog: TablesInsert<"referral_logs"> = {
      referrer_id: referrer.user_id,
      referred_id: userId,
    };
    await supabase.from("referral_logs").insert(referralLog);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) return;
    setLoading(true);

    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Welcome back!");
        navigate("/");
      }
    } else {
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        setLoading(false);
        return;
      }
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Account created! You're now logged in.");
        // Link referral if code was provided
        if (data.user && referralCode.trim()) {
          await linkReferral(data.user.id);
        }
        navigate("/");
      }
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password reset link sent to your email!");
    }
    setLoading(false);
  };

  if (isForgotPassword) {
    return (
      <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm flex flex-col items-center gap-8">
          <div className="flex flex-col items-center gap-4">
            <img src={logo} alt="FoodScan AI" className="w-16 h-16 rounded-2xl" />
            <div className="text-center">
              <h1 className="text-3xl font-bold font-display text-gradient-primary">
                Reset Password
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Enter your email to receive a reset link
              </p>
            </div>
          </div>

          <form onSubmit={handleForgotPassword} className="w-full space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                className="w-full bg-card border border-border rounded-2xl py-4 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-body"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display font-semibold py-4 rounded-2xl glow-primary hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Send Reset Link
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>

          <button
            onClick={() => setIsForgotPassword(false)}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-hero flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">
        <div className="flex flex-col items-center gap-4">
          <img src={logo} alt="FoodScan AI" className="w-16 h-16 rounded-2xl" />
          <div className="text-center">
            <h1 className="text-3xl font-bold font-display text-gradient-primary">
              FoodScan AI
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {isLogin ? "Sign in to your account" : "Create a new account"}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              required
              className="w-full bg-card border border-border rounded-2xl py-4 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-body"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isLogin ? "Your password" : "Create a password (min 6 chars)"}
              required
              minLength={6}
              className="w-full bg-card border border-border rounded-2xl py-4 pl-12 pr-12 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-body"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {/* Referral code field - only during signup */}
          {!isLogin && (
            <div className="relative">
              <Gift className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="text"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                placeholder="Referral Code (optional)"
                maxLength={10}
                className="w-full bg-card border border-border rounded-2xl py-4 pl-12 pr-4 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 font-body uppercase tracking-wider"
              />
            </div>
          )}

          {isLogin && (
            <button
              type="button"
              onClick={() => setIsForgotPassword(true)}
              className="text-xs text-primary hover:underline w-full text-right"
            >
              Forgot password?
            </button>
          )}

          <button
            type="submit"
            disabled={loading || !email.trim() || !password.trim()}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display font-semibold py-4 rounded-2xl glow-primary hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <>
                {isLogin ? "Sign In" : "Create Account"}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <button
          type="button"
          disabled={loading}
          onClick={async () => {
            setLoading(true);
            const { error } = await lovable.auth.signInWithOAuth("google", {
              redirect_uri: window.location.origin,
            });
            if (error) {
              toast.error("Google sign-in failed");
              setLoading(false);
            }
          }}
          className="w-full flex items-center justify-center gap-3 bg-card border border-border text-foreground font-display font-semibold py-4 rounded-2xl hover:bg-accent active:scale-[0.98] transition-all disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <button
          onClick={() => { setIsLogin(!isLogin); setPassword(""); setReferralCode(""); }}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
};

export default AuthPage;
