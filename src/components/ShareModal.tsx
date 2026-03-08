import { useRef, useState, useCallback, useEffect, forwardRef } from "react";
import html2canvas from "html2canvas";
import { Share2, Download, Copy, X, Loader2, Image } from "lucide-react";
import { toast } from "sonner";
import ShareCard from "@/components/ShareCard";
import type { AnalysisResult } from "@/types/analysis";

interface Props {
  analysis: AnalysisResult;
  displayScore: number;
  displayLevel: string;
  baseScore?: number;
  userPlan?: string;
  onClose: () => void;
}

const ShareModal = forwardRef<HTMLDivElement, Props>(({ analysis, displayScore, displayLevel, baseScore, onClose }, _ref) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const productName =
    analysis.overall_verdict ||
    analysis.product_summary?.split(".")[0]?.slice(0, 60) ||
    "Product Analysis";

  // Generate a preview image on mount
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!cardRef.current) return;
      try {
        const canvas = await html2canvas(cardRef.current, {
          scale: 0.35,
          useCORS: true,
          backgroundColor: "#0d1117",
          logging: false,
        });
        setPreviewUrl(canvas.toDataURL("image/png"));
      } catch {
        // Preview failed, that's ok
      }
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 1,
        useCORS: true,
        backgroundColor: "#0d1117",
        logging: false,
      });
      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
      });
    } catch (err) {
      console.error("Failed to generate image:", err);
      toast.error("Failed to generate image");
      return null;
    } finally {
      setGenerating(false);
    }
  }, []);

  const handleDownload = async () => {
    const blob = await generateImage();
    if (!blob) return;
    triggerDownload(blob);
    toast.success("Image downloaded!");
  };

  const handleShare = async () => {
    const blob = await generateImage();
    if (!blob) return;

    const file = new File([blob], "picsafe-result.png", { type: "image/png" });

    // 1. Try native share with file (works on mobile browsers)
    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: "PicSafe Food Scan Result",
          text: `${productName} - Score: ${displayScore}/100`,
          files: [file],
        });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return; // User cancelled
      }
    }

    // 2. Try native share without file (text only — still opens share sheet)
    if (navigator.share) {
      try {
        const isPersonalized = baseScore !== undefined && baseScore !== displayScore;
        await navigator.share({
          title: "PicSafe Food Scan Result",
          text: isPersonalized
            ? `🔍 ${productName}\n📊 Base Score: ${baseScore}/100\n❤️ Your Score: ${displayScore}/100 (${displayLevel})\n\nScanned with PicSafe Food\n🔗 picsafefood.in`
            : `🔍 ${productName}\n📊 Score: ${displayScore}/100 (${displayLevel})\n\nScanned with PicSafe Food\n🔗 picsafefood.in`,
        });
        // Also download the image so they have it
        triggerDownload(blob);
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }

    // 3. Try copying image to clipboard
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      toast.success("Image copied to clipboard! Paste it in WhatsApp, Instagram, etc.");
      return;
    } catch {}

    // 4. Final fallback: download
    triggerDownload(blob);
    toast.success("Image downloaded! Share it on WhatsApp, Instagram, or any app.");
  };

  const triggerDownload = (blob: Blob) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `picsafe-${productName.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 30)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyText = () => {
    const isPersonalized = baseScore !== undefined && baseScore !== displayScore;
    const concerns = analysis.harmful_ingredients.slice(0, 3);
    const benefits = analysis.beneficial_ingredients.slice(0, 2);
    const text = [
      `🔍 ${productName}`,
      "",
      isPersonalized
        ? `📊 Base Score: ${baseScore}/100\n❤️ Your Personalized Score: ${displayScore}/100 (${displayLevel})\n   Adjusted based on your health profile`
        : `📊 Score: ${displayScore}/100 (${displayLevel})`,
      "",
      concerns.length > 0
        ? `⚠️ Concerns:\n${concerns.map((c) => `  • ${c}`).join("\n")}`
        : "",
      benefits.length > 0
        ? `✅ Good Points:\n${benefits.map((b) => `  • ${b}`).join("\n")}`
        : "",
      "",
      `${analysis.recommendation}`,
      "",
      "Scanned with PicSafe Food",
      "🔗 pic-safe-food.lovable.app",
    ]
      .filter(Boolean)
      .join("\n");

    navigator.clipboard.writeText(text);
    toast.success("Result text copied!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      {/* Off-screen full-size card for html2canvas */}
      <div
        style={{
          position: "fixed",
          left: "-9999px",
          top: 0,
          width: 1080,
          height: 1080,
          overflow: "hidden",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <ShareCard
          ref={cardRef}
          analysis={analysis}
          displayScore={displayScore}
          displayLevel={displayLevel}
          productName={productName}
          baseScore={baseScore}
        />
      </div>

      <div className="bg-card border border-border rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Image className="w-5 h-5 text-primary" />
            <h3 className="font-display font-semibold text-foreground">Share Result Card</h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preview */}
        <div className="p-4">
          <div className="rounded-2xl overflow-hidden border border-border shadow-lg bg-[#0d1117] aspect-square flex items-center justify-center">
            {previewUrl ? (
              <img src={previewUrl} alt="Share card preview" className="w-full h-full object-contain" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs">Generating preview...</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 pt-0 space-y-2">
          <button
            onClick={handleShare}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground font-display font-semibold py-3.5 rounded-2xl glow-primary hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {generating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Share2 className="w-5 h-5" />
            )}
            Share Image
          </button>

          <div className="flex gap-2">
            <button
              onClick={handleDownload}
              disabled={generating}
              className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground font-display font-medium py-3 rounded-2xl hover:bg-secondary/80 active:scale-[0.98] transition-all text-sm disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={handleCopyText}
              className="flex-1 flex items-center justify-center gap-2 bg-secondary text-secondary-foreground font-display font-medium py-3 rounded-2xl hover:bg-secondary/80 active:scale-[0.98] transition-all text-sm"
            >
              <Copy className="w-4 h-4" />
              Copy Text
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

ShareModal.displayName = "ShareModal";
export default ShareModal;
