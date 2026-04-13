import { useRef, useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Camera,
  ImagePlus,
  ArrowLeft,
  ScanLine,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Barcode,
  FileText,
  Search,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert } from "@/integrations/supabase/types";
import { toast } from "sonner";
import { useScanLimit } from "@/hooks/useScanLimit";
import { UpgradeModal } from "@/components/UpgradeModal";
import { BarcodeScanner } from "@/components/BarcodeScanner";
import type { AnalysisResult } from "@/types/analysis";
import { normalizeAnalysis, persistLastAnalysis } from "@/lib/analysisNormalizer";

type InputMode = "photo" | "barcode" | "ingredients";
type ScanLocationState = { autoBarcode?: string };

type AnalysisInvokeResult =
  | { unableToFetch: true; message: string }
  | { unableToFetch: false; analysis: AnalysisResult };

const MODE_STEPS: Record<InputMode, { label: string; icon: LucideIcon }[]> = {
  photo: [
    { label: "Reading image", icon: Camera },
    { label: "Extracting ingredients", icon: ScanLine },
    { label: "Analyzing safety", icon: ShieldCheck },
  ],
  barcode: [
    { label: "Fetching product", icon: Search },
    { label: "Reading ingredients", icon: ScanLine },
    { label: "Analyzing safety", icon: ShieldCheck },
  ],
  ingredients: [
    { label: "Reading ingredients", icon: ScanLine },
    { label: "Analyzing safety", icon: ShieldCheck },
  ],
};

const ScanPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const autoBarcode = (location.state as ScanLocationState | null)?.autoBarcode;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<InputMode>(autoBarcode ? "barcode" : "photo");
  const [scannerActive, setScannerActive] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState("");
  const [ingredientsInput, setIngredientsInput] = useState("");
  const { canScan, remaining, limit, bonusScans, logScan } = useScanLimit();
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const steps = MODE_STEPS[mode];

  useEffect(() => {
    if (!status) return;
    const loweredStatus = status.toLowerCase();
    if (loweredStatus.includes("fetching") || loweredStatus.includes("reading image")) {
      setActiveStep(0);
    } else if (loweredStatus.includes("reading ingredient") || loweredStatus.includes("extract")) {
      setActiveStep(mode === "ingredients" ? 0 : 1);
    } else if (loweredStatus.includes("analy") || loweredStatus.includes("complete")) {
      setActiveStep(steps.length - 1);
    }
  }, [mode, status, steps.length]);

  const invokeAnalysis = useCallback(async (body: Record<string, unknown>): Promise<AnalysisInvokeResult> => {
    const { data, error } = await supabase.functions.invoke("analyze-food", { body });
    if (error) throw error;

    const payload = (data ?? {}) as Record<string, unknown>;
    if (typeof payload.error === "string" && payload.error.trim()) {
      throw new Error(payload.error);
    }

    if (payload.unable_to_fetch === true) {
      return {
        unableToFetch: true,
        message:
          typeof payload.message === "string" && payload.message.trim()
            ? payload.message
            : "Unable to fetch product details. Try ingredients mode.",
      };
    }

    return { unableToFetch: false, analysis: normalizeAnalysis(payload) };
  }, []);

  const handleAnalysisComplete = useCallback(async (analysis: AnalysisResult, thumbnail?: string) => {
    setStatus("Analysis complete!");

    const scanLogged = await logScan();
    if (!scanLogged) {
      toast.error("Analysis done, but scan quota update failed. Please refresh and verify usage.");
    }

    persistLastAnalysis(analysis);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const payload: TablesInsert<"scan_results"> = {
        user_id: user.id,
        product_name: analysis.product_summary.split(".")[0]?.slice(0, 60) || "Unknown Product",
        safety_score: analysis.safety_score,
        safety_level: analysis.safety_level,
        analysis,
        thumbnail,
      };

      const { error: saveError } = await supabase.from("scan_results").insert(payload);
      if (saveError) {
        toast.error("Analysis complete, but saving to history failed.");
      } else {
        const { count, error: countError } = await supabase
          .from("scan_results")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if (!countError && count === 1) {
          const { error: referralError } = await supabase.rpc("complete_referral", { _referred_user_id: user.id });
          if (referralError) {
            toast.error("Scan saved, but referral reward update failed.");
          }
        }
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 600));
    navigate("/results", { state: { analysis } });
  }, [logScan, navigate]);

  const checkLimit = useCallback(() => {
    if (isProcessing) return false;
    if (!canScan) {
      setShowUpgradeModal(true);
      return false;
    }
    return true;
  }, [canScan, isProcessing]);

  const processImage = useCallback(async (file: File) => {
    if (!checkLimit()) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload a valid image file.");
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

      const result = await invokeAnalysis({ image: base64 });
      if (result.unableToFetch) {
        toast.error(result.message, {
          duration: 5000,
          action: { label: "Paste ingredients", onClick: () => setMode("ingredients") },
        });
        return;
      }

      const thumbnail = base64.length > 50000 ? undefined : base64;
      await handleAnalysisComplete(result.analysis, thumbnail);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to analyze image. Please try again.";
      toast.error(message);
    } finally {
      setIsProcessing(false);
      setStatus("");
      setActiveStep(0);
    }
  }, [checkLimit, handleAnalysisComplete, invokeAnalysis]);

  const processBarcode = useCallback(async (code: string) => {
    if (!checkLimit()) return;

    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Please enter a barcode number.");
      return;
    }

    setIsProcessing(true);
    setStatus("Fetching product...");
    try {
      const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${trimmed}.json`);
      if (!res.ok) {
        throw new Error("Unable to contact product database. Please try again.");
      }
      const productData = await res.json();

      if (productData.status !== 1 || !productData.product) {
        toast.error("Product not found. Try pasting ingredients manually.", {
          action: { label: "Paste ingredients", onClick: () => setMode("ingredients") },
        });
        return;
      }

      const product = productData.product;
      const ingredientsText = product.ingredients_text || product.ingredients_text_en || "";

      if (!ingredientsText) {
        toast.error("No ingredients found for this product. Try pasting them manually.", {
          action: { label: "Paste ingredients", onClick: () => setMode("ingredients") },
        });
        return;
      }

      const parts = [
        product.product_name && `Product: ${product.product_name}`,
        product.brands && `Brand: ${product.brands}`,
        `Ingredients: ${ingredientsText}`,
        product.allergens && `Allergens: ${product.allergens}`,
        product.additives_tags?.length && `Additives: ${product.additives_tags.join(", ")}`,
      ].filter(Boolean).join("\n");

      setStatus("Reading ingredients...");
      const result = await invokeAnalysis({ ingredients_text: parts });
      if (result.unableToFetch) {
        toast.error(result.message, {
          action: { label: "Paste ingredients", onClick: () => setMode("ingredients") },
        });
        return;
      }

      await handleAnalysisComplete(result.analysis);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to analyze product. Please try again.";
      toast.error(message);
    } finally {
      setIsProcessing(false);
      setStatus("");
      setActiveStep(0);
    }
  }, [checkLimit, handleAnalysisComplete, invokeAnalysis]);

  const processIngredients = useCallback(async () => {
    if (!checkLimit()) return;

    const trimmed = ingredientsInput.trim();
    if (!trimmed) {
      toast.error("Please paste some ingredients first.");
      return;
    }

    setIsProcessing(true);
    setStatus("Reading ingredients...");
    try {
      const result = await invokeAnalysis({ ingredients_text: trimmed });
      if (result.unableToFetch) {
        toast.error(result.message);
        return;
      }

      await handleAnalysisComplete(result.analysis);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to analyze ingredients. Please try again.";
      toast.error(message);
    } finally {
      setIsProcessing(false);
      setStatus("");
      setActiveStep(0);
    }
  }, [checkLimit, handleAnalysisComplete, ingredientsInput, invokeAnalysis]);

  useEffect(() => {
    if (autoBarcode) {
      setBarcodeInput(autoBarcode);
      void processBarcode(autoBarcode);
    }
  }, [autoBarcode, processBarcode]);

  const handleBarcodeDetected = useCallback((code: string) => {
    setScannerActive(false);
    setBarcodeInput(code);
    void processBarcode(code);
  }, [processBarcode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void processImage(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      void processImage(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const isComplete = status.toLowerCase().includes("complete");

  const tabOptions: { key: InputMode; label: string; icon: LucideIcon }[] = [
    { key: "photo", label: "Photo", icon: Camera },
    { key: "barcode", label: "Barcode", icon: Barcode },
    { key: "ingredients", label: "Ingredients", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex items-center justify-between p-4 animate-fade-in">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="text-muted-foreground hover:text-foreground transition-colors active:scale-95"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h2 className="font-display font-semibold text-lg text-foreground">Analyze Product</h2>
        </div>
        <span className="text-xs text-muted-foreground bg-card px-3 py-1.5 rounded-full border border-border font-display">
          <Sparkles className="w-3 h-3 inline mr-1 text-primary" />
          {remaining}/{limit}{bonusScans > 0 && <span className="text-primary font-semibold"> +{bonusScans}</span>} scans
        </span>
      </div>

      {!isProcessing && canScan && (
        <div className="flex justify-center px-4 pb-2 animate-fade-in">
          <div className="inline-flex bg-card border border-border rounded-2xl p-1 gap-1">
            {tabOptions.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                disabled={isProcessing}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-display font-medium transition-all duration-200 ${
                  mode === key
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                } disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
        {!canScan && !isProcessing ? (
          <div className="flex flex-col items-center gap-4 text-center animate-scale-in">
            <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center relative">
              <ScanLine className="w-9 h-9 text-destructive" />
              <div className="absolute inset-0 rounded-full border-2 border-destructive/20 animate-pulse-ring" />
            </div>
            <h3 className="font-display font-semibold text-xl text-foreground">Scan Limit Reached</h3>
            <p className="text-muted-foreground text-sm max-w-xs">
              You've used all {limit} scans this month. Upgrade your plan for more scans.
            </p>
            <button
              onClick={() => navigate("/pricing")}
              className="bg-primary text-primary-foreground font-display font-semibold py-3 px-8 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 active:scale-[0.97] transition-all duration-200"
            >
              View Plans
            </button>
          </div>
        ) : isProcessing ? (
          <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-fade-in">
            {preview && mode === "photo" && (
              <div className="relative animate-scale-in">
                <img src={preview} alt="Product" className="w-44 h-44 object-cover rounded-2xl border border-border shadow-lg" />
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

            {mode !== "photo" && (
              <div className="relative animate-scale-in">
                <div className="w-44 h-44 rounded-2xl border border-border bg-card flex items-center justify-center shadow-lg">
                  {mode === "barcode" ? <Barcode className="w-16 h-16 text-primary/40" /> : <FileText className="w-16 h-16 text-primary/40" />}
                </div>
                {isComplete && (
                  <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-primary rounded-full flex items-center justify-center shadow-lg animate-check-bounce">
                    <CheckCircle2 className="w-6 h-6 text-primary-foreground" />
                  </div>
                )}
              </div>
            )}

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

            <div className="w-full space-y-3 mt-2">
              {steps.map((step, index) => {
                const isActive = index === activeStep;
                const isDone = index < activeStep || isComplete;
                const StepIcon = step.icon;
                return (
                  <div
                    key={index}
                    className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 ${
                      isActive ? "bg-primary/10 border border-primary/20"
                        : isDone ? "bg-card/60 border border-border"
                        : "border border-transparent"
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-300 ${
                      isDone ? "bg-primary text-primary-foreground"
                        : isActive ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {isDone ? <CheckCircle2 className="w-4 h-4" /> : <StepIcon className={`w-4 h-4 ${isActive ? "animate-pulse" : ""}`} />}
                    </div>
                    <span className={`text-sm font-display transition-colors duration-300 ${
                      isActive ? "text-foreground font-semibold"
                        : isDone ? "text-muted-foreground"
                        : "text-muted-foreground/60"
                    }`}>{step.label}</span>
                    {isActive && !isDone && (
                      <div className="ml-auto flex gap-1">
                        {[0, 1, 2].map((dot) => (
                          <div key={dot} className="w-1.5 h-1.5 rounded-full bg-primary" style={{ animation: `pulse 1.2s ease-in-out ${dot * 0.2}s infinite` }} />
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <>
            {mode === "photo" && (
              <>
                <div className="text-center mb-2 animate-fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Camera className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-xl text-foreground">Scan Ingredients / Barcode</h3>
                  <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
                    Take a photo or upload an image of the ingredient list
                  </p>
                </div>
                <div
                  className={`w-full max-w-sm aspect-[3/4] rounded-3xl border-2 border-dashed flex flex-col items-center justify-center gap-4 relative overflow-hidden transition-all duration-300 animate-fade-in-up ${
                    isDragOver ? "border-primary bg-primary/5 scale-[1.02]" : "border-border bg-card/30 hover:border-primary/40 hover:bg-card/50"
                  }`}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onDragLeave={() => setIsDragOver(false)}
                >
                  <div className="absolute top-4 left-4 w-8 h-8 border-t-2 border-l-2 border-primary/30 rounded-tl-lg" />
                  <div className="absolute top-4 right-4 w-8 h-8 border-t-2 border-r-2 border-primary/30 rounded-tr-lg" />
                  <div className="absolute bottom-4 left-4 w-8 h-8 border-b-2 border-l-2 border-primary/30 rounded-bl-lg" />
                  <div className="absolute bottom-4 right-4 w-8 h-8 border-b-2 border-r-2 border-primary/30 rounded-br-lg" />
                  <Camera className={`w-14 h-14 transition-colors duration-300 ${isDragOver ? "text-primary" : "text-muted-foreground/40"}`} />
                  <p className="text-muted-foreground text-xs text-center px-10">
                    {isDragOver ? "Drop image here" : "Make sure the ingredient text is clearly visible"}
                  </p>
                </div>
                <div className="flex gap-3 w-full max-w-sm animate-fade-in-up">
                  <button
                    onClick={() => cameraInputRef.current?.click()}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display font-semibold py-4 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
                  >
                    <Camera className="w-5 h-5" />Camera
                  </button>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isProcessing}
                    className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground font-display font-semibold py-4 rounded-2xl hover:bg-secondary/80 active:scale-[0.97] transition-all duration-200 border border-border disabled:opacity-50"
                  >
                    <ImagePlus className="w-5 h-5" />Gallery
                  </button>
                </div>
              </>
            )}

            {mode === "barcode" && (
              <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-fade-in">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Barcode className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-xl text-foreground">Scan Barcode</h3>
                  <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
                    Point your camera at a barcode or enter it manually
                  </p>
                </div>

                {scannerActive ? (
                  <div className="w-full space-y-3">
                    <BarcodeScanner onDetected={handleBarcodeDetected} active={scannerActive} />
                    <button
                      onClick={() => setScannerActive(false)}
                      className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors py-2"
                    >
                      Enter manually instead
                    </button>
                  </div>
                ) : (
                  <div className="w-full space-y-3">
                    <button
                      onClick={() => setScannerActive(true)}
                      className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display font-semibold py-4 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 active:scale-[0.97] transition-all duration-200"
                    >
                      <Camera className="w-5 h-5" />
                      Open Camera Scanner
                    </button>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">or enter manually</span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="e.g. 8901063034136"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          void processBarcode(barcodeInput);
                        }
                      }}
                      className="w-full bg-card border border-border rounded-2xl px-4 py-4 text-foreground placeholder:text-muted-foreground text-center text-lg font-display tracking-widest focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all"
                    />
                    <button
                      onClick={() => void processBarcode(barcodeInput)}
                      disabled={!barcodeInput.trim() || isProcessing}
                      className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground font-display font-semibold py-4 rounded-2xl hover:bg-secondary/80 active:scale-[0.97] transition-all duration-200 border border-border disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Search className="w-5 h-5" />
                      Look Up Product
                    </button>
                  </div>
                )}
                <p className="text-muted-foreground/60 text-xs text-center">
                  Powered by Open Food Facts database
                </p>
              </div>
            )}

            {mode === "ingredients" && (
              <div className="flex flex-col items-center gap-6 w-full max-w-sm animate-fade-in">
                <div className="text-center">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                  <h3 className="font-display font-semibold text-xl text-foreground">Paste Ingredients</h3>
                  <p className="text-muted-foreground text-sm mt-2 max-w-xs mx-auto">
                    Copy the ingredient list from the product and paste it below
                  </p>
                </div>
                <div className="w-full space-y-3">
                  <textarea
                    placeholder="e.g. Sugar, Palm Oil, Cocoa Solids, Milk Solids, Emulsifiers (E322, E476)..."
                    value={ingredientsInput}
                    onChange={(e) => setIngredientsInput(e.target.value)}
                    rows={6}
                    className="w-full bg-card border border-border rounded-2xl px-4 py-4 text-foreground placeholder:text-muted-foreground text-sm font-body leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-all resize-none"
                  />
                  <button
                    onClick={() => void processIngredients()}
                    disabled={!ingredientsInput.trim() || isProcessing}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display font-semibold py-4 rounded-2xl shadow-lg shadow-primary/25 hover:shadow-primary/40 hover:brightness-110 active:scale-[0.97] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ShieldCheck className="w-5 h-5" />
                    Analyze Ingredients
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
      </div>

      {showUpgradeModal && <UpgradeModal onClose={() => setShowUpgradeModal(false)} />}
    </div>
  );
};

export default ScanPage;
