import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { CurrencyProvider } from "@/lib/currency-context";
import { ThemeProvider } from "next-themes";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import OnboardingWizard from "@/components/OnboardingWizard";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Checkout from "./pages/Checkout";
import PaymentCallback from "./pages/PaymentCallback";
import Support from "./pages/Support";
import SupportTicket from "./pages/SupportTicket";
import HelpCenter from "./pages/HelpCenter";
import ReferrerDashboard from "./pages/dashboard/ReferrerDashboard";
import WholesalerDashboard from "./pages/dashboard/WholesalerDashboard";
import ProducerDashboard from "./pages/dashboard/ProducerDashboard";
import AdminPanel from "./pages/dashboard/AdminPanel";
import ProfilePage from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import Refunds from "./pages/Refunds";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <AuthProvider>
          <CurrencyProvider>
            <CartProvider>
              <Toaster />
              <Sonner />
            <BrowserRouter>
              <Navbar />
              <OnboardingWizard />
              <Routes>
                <Route path="/" element={<Landing />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/products" element={<Products />} />
                <Route path="/products/:id" element={<ProductDetail />} />
                <Route path="/checkout" element={<Checkout />} />
                <Route path="/payment/callback" element={<PaymentCallback />} />
                <Route path="/support" element={<Support />} />
                <Route path="/support/:id" element={<ProtectedRoute><SupportTicket /></ProtectedRoute>} />
                <Route path="/help" element={<HelpCenter />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/refunds" element={<Refunds />} />
                <Route path="/dashboard/referrer" element={<ProtectedRoute allowedRoles={['referrer']}><ReferrerDashboard /></ProtectedRoute>} />
                <Route path="/dashboard/wholesaler" element={<ProtectedRoute allowedRoles={['wholesaler']}><WholesalerDashboard /></ProtectedRoute>} />
                <Route path="/dashboard/producer" element={<ProtectedRoute allowedRoles={['producer']}><ProducerDashboard /></ProtectedRoute>} />
                <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
            </CartProvider>
          </CurrencyProvider>
        </AuthProvider>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
