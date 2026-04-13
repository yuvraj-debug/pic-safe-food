import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Loader2, Camera, Barcode, FileText, Trash2, Star, StarOff, Eye, EyeOff,
  ChevronDown, ChevronUp, Search
} from "lucide-react";
import { toast } from "sonner";

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
  analysis: any;
  is_featured: boolean;
  is_active: boolean;
  created_at: string;
}

type InputMode = "image" | "barcode" | "ingredients";

const CATEGORIES = ["snacks", "chips", "biscuits", "drinks", "instant", "dairy", "sweets", "other"];
const EMOJIS = ["🍽️", "🍪", "🥔", "🌶️", "🥤", "🥭", "🍜", "🍫", "🍲", "🥜", "⚡", "💧", "🧃", "🍋", "📐", "🍚", "🧈", "🍬"];

export const AdminDiscoverManager = () => {
  const [products, setProducts] = useState<DiscoverProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mode, setMode] = useState<InputMode>("barcode");
  const [analyzing, setAnalyzing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Form state
  const [productName, setProductName] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("snacks");
  const [barcode, setBarcode] = useState("");
  const [emoji, setEmoji] = useState("🍽️");
  const [isFeatured, setIsFeatured] = useState(false);
  const [ingredientsText, setIngredientsText] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    // Admin can see all via "Admins can view all discover products" policy
    const { data, error } = await supabase
      .from("discover_products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load products");
      console.error(error);
    }
    setProducts((data as any) ?? []);
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
    setImageFile(null);
    setImagePreview(null);
    setShowForm(false);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const analyzeAndAdd = async () => {
    setAnalyzing(true);
    try {
      let analysisInput: any = {};

      if (mode === "image" && imagePreview) {
        analysisInput = { image: imagePreview };
      } else if (mode === "barcode" && barcode.trim()) {
        // First fetch from Open Food Facts for ingredient data
        const res = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode.trim()}.json`);
        const productData = await res.json();

        if (productData.status === 1 && productData.product) {
          const p = productData.product;
          if (!productName) setProductName(p.product_name || "");
          if (!brand) setBrand(p.brands || "");

          const parts = [
            p.product_name && `Product: ${p.product_name}`,
            p.brands && `Brand: ${p.brands}`,
            p.ingredients_text && `Ingredients: ${p.ingredients_text}`,
            p.allergens && `Allergens: ${p.allergens}`,
            p.additives_tags?.length && `Additives: ${p.additives_tags.join(", ")}`,
          ].filter(Boolean).join("\n");

          analysisInput = { ingredients_text: parts };
        } else {
          toast.error("Barcode not found in Open Food Facts. Try pasting ingredients manually.");
          setAnalyzing(false);
          return;
        }
      } else if (mode === "ingredients" && ingredientsText.trim()) {
        const parts = [
          productName && `Product: ${productName}`,
          brand && `Brand: ${brand}`,
          `Ingredients: ${ingredientsText}`,
        ].filter(Boolean).join("\n");
        analysisInput = { ingredients_text: parts };
      } else {
        toast.error("Please provide input for analysis.");
        setAnalyzing(false);
        return;
      }

      // Call analyze-food edge function
      const { data: analysis, error } = await supabase.functions.invoke("analyze-food", {
        body: analysisInput,
      });

      if (error) throw error;
      if (analysis?.error) throw new Error(analysis.error);
      if (analysis?.unable_to_fetch) {
        toast.error(analysis.message || "Unable to analyze product.");
        setAnalyzing(false);
        return;
      }

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      const finalName = productName || analysis.product_summary?.split(".")[0]?.slice(0, 60) || "Unknown Product";

      // Save to discover_products
      const { error: insertError } = await supabase.from("discover_products").insert({
        product_name: finalName,
        brand,
        category,
        barcode: barcode.trim(),
        emoji,
        thumbnail: imagePreview && imagePreview.length < 100000 ? imagePreview : null,
        safety_score: analysis.safety_score,
        safety_level: analysis.safety_level,
        analysis,
        is_featured: isFeatured,
        is_active: true,
        added_by: user?.id,
      } as any);

      if (insertError) throw insertError;

      toast.success(`${finalName} added to Discover!`);
      resetForm();
      fetchProducts();
    } catch (err: any) {
      console.error("Analysis failed:", err);
      toast.error(err?.message || "Failed to analyze and add product.");
    } finally {
      setAnalyzing(false);
    }
  };

  const toggleFeatured = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("discover_products")
      .update({ is_featured: !current } as any)
      .eq("id", id);
    if (error) toast.error("Failed to update");
    else setProducts(p => p.map(x => x.id === id ? { ...x, is_featured: !current } : x));
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("discover_products")
      .update({ is_active: !current } as any)
      .eq("id", id);
    if (error) toast.error("Failed to update");
    else setProducts(p => p.map(x => x.id === id ? { ...x, is_active: !current } : x));
  };

  const deleteProduct = async (id: string) => {
    const { error } = await supabase.from("discover_products").delete().eq("id", id);
    if (error) toast.error("Failed to delete");
    else {
      setProducts(p => p.filter(x => x.id !== id));
      toast.success("Product deleted");
    }
  };

  const filteredProducts = products.filter(p =>
    p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand.toLowerCase().includes(searchQuery.toLowerCase())
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

      {/* Add Product Form */}
      {showForm && (
        <div className="bg-gradient-card rounded-2xl border border-border p-4 space-y-4">
          <h3 className="font-display font-semibold text-foreground">Add New Product</h3>

          {/* Input Mode Tabs */}
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

          {/* Common Fields */}
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
              {CATEGORIES.map(c => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Emoji Picker */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Product Emoji</p>
            <div className="flex flex-wrap gap-2">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                    emoji === e ? "bg-primary/20 border-2 border-primary" : "bg-secondary border border-border hover:bg-secondary/80"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Mode-specific Input */}
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
                    onClick={() => { setImageFile(null); setImagePreview(null); }}
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

          {/* Featured Toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(e) => setIsFeatured(e.target.checked)}
              className="rounded"
            />
            <span className="text-sm text-foreground">Mark as Featured/Trending</span>
          </label>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={resetForm}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={analyzeAndAdd}
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

      {/* Search */}
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

      {/* Product List */}
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
                  <p className="text-xs text-muted-foreground">{product.brand} • {product.category}</p>
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
                      onClick={() => toggleFeatured(product.id, product.is_featured)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                      {product.is_featured ? <StarOff className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                      {product.is_featured ? "Unfeature" : "Feature"}
                    </button>
                    <button
                      onClick={() => toggleActive(product.id, product.is_active)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    >
                      {product.is_active ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                      {product.is_active ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => deleteProduct(product.id)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-destructive/10 text-destructive hover:bg-destructive/20"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete
                    </button>
                  </div>
                  <div className="bg-secondary/50 rounded-lg p-2 text-xs text-muted-foreground">
                    <p><strong>Score:</strong> {product.safety_score} — {product.safety_level}</p>
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
