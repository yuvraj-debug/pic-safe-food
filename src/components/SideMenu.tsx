import { useNavigate, useLocation } from "react-router-dom";
import { Menu, Heart, CreditCard, Crown, Gift, GitCompareArrows } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState } from "react";

export const SideMenu = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin } = useAuth();
  const [open, setOpen] = useState(false);

  const items = [
    { icon: Heart, label: "Health Profile", path: "/health-profile" },
    { icon: Gift, label: "Earn Free Scans", path: "/earn-scans" },
    { icon: CreditCard, label: "Plans & Pricing", path: "/pricing" },
    ...(isAdmin ? [{ icon: Crown, label: "Admin Panel", path: "/admin" }] : []),
  ];

  const handleNavigate = (path: string) => {
    navigate(path);
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button className="fixed top-4 left-4 z-50 w-10 h-10 rounded-xl bg-card/90 backdrop-blur-md border border-border flex items-center justify-center shadow-sm hover:bg-accent transition-colors">
          <Menu className="w-5 h-5 text-foreground" />
        </button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="p-6 pb-4">
          <SheetTitle className="text-left text-lg font-display">Menu</SheetTitle>
        </SheetHeader>
        <nav className="px-3 pb-6 space-y-1">
          {items.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <button
                key={item.path}
                onClick={() => handleNavigate(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-foreground hover:bg-accent"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            );
          })}
        </nav>
      </SheetContent>
    </Sheet>
  );
};
