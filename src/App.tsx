import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth, AuthProvider } from "@/hooks/useAuth";
import HomePage from "./pages/HomePage";
import ScanPage from "./pages/ScanPage";
import ResultsPage from "./pages/ResultsPage";
import AuthPage from "./pages/AuthPage";
import AdminPage from "./pages/AdminPage";
import PricingPage from "./pages/PricingPage";
import HistoryPage from "./pages/HistoryPage";
import ComparePage from "./pages/ComparePage";
import DiscoverPage from "./pages/DiscoverPage";

import ProfilePage from "./pages/ProfilePage";
import HealthProfilePage from "./pages/HealthProfilePage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import EarnScansPage from "./pages/EarnScansPage";
import NotFound from "./pages/NotFound";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <AuthPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
      <Route path="/scan" element={<ProtectedRoute><ScanPage /></ProtectedRoute>} />
      <Route path="/results" element={<ProtectedRoute><ResultsPage /></ProtectedRoute>} />
      <Route path="/pricing" element={<ProtectedRoute><PricingPage /></ProtectedRoute>} />
      <Route path="/history" element={<ProtectedRoute><HistoryPage /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/health-profile" element={<ProtectedRoute><HealthProfilePage /></ProtectedRoute>} />
      <Route path="/earn-scans" element={<ProtectedRoute><EarnScansPage /></ProtectedRoute>} />
      <Route path="/compare" element={<ProtectedRoute><ComparePage /></ProtectedRoute>} />
      <Route path="/discover" element={<ProtectedRoute><DiscoverPage /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
