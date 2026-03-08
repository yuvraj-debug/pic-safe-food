import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, ImagePlus, ArrowLeft, Loader2, ScanLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { saveToHistory } from "@/lib/scanHistory";
import { toast } from "sonner";
import { useScanLimit } from "@/hooks/useScanLimit";

const ScanPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const { canScan, remaining, limit, logScan } = useScanLimit();

  const processImage = async (file: File) => {
    if (!canScan) {
      toast.error(`Daily scan limit reached (${limit}/${limit}). Upgrade your plan for more scans!`);
      return;
    }

    setIsProcessing(true);
    setStatus("Reading image...");

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setPreview(base64);
      setStatus("Extracting ingredients...");

      const { data, error } = await supabase.functions.invoke("analyze-food", {
        body: { image: base64 },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setStatus("Analysis complete!");

      // Log the scan
      await logScan();

      const thumbnail = base64.length > 50000 ? undefined : base64;
      saveToHistory(data, thumbnail);

      // Save to database
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("scan_results").insert({
          user_id: user.id,
          product_name: data.product_summary?.split(".")[0]?.slice(0, 60) || "Unknown Product",
          safety_score: data.safety_score,
          safety_level: data.safety_level,
          analysis: data,
          thumbnail,
        });
      }

      navigate("/results", { state: { analysis: data } });
    } catch (err: any) {
      console.error("Analysis failed:", err);
      toast.error(err?.message || "Failed to analyze image. Please try again.");
    } finally {
      setIsProcessing(false);
      setStatus("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="font-display font-semibold text-lg text-foreground">Scan Product</h2>
        </div>
        <span className="text-xs text-muted-foreground bg-card px-3 py-1 rounded-full border border-border">
          {remaining} scans left
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {!canScan && !isProcessing ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <ScanLine className="w-8 h-8 text-destructive" />
            </div>
            <h3 className="font-display font-semibold text-lg text-foreground">
              Scan Limit Reached
            </h3>
            <p className="text-muted-foreground text-sm">
              You've used all {limit} scans for today. Upgrade your plan for more daily scans.
            </p>
            <button
              onClick={() => navigate("/pricing")}
              className="bg-primary text-primary-foreground font-display font-semibold py-3 px-8 rounded-2xl glow-primary hover:brightness-110 active:scale-[0.98] transition-all"
            >
              View Plans
            </button>
          </div>
        ) : isProcessing ? (
          <div className="flex flex-col items-center gap-6 w-full max-w-sm">
            {preview && (
              <img src={preview} alt="Product" className="w-40 h-40 object-cover rounded-2xl border border-border" />
            )}
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="w-16 h-16 rounded-full border-4 border-primary/20 flex items-center justify-center">
                  <Loader2 className="w-8 h-8 text-primary animate-spin" />
                </div>
              </div>
              <p className="text-foreground font-display font-semibold text-lg">{status}</p>
              <p className="text-muted-foreground text-sm text-center">
                Our AI is reading the ingredients and checking safety
              </p>
            </div>
            <div className="w-full space-y-2 mt-4">
              {["Reading image", "Extracting ingredients", "Analyzing safety"].map((step, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    status.toLowerCase().includes(step.split(" ")[0].toLowerCase())
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <span className={`text-sm ${
                    status.toLowerCase().includes(step.split(" ")[0].toLowerCase())
                      ? "text-foreground"
                      : "text-muted-foreground"
                  }`}>
                    {step}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            <div className="text-center mb-2">
              <ScanLine className="w-12 h-12 text-primary mx-auto mb-3" />
              <h3 className="font-display font-semibold text-lg text-foreground">
                Scan Ingredients
              </h3>
              <p className="text-muted-foreground text-sm mt-1">
                Point at the ingredient list on the package
              </p>
            </div>
            <div className="w-full max-w-sm aspect-[3/4] rounded-3xl border-2 border-dashed border-border bg-card/50 flex flex-col items-center justify-center gap-4 relative overflow-hidden">
              <div className="absolute inset-4 border border-primary/20 rounded-2xl" />
              <Camera className="w-14 h-14 text-muted-foreground/50" />
              <p className="text-muted-foreground text-xs text-center px-10">
                Make sure the ingredient text is clearly visible
              </p>
            </div>
            <div className="flex gap-3 w-full max-w-sm">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display font-semibold py-4 rounded-2xl glow-primary hover:brightness-110 active:scale-[0.98] transition-all"
              >
                <Camera className="w-5 h-5" />
                Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground font-display font-semibold py-4 rounded-2xl hover:bg-secondary/80 active:scale-[0.98] transition-all"
              >
                <ImagePlus className="w-5 h-5" />
                Gallery
              </button>
            </div>
          </>
        )}

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>
    </div>
  );
};

export default ScanPage;
