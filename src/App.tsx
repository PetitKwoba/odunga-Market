import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart-context";
import { CurrencyProvider } from "@/lib/currency-context";
import Navbar from "@/components/Navbar";
import ProtectedRoute from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Navbar />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/products" element={<Products />} />
              <Route path="/products/:id" element={<ProductDetail />} />
              <Route path="/checkout" element={<ProtectedRoute allowedRoles={['wholesaler']}><Checkout /></ProtectedRoute>} />
              <Route path="/payment/callback" element={<PaymentCallback />} />
              <Route path="/support" element={<ProtectedRoute><Support /></ProtectedRoute>} />
              <Route path="/support/:id" element={<ProtectedRoute><SupportTicket /></ProtectedRoute>} />
              <Route path="/help" element={<HelpCenter />} />
              <Route path="/dashboard/referrer" element={<ProtectedRoute allowedRoles={['referrer']}><ReferrerDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/wholesaler" element={<ProtectedRoute allowedRoles={['wholesaler']}><WholesalerDashboard /></ProtectedRoute>} />
              <Route path="/dashboard/producer" element={<ProtectedRoute allowedRoles={['producer']}><ProducerDashboard /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminPanel /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
