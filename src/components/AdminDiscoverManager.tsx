import { useState, useEffect, type ChangeEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import {
  Plus,
  Loader2,
  Camera,
  Barcode,
  FileText,
  Trash2,
  Star,
  StarOff,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import type { AnalysisResult } from "@/types/analysis";
import { normalizeAnalysis } from "@/lib/analysisNormalizer";
import { invokeFoodAnalysis, productNameFromAnalysis, isFoodAnalysisSuccess } from "@/lib/foodAnalysisApi";

interface DiscoverProduct {
  id: string;
  product_name: string;
  brand: string;
  category: string;
  barcode: string;
  emoji: string;
  thumbnail: string | null;
  safety_score: number;
  safety_level: string;
  analysis: AnalysisResult;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}

type InputMode = "image" | "barcode" | "ingredients";

const CATEGORIES = ["snacks", "chips", "biscuits", "drinks", "instant", "dairy", "sweets", "other"];
const BASE_PRODUCT_MARKERS = ["Food", "Snack", "Chips", "Spicy", "Drink", "Dairy", "Noodle", "Sweet", "Meal", "Nut", "Energy", "Water"];
const EMOJIS = ["🍽️", "🍪", "🥔", "🌶️", "🥤", "🥭", "🍜", "🍫", "🍲", "🥜", "⚡", "💧", "🧃", "🍋", "📐", "🍚", "🧈", "🍬"];

const PRODUCT_MARKERS = BASE_PRODUCT_MARKERS.concat(EMOJIS.slice(0, 0));

export const AdminDiscoverManager = () => {
  const [products, setProducts] = useState<DiscoverProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<InputMode>("barcode");
  const [analyzing, setAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("snacks");
  const [barcode, setBarcode] = useState("");
  const [emoji, setEmoji] = useState("🍽️");
  const [isFeatured, setIsFeatured] = useState(false);
  const [ingredientsText, setIngredientsText] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    void fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    console.log("[AdminDiscoverManager] Fetching products...");
    
    // First check if user is admin
    const { data: { user } } = await supabase.auth.getUser();
    console.log("[AdminDiscoverManager] Current user:", user?.id, user?.email);
    
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user?.id);
    console.log("[AdminDiscoverManager] User roles:", roles);
    
    const { data, error } = await supabase
      .from("discover_products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[AdminDiscoverManager] Error fetching products:", {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      toast.error(`Failed to load products: ${error.message}`);
      setProducts([]);
      setLoading(false);
      return;
    }
    
    console.log("[AdminDiscoverManager] Products loaded:", data?.length || 0);
    console.log("[AdminDiscoverManager] Sample product data:", data?.[0]);

    setProducts(
      (data ?? []).map((row) => ({
        id: row.id,
        product_name: row.product_name,
        brand: row.brand,
        category: row.category,
        barcode: row.barcode ?? "",
        emoji: row.emoji ?? "🍽️",
        thumbnail: row.thumbnail,
        safety_score: row.safety_score,
        safety_level: row.safety_level,
        analysis: normalizeAnalysis(row.analysis as Record<string, unknown>),
        is_featured: row.is_featured,
        is_active: row.is_active,
        created_at: row.created_at,
      }))
    );
    setLoading(false);
  };

  const resetForm = () => {
    setProductName("");
    setBrand("");
    setCategory("snacks");
    setBarcode("");
    setEmoji("🍽️");
    setIsFeatured(false);
    setIngredientsText("");
    setImagePreview(null);
    setShowForm(false);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const analyzeAndAdd = async () => {
    setAnalyzing(true);
    try {
      let analysisInput: Record<string, string> = {};
      let detectedProductName = productName.trim();
      let detectedBrand = brand.trim();
      const trimmedBarcode = barcode.trim();

      if (mode === "image" && imagePreview) {
        analysisInput = { image: imagePreview };
      } else if (mode === "barcode" && trimmedBarcode) {
        analysisInput = { barcode: trimmedBarcode };

        try {
          const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${trimmedBarcode}.json`);
          if (res.ok) {
            const productData = await res.json();
            if (productData.status === 1 && productData.product) {
              const product = productData.product;
              detectedProductName = detectedProductName || product.product_name || "";
              detectedBrand = detectedBrand || product.brands || "";
              if (!productName && detectedProductName) setProductName(detectedProductName);
              if (!brand && detectedBrand) setBrand(detectedBrand);
            }
          }
        } catch (err) {
          console.warn("[AdminDiscoverManager] Open Food Facts metadata lookup failed:", err);
        }
      } else if (mode === "ingredients" && ingredientsText.trim()) {
        const parts = [
          detectedProductName && `Product: ${detectedProductName}`,
          detectedBrand && `Brand: ${detectedBrand}`,
          `Ingredients: ${ingredientsText}`,
        ].filter(Boolean).join("\n");
        analysisInput = { ingredients_text: parts };
      } else {
        toast.error("Please provide input for analysis.");
        return;
      }

      const result = await invokeFoodAnalysis(analysisInput);
      if (!isFoodAnalysisSuccess(result)) {
        toast.error(result.message);
        return;
      }

      const analysis = result.analysis;
      const { data: { user } } = await supabase.auth.getUser();
      const finalName = detectedProductName || productNameFromAnalysis(analysis);

      const insertPayload: TablesInsert<"discover_products"> = {
        product_name: finalName,
        brand: detectedBrand,
        category,
        barcode: trimmedBarcode,
        emoji,
        thumbnail: imagePreview && imagePreview.length < 100000 ? imagePreview : null,
        safety_score: analysis.safety_score,
        safety_level: analysis.safety_level,
        analysis: analysis as unknown as TablesInsert<"discover_products">["analysis"],
        is_featured: isFeatured,
        is_active: true,
        added_by: user?.id,
      };

      const { error: insertError } = await supabase.from("discover_products").insert(insertPayload);
      if (insertError) throw insertError;

      toast.success(`${finalName} added to Discover!`);
      resetForm();
      await fetchProducts();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to analyze and add product.";
      toast.error(message);
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    const payload: TablesUpdate<"discover_products"> = { is_featured: !current };
    const { error } = await supabase
      .from("discover_products")
      .update(payload)
      .eq("id", id);
    if (error) {
      toast.error("Failed to update");
      return;
    }
    setProducts((prev) => prev.map((product) => (product.id === id ? { ...product, is_featured: !current } : product)));
  };

  const toggleActive = async (id: string, current: boolean) => {
    const payload: TablesUpdate<"discover_products"> = { is_active: !current };
    const { error } = await supabase
      .from("discover_products")
      .update(payload)
      .eq("id", id);
    if (error) {
      toast.error("Failed to update");
      return;
    }
    setProducts((prev) => prev.map((product) => (product.id === id ? { ...product, is_active: !current } : product)));
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("discover_products").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      return;
    }
    setProducts((prev) => prev.filter((product) => product.id !== id));
    toast.success("Product deleted");
  };

  const filteredProducts = products.filter((product) =>
    product.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.brand.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getScoreColor = (score: number) =>
    score >= 70 ? "text-green-500" : score >= 40 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5" />
          Discover Products ({products.length})
        </p>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-semibold hover:brightness-110 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Product
        </button>
      </div>

      {showForm && (
        <div className="bg-gradient-card rounded-2xl border border-border p-4 space-y-4">
          <h3 className="font-display font-semibold text-foreground">Add New Product</h3>

          <div className="flex gap-2">
            {([
              { key: "barcode" as InputMode, label: "Barcode", icon: Barcode },
              { key: "ingredients" as InputMode, label: "Ingredients", icon: FileText },
              { key: "image" as InputMode, label: "Image", icon: Camera },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setMode(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  mode === key
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <input
              type="text"
              placeholder="Product Name (optional, AI will fill)"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className="col-span-2 bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <input
              type="text"
              placeholder="Brand"
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              {CATEGORIES.map((value) => (
                <option key={value} value={value}>{value.charAt(0).toUpperCase() + value.slice(1)}</option>
              ))}
            </select>
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Product Marker</p>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_MARKERS.map((value) => (
                <button
                  key={value}
                  onClick={() => setEmoji(value)}
                  className={`min-w-14 h-9 px-2 rounded-lg text-xs font-medium flex items-center justify-center transition-all ${
                    emoji === value ? "bg-primary/20 border-2 border-primary" : "bg-secondary border border-border hover:bg-secondary/80"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          {mode === "barcode" && (
            <input
              type="text"
              inputMode="numeric"
              placeholder="Enter barcode number e.g. 8901063034136"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          )}

          {mode === "ingredients" && (
            <textarea
              placeholder="Paste ingredients list..."
              value={ingredientsText}
              onChange={(e) => setIngredientsText(e.target.value)}
              rows={4}
              className="w-full bg-card border border-border rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          )}

          {mode === "image" && (
            <div className="space-y-3">
              {imagePreview ? (
                <div className="relative">
                  <img src={imagePreview} alt="Preview" className="w-full max-h-48 object-contain rounded-xl border border-border" />
                  <button
                    onClick={() => setImagePreview(null)}
                    className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-card/90 border border-border flex items-center justify-center"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-destructive" />
                  </button>
                </div>
              ) : (
                <label className="block w-full border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors">
                  <Camera className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Click to upload product image</p>
                  <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                </label>
              )}
            </div>
          )}

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-foreground">Mark as Featured/Trending</span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={resetForm}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => void analyzeAndAdd()}
              disabled={analyzing}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-primary text-primary-foreground hover:brightness-110 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                "Analyze & Add"
              )}
            </button>
          </div>
        </div>
      )}

      {!showForm && products.length > 0 && (
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-card border border-border rounded-xl py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-6">
          {products.length === 0 ? "No products yet. Add your first!" : "No matching products."}
        </p>
      ) : (
        <div className="space-y-2">
          {filteredProducts.map((product) => (
            <div key={product.id} className="bg-gradient-card rounded-xl border border-border overflow-hidden">
              <button
                onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
                className="w-full p-3 flex items-center gap-3 text-left"
              >
                <span className="text-2xl">{product.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{product.product_name}</p>
                    {product.is_featured && <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 shrink-0" />}
                    {!product.is_active && <EyeOff className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  </div>
                  <p className="text-xs text-muted-foreground">{product.brand} - {product.category}</p>
                </div>
                <span className={`text-sm font-bold ${getScoreColor(product.safety_score)}`}>
                  {product.safety_score}
                </span>
                {expandedProduct === product.id ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>

              {expandedProduct === product.id && (
                <div className="px-3 pb-3 border-t border-border pt-2 space-y-2">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => void toggleFeatured(product.id, product.is_featured)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                      {product.is_featured ? <StarOff className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                      {product.is_featured ? "Unfeature" : "Feature"}
                    </button>
                    <button
                      onClick={() => void toggleActive(product.id, product.is_active)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                      {product.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {product.is_active ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => void deleteProduct(product.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-2 text-xs text-muted-foreground">
                    <p><strong>Score:</strong> {product.safety_score} - {product.safety_level}</p>
                    {product.barcode && <p><strong>Barcode:</strong> {product.barcode}</p>}
                    <p><strong>Added:</strong> {new Date(product.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
