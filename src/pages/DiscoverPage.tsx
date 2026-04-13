import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, TrendingUp, Flame, Droplets, Cookie, ChevronRight, Loader2, Compass } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { SideMenu } from "@/components/SideMenu";
import { supabase } from "@/integrations/supabase/client";

type Category = "all" | "snacks" | "drinks" | "chips" | "biscuits" | "instant" | "dairy" | "sweets" | "other";

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
  created_at: string;
}

const CATEGORIES: { key: Category; label: string; icon: any }[] = [
  { key: "all", label: "All", icon: Star },
  { key: "snacks", label: "Snacks", icon: Cookie },
  { key: "chips", label: "Chips", icon: Flame },
  { key: "biscuits", label: "Biscuits", icon: Cookie },
  { key: "drinks", label: "Drinks", icon: Droplets },
  { key: "instant", label: "Instant", icon: TrendingUp },
  { key: "dairy", label: "Dairy", icon: Droplets },
  { key: "sweets", label: "Sweets", icon: Cookie },
];

const getScoreColor = (score: number) =>
  score >= 70 ? "text-green-500" : score >= 40 ? "text-yellow-500" : "text-red-500";

const getScoreBg = (score: number) =>
  score >= 70 ? "bg-green-500/10 border-green-500/20" : score >= 40 ? "bg-yellow-500/10 border-yellow-500/20" : "bg-red-500/10 border-red-500/20";

const DiscoverPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");
  const [products, setProducts] = useState<DiscoverProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      const { data, error } = await supabase
        .from("discover_products")
        .select("*")
        .eq("is_active", true)
        .order("is_featured", { ascending: false })
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Failed to fetch discover products:", error);
      }
      setProducts((data as any) ?? []);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const filtered = products.filter((p) => {
    const matchesCategory = category === "all" || p.category === category;
    const matchesSearch =
      !search ||
      p.product_name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const featured = products.filter((p) => p.is_featured);

  const handleProductClick = (product: DiscoverProduct) => {
    // Navigate to results page with pre-analyzed data — no AI call needed
    navigate("/results", { state: { analysis: product.analysis } });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SideMenu />

      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <h1 className="font-display font-bold text-2xl text-foreground ml-12 flex items-center gap-2">
          <Compass className="w-6 h-6 text-primary" />
          Discover
        </h1>
        <p className="text-muted-foreground text-sm mt-1 ml-12">Explore pre-analyzed food products</p>
      </div>

      {/* Search */}
      <div className="px-4 mb-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search products or brands..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-2xl pl-11 pr-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-all"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="px-4 mb-5">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORIES.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setCategory(key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                category === key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 text-primary animate-spin" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-20 px-6">
          <Compass className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="font-display font-semibold text-lg text-foreground mb-2">No products yet</h3>
          <p className="text-muted-foreground text-sm">Products will appear here once added by admin.</p>
        </div>
      ) : (
        <>
          {/* Trending Section */}
          {!search && category === "all" && featured.length > 0 && (
            <div className="px-4 mb-6">
              <h2 className="font-display font-semibold text-base text-foreground mb-3 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                Featured Products
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
                {featured.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => handleProductClick(p)}
                    className="flex-shrink-0 w-36 bg-card border border-border rounded-2xl p-3 text-left hover:border-primary/40 transition-all active:scale-[0.97]"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-3xl">{p.emoji}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-lg border ${getScoreBg(p.safety_score)} ${getScoreColor(p.safety_score)}`}>
                        {p.safety_score}
                      </span>
                    </div>
                    <p className="text-xs font-medium text-foreground truncate">{p.product_name}</p>
                    <p className="text-[10px] text-muted-foreground">{p.brand}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Products List */}
          <div className="px-4">
            <h2 className="font-display font-semibold text-base text-foreground mb-3">
              {category === "all" ? "All Products" : CATEGORIES.find((c) => c.key === category)?.label}
              <span className="text-muted-foreground font-normal text-sm ml-2">({filtered.length})</span>
            </h2>
            <div className="space-y-2">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => handleProductClick(p)}
                  className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:border-primary/40 transition-all active:scale-[0.98]"
                >
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0">
                    {p.emoji}
                  </div>
                  <div className="flex-1 text-left min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{p.product_name}</p>
                    <p className="text-xs text-muted-foreground">{p.brand}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-bold ${getScoreColor(p.safety_score)}`}>
                      {p.safety_score}
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </button>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-sm">No products found</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <BottomNav />
    </div>
  );
};

export default DiscoverPage;
