import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ScrollToTop } from "@/components/ScrollToTop";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Features from "./pages/Features";
import Users from "./pages/Users";
import Analytics from "./pages/Analytics";
import System from "./pages/System";
import KnowledgeBase from "./pages/KnowledgeBase";
import SecurityTest from "./pages/SecurityTest";
import PolicyLibrary from "./pages/PolicyLibrary";
import Chat from "./pages/Chat";
import ConsultantDashboard from "./pages/ConsultantDashboard";
import AdminDashboard from "./pages/AdminDashboard";

import About from "./pages/About";
import Contact from "./pages/Contact";
import FAQ from "./pages/FAQ";
import ConsultantSignup from "./pages/ConsultantSignup";
import NDA from "./pages/NDA";
import CodeOfConduct from "./pages/CodeOfConduct";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfService from "./pages/TermsOfService";
import EscalationQueue from "./pages/EscalationQueue";
import NotFound from "./pages/NotFound";

// Compliance framework pages
import NIST800171 from "./pages/NIST800171";
import CMMC20 from "./pages/CMMC20";
import FedRAMP from "./pages/FedRAMP";
import ISO27001 from "./pages/ISO27001";
import HIPAA from "./pages/HIPAA";
import SOC2 from "./pages/SOC2";
import { CVESecurityPage } from "./pages/CVESecurity";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    },
  },
});

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <ScrollToTop />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/login" element={<Auth />} />
              
              {/* Protected Dashboard Routes */}
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/consultant-dashboard" element={<ProtectedRoute allowRoles={['consultant', 'admin']}><ConsultantDashboard /></ProtectedRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
              <Route path="/dashboard/documents" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/policies" element={<ProtectedRoute><PolicyLibrary /></ProtectedRoute>} />
              <Route path="/dashboard/history" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/usage" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/billing" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/billing-summary" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/tools" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/notifications" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/profile" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/settings" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/consultant" element={<ProtectedRoute allowRoles={['consultant', 'admin']}><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/escalation-queue" element={<ProtectedRoute allowRoles={['consultant', 'admin']}><EscalationQueue /></ProtectedRoute>} />
              <Route path="/dashboard/help" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/dashboard/client/:clientId" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              
              {/* Public Routes */}
              <Route path="/features" element={<Features />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/consultant-signup" element={<ConsultantSignup />} />
              <Route path="/nda" element={<NDA />} />
              <Route path="/code-of-conduct" element={<CodeOfConduct />} />
              <Route path="/privacy-policy" element={<PrivacyPolicy />} />
              <Route path="/terms-of-service" element={<TermsOfService />} />
               
              {/* Admin-only Protected Routes */}
              <Route path="/admin" element={<ProtectedRoute requireAdmin><AdminDashboard /></ProtectedRoute>} />
              <Route path="/users" element={<ProtectedRoute requireAdmin><Users /></ProtectedRoute>} />
              <Route path="/analytics" element={<ProtectedRoute requireAdmin><Analytics /></ProtectedRoute>} />
              <Route path="/system" element={<ProtectedRoute requireAdmin><System /></ProtectedRoute>} />
               <Route path="/knowledge-base" element={<ProtectedRoute requireAdmin><KnowledgeBase /></ProtectedRoute>} />
               <Route path="/security-test" element={<ProtectedRoute requireAdmin><SecurityTest /></ProtectedRoute>} />
               <Route path="/cve-security" element={<ProtectedRoute><CVESecurityPage /></ProtectedRoute>} />
               {/* Compliance framework pages */}
               <Route path="/compliance/nist-800-171" element={<NIST800171 />} />
               <Route path="/compliance/cmmc-2-0" element={<CMMC20 />} />
               <Route path="/compliance/fedramp" element={<FedRAMP />} />
               <Route path="/compliance/iso-27001" element={<ISO27001 />} />
               <Route path="/compliance/hipaa" element={<HIPAA />} />
               <Route path="/compliance/soc-2" element={<SOC2 />} />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
