import { useRef, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, ImagePlus, ArrowLeft, ScanLine, CheckCircle2, Sparkles, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { saveToHistory } from "@/lib/scanHistory";
import { toast } from "sonner";
import { useScanLimit } from "@/hooks/useScanLimit";

const STEPS = [
  { label: "Reading image", icon: Camera },
  { label: "Extracting ingredients", icon: ScanLine },
  { label: "Analyzing safety", icon: ShieldCheck },
];

const ScanPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const { canScan, remaining, limit, logScan } = useScanLimit();

  useEffect(() => {
    if (status.toLowerCase().includes("reading")) setActiveStep(0);
    else if (status.toLowerCase().includes("extract")) setActiveStep(1);
    else if (status.toLowerCase().includes("analy") || status.toLowerCase().includes("complete")) setActiveStep(2);
  }, [status]);

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

      await logScan();

      const thumbnail = base64.length > 50000 ? undefined : base64;
      saveToHistory(data, thumbnail);

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

      // Brief delay to show completion state
      await new Promise(r => setTimeout(r, 600));
      navigate("/results", { state: { analysis: data } });
    } catch (err: any) {
      console.error("Analysis failed:", err);
      toast.error(err?.message || "Failed to analyze image. Please try again.");
    } finally {
      setIsProcessing(false);
      setStatus("");
      setActiveStep(0);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) processImage(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const isComplete = status.toLowerCase().includes("complete");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="font-display font-semibold text-lg text-foreground">Scan Product</h2>
        </div>
        <span className="text-xs text-muted-foreground bg-card px-3 py-1.5 rounded-full border border-border font-display">
          <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
          {remaining} scans left
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {!canScan && !isProcessing ? (
          /* Limit Reached */
          <div className="flex flex-col items-center gap-4 text-center animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center relative">
              <ScanLine className="w-9 h-9 text-destructive" />
              <div className="absolute inset-0 rounded-full border-2 border-destructive/20 animate-pulse-ring" />
            </div>
            <h3 className="font-display font-semibold text-xl text-foreground">
              Scan Limit Reached
            </h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              You've used all {limit} scans for today. Upgrade your plan for more daily scans.
            </p>
            <button
              onClick={() => navigate("/pricing")}
              className="bg-primary text-primary-foreground font-display font-semibold py-3 px-8 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 active:scale-[0.97] transition-all duration-200"
            >
              View Plans
            </button>
          </div>
        ) : isProcessing ? (
          /* Processing State */
          <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-fade-in">
            {preview && (
              <div className="relative animate-scale-in">
                <img
                  src={preview}
                  alt="Product"
                  className="w-44 h-44 object-cover rounded-2xl border border-border shadow-lg"
                />
                {/* Scan line overlay */}
                {!isComplete && (
                  <div className="absolute inset-0 rounded-2xl overflow-hidden">
                    <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
                  </div>
                )}
                {isComplete && (
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg animate-check-bounce">
                    <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
                  </div>
                )}
              </div>
            )}

            {/* Animated spinner */}
            <div className="relative flex items-center justify-center">
              {!isComplete ? (
                <>
                  <div className="w-16 h-16 rounded-full border-[3px] border-muted" />
                  <div className="absolute w-16 h-16 rounded-full border-[3px] border-transparent border-t-primary animate-spin" />
                  <ScanLine className="absolute w-7 h-7 text-primary" />
                </>
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center animate-check-bounce">
                  <CheckCircle2 className="w-8 h-8 text-primary" />
                </div>
              )}
            </div>

            <div className="text-center">
              <p className="text-foreground font-display font-semibold text-lg">{status}</p>
              <p className="text-muted-foreground text-sm mt-1">
                {isComplete ? "Redirecting to results..." : "Our AI is analyzing your product"}
              </p>
            </div>

            {/* Progress Steps */}
            <div className="w-full space-y-3 mt-2">
              {STEPS.map((step, i) => {
                const isActive = i === activeStep;
                const isDone = i < activeStep || isComplete;
                const StepIcon = step.icon;

                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                      isActive
                        ? "bg-primary/10 border border-primary/20"
                        : isDone
                        ? "bg-card/60 border border-border"
                        : "border border-transparent"
                    }`}
                    style={{ animationDelay: `${i * 100}ms` }}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                        isDone
                          ? "bg-primary text-primary-foreground"
                          : isActive
                          ? "bg-primary/20 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {isDone ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <StepIcon className={`w-4 h-4 ${isActive ? "animate-pulse" : ""}`} />
                      )}
                    </div>
                    <span
                      className={`text-sm font-display transition-colors duration-300 ${
                        isActive
                          ? "text-foreground font-semibold"
                          : isDone
                          ? "text-muted-foreground"
                          : "text-muted-foreground/60"
                      }`}
                    >
                      {step.label}
                    </span>
                    {isActive && !isDone && (
                      <div className="ml-auto flex gap-1">
                        {[0, 1, 2].map((dot) => (
                          <div
                            key={dot}
                            className="w-1.5 h-1.5 rounded-full bg-primary"
                            style={{ animation: `pulse 1.2s ease-in-out ${dot * 0.2}s infinite` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Upload State */
          <>
            <div className="text-center mb-2 animate-fade-in">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <ScanLine className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-display font-semibold text-xl text-foreground">
                Scan Ingredients
              </h3>
              <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
                Take a photo or upload an image of the ingredient list
              </p>
            </div>

            <div
              className={`w-full max-w-sm aspect-[3/4] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-4 relative overflow-hidden transition-all duration-300 animate-fade-in-up ${
                isDragOver
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border bg-card/30 hover:border-primary/40 hover:bg-card/50"
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={() => setIsDragOver(false)}
              style={{ animationDelay: "0.1s" }}
            >
              {/* Corner guides */}
              <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary/30 rounded-tl-lg" />
              <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/30 rounded-tr-lg" />
              <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary/30 rounded-bl-lg" />
              <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary/30 rounded-br-lg" />

              <Camera className={`w-14 h-14 transition-colors duration-300 ${isDragOver ? "text-primary" : "text-muted-foreground/40"}`} />
              <p className="text-muted-foreground text-xs text-center px-10">
                {isDragOver ? "Drop image here" : "Make sure the ingredient text is clearly visible"}
              </p>
            </div>

            <div
              className="flex gap-3 w-full max-w-sm animate-fade-in-up"
              style={{ animationDelay: "0.2s" }}
            >
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display font-semibold py-4 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 active:scale-[0.97] transition-all duration-200"
              >
                <Camera className="w-5 h-5" />
                Camera
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground font-display font-semibold py-4 rounded-2xl hover:bg-secondary/80 active:scale-[0.97] transition-all duration-200 border border-border"
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
