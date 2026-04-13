import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Star, TrendingUp, Flame, Droplets, Cookie, ChevronRight } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { SideMenu } from "@/components/SideMenu";

type Category = "all" | "snacks" | "drinks" | "chips" | "biscuits" | "instant";

interface Product {
  name: string;
  brand: string;
  barcode: string;
  category: Category;
  image: string;
  popular?: boolean;
}

const PRODUCTS: Product[] = [
  // Snacks
  { name: "Maggi 2-Minute Noodles", brand: "Nestlé", barcode: "8901058851373", category: "instant", image: "🍜", popular: true },
  { name: "Kurkure Masala Munch", brand: "PepsiCo", barcode: "8901491101769", category: "snacks", image: "🌶️", popular: true },
  { name: "Haldiram's Aloo Bhujia", brand: "Haldiram's", barcode: "8904004400019", category: "snacks", image: "🥔" },
  { name: "Lays Magic Masala", brand: "PepsiCo", barcode: "8901491101516", category: "chips", image: "🥔", popular: true },
  { name: "Parle-G Biscuits", brand: "Parle", barcode: "8901725133602", category: "biscuits", image: "🍪", popular: true },
  { name: "Britannia Good Day", brand: "Britannia", barcode: "8901063034136", category: "biscuits", image: "🍪" },
  { name: "Hide & Seek Chocolate", brand: "Parle", barcode: "8901725181208", category: "biscuits", image: "🍫" },
  { name: "Bingo Mad Angles", brand: "ITC", barcode: "8901725181307", category: "chips", image: "📐" },
  { name: "Uncle Chipps", brand: "PepsiCo", barcode: "8901491502085", category: "chips", image: "🥔" },
  { name: "Bikano Namkeen Mix", brand: "Bikano", barcode: "8901116860019", category: "snacks", image: "🥜" },

  // Drinks
  { name: "Thums Up", brand: "Coca-Cola", barcode: "8901765111012", category: "drinks", image: "🥤", popular: true },
  { name: "Maaza Mango", brand: "Coca-Cola", barcode: "8901765107305", category: "drinks", image: "🥭" },
  { name: "Frooti Mango", brand: "Parle Agro", barcode: "8901526700018", category: "drinks", image: "🥭", popular: true },
  { name: "Real Fruit Juice Mixed Fruit", brand: "Dabur", barcode: "8901207012884", category: "drinks", image: "🧃" },
  { name: "Paper Boat Aam Panna", brand: "Paper Boat", barcode: "8906071780018", category: "drinks", image: "🍋" },
  { name: "Sting Energy Drink", brand: "PepsiCo", barcode: "8901588003352", category: "drinks", image: "⚡" },
  { name: "Bisleri Soda", brand: "Bisleri", barcode: "8901234567890", category: "drinks", image: "💧" },
  { name: "Pepsi", brand: "PepsiCo", barcode: "8901588001143", category: "drinks", image: "🥤" },

  // Instant
  { name: "Yippee Noodles", brand: "ITC", barcode: "8901725183100", category: "instant", image: "🍜" },
  { name: "Top Ramen Curry", brand: "Nissin", barcode: "8901058856194", category: "instant", image: "🍜" },
  { name: "MTR Ready to Eat Poha", brand: "MTR", barcode: "8901042558059", category: "instant", image: "🍚" },
  { name: "Knorr Soupy Noodles", brand: "Unilever", barcode: "8901030765834", category: "instant", image: "🍲" },
  { name: "Wai Wai Noodles", brand: "CG Foods", barcode: "8901088723459", category: "instant", image: "🍜" },
  { name: "Britannia Marie Gold", brand: "Britannia", barcode: "8901063031630", category: "biscuits", image: "🍪" },
];

const CATEGORIES: { key: Category; label: string; icon: any }[] = [
  { key: "all", label: "All", icon: Star },
  { key: "snacks", label: "Snacks", icon: Cookie },
  { key: "chips", label: "Chips", icon: Flame },
  { key: "biscuits", label: "Biscuits", icon: Cookie },
  { key: "drinks", label: "Drinks", icon: Droplets },
  { key: "instant", label: "Instant", icon: TrendingUp },
];

const DiscoverPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<Category>("all");

  const filtered = PRODUCTS.filter((p) => {
    const matchesCategory = category === "all" || p.category === category;
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.brand.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const popular = PRODUCTS.filter((p) => p.popular);

  const handleProductClick = (barcode: string) => {
    navigate("/scan", { state: { autoBarcode: barcode } });
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <SideMenu />

      {/* Header */}
      <div className="px-4 pt-6 pb-3">
        <h1 className="font-display font-bold text-2xl text-foreground ml-12">Discover</h1>
        <p className="text-muted-foreground text-sm mt-1 ml-12">Popular Indian products to scan</p>
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

      {/* Trending Section (only when no search and "all" category) */}
      {!search && category === "all" && (
        <div className="px-4 mb-6">
          <h2 className="font-display font-semibold text-base text-foreground mb-3 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Trending Products
          </h2>
          <div className="flex gap-3 overflow-x-auto pb-1 no-scrollbar">
            {popular.map((p) => (
              <button
                key={p.barcode}
                onClick={() => handleProductClick(p.barcode)}
                className="flex-shrink-0 w-32 bg-card border border-border rounded-2xl p-3 text-left hover:border-primary/40 transition-all active:scale-[0.97]"
              >
                <div className="text-3xl mb-2">{p.image}</div>
                <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
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
              key={p.barcode}
              onClick={() => handleProductClick(p.barcode)}
              className="w-full flex items-center gap-3 bg-card border border-border rounded-2xl p-3 hover:border-primary/40 transition-all active:scale-[0.98]"
            >
              <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center text-2xl flex-shrink-0">
                {p.image}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.brand}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
          {filtered.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground text-sm">No products found</p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
};

export default DiscoverPage;
