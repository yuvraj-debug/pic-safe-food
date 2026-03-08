import { useRef, useState, useCallback } from "react";
import html2canvas from "html2canvas";
import { Share2, Download, Copy, X, Loader2, Image } from "lucide-react";
import { toast } from "sonner";
import ShareCard from "@/components/ShareCard";
import type { AnalysisResult } from "@/types/analysis";

interface Props {
  analysis: AnalysisResult;
  displayScore: number;
  displayLevel: string;
  onClose: () => void;
}

const ShareModal = ({ analysis, displayScore, displayLevel, onClose }: Props) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [generating, setGenerating] = useState(false);

  const productName =
    analysis.overall_verdict ||
    analysis.product_summary?.split(".")[0]?.slice(0, 60) ||
    "Product Analysis";

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    setGenerating(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 1,
        useCORS: true,
        backgroundColor: null,
        width: 1080,
        height: 1080,
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
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `picsafe-${productName.replace(/[^a-zA-Z0-9]/g, "-").slice(0, 30)}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Image downloaded!");
  };

  const handleShare = async () => {
    const blob = await generateImage();
    if (!blob) return;

    const file = new File([blob], "picsafe-result.png", { type: "image/png" });

    if (navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: "PicSafe Food Scan Result",
          text: `${productName} - Score: ${displayScore}/100`,
          files: [file],
        });
        return;
      } catch {}
    }

    // Fallback: download
    handleDownload();
  };

  const handleCopyText = () => {
    const concerns = analysis.harmful_ingredients.slice(0, 3);
    const benefits = analysis.beneficial_ingredients.slice(0, 2);
    const text = [
      `🔍 ${productName}`,
      `📊 Score: ${displayScore}/100 (${displayLevel})`,
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
          <div className="rounded-2xl overflow-hidden border border-border shadow-lg">
            <div style={{ transform: "scale(0.33)", transformOrigin: "top left", width: 1080, height: 1080 }}>
              <div style={{ width: "100%", height: "100%" }}>
                <ShareCard
                  ref={cardRef}
                  analysis={analysis}
                  displayScore={displayScore}
                  displayLevel={displayLevel}
                  productName={productName}
                />
              </div>
            </div>
          </div>
          {/* Container height fix for scaled preview */}
          <div style={{ marginTop: -1080 * 0.67 }} />
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
};

export default ShareModal;
