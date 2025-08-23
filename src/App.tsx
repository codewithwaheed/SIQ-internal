import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/contexts/AuthContext';
import { ScrollToTop } from '@/components/ScrollToTop';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

import Index from './pages/Index';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import Features from './pages/Features';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import System from './pages/System';
import KnowledgeBase from './pages/KnowledgeBase';
import SecurityTest from './pages/SecurityTest';
import PolicyLibrary from './pages/PolicyLibrary';
import Chat from './pages/Chat';
import ConsultantDashboard from './pages/ConsultantDashboard';
import AdminDashboard from './pages/AdminDashboard';

import About from './pages/About';
import Contact from './pages/Contact';
import FAQ from './pages/FAQ';
import ConsultantSignup from './pages/ConsultantSignup';
import NDA from './pages/NDA';
import CodeOfConduct from './pages/CodeOfConduct';
import PrivacyPolicy from './pages/PrivacyPolicy';
import TermsOfService from './pages/TermsOfService';
import EscalationQueue from './pages/EscalationQueue';
import NotFound from './pages/NotFound';

import NIST800171 from './pages/NIST800171';
import CMMC20 from './pages/CMMC20';
import FedRAMP from './pages/FedRAMP';
import ISO27001 from './pages/ISO27001';
import HIPAA from './pages/HIPAA';
import SOC2 from './pages/SOC2';
import { CVESecurityPage } from './pages/CVESecurity';
import ResetPasswordPage from './pages/ResetPassword';

// Dashboard children
import { AiChatInterface } from '@/components/chat/ai/AiChatInterface';
import { UsageSummary } from '@/components/dashboard/UsageSummary';
import { BillingSubscription } from '@/components/dashboard/BillingSubscription';
import { BillingSummary } from '@/components/dashboard/BillingSummary';
import { ToolsTemplates } from '@/components/dashboard/ToolsTemplates';
import { NotificationsInbox } from '@/components/dashboard/NotificationsInbox';
import { ProfileAvailability } from '@/components/dashboard/ProfileAvailability';
import { SettingsPage } from '@/components/dashboard/SettingsPage';
import { HelpFeedbackPage } from '@/components/dashboard/HelpFeedbackPage';
import { ContactExpertPage } from '@/components/dashboard/ContactExpertPage';
import { EscalationPage } from '@/components/dashboard/EscalationPage';
import { DocumentsPage } from '@/components/dashboard/DocumentsPage';
import { ChatHistoryPage } from '@/components/dashboard/ChatHistoryPage';
import { ClientDetailsPage } from '@/components/dashboard/ClientDetailsPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 10,
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
                {/* Public */}
                <Route path="/" element={<Index />} />
                <Route path="/auth" element={<Auth />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />

                <Route path="/features" element={<Features />} />
                <Route path="/about" element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/consultant-signup" element={<ConsultantSignup />} />
                <Route path="/nda" element={<NDA />} />
                <Route path="/code-of-conduct" element={<CodeOfConduct />} />
                <Route path="/privacy-policy" element={<PrivacyPolicy />} />
                <Route path="/terms-of-service" element={<TermsOfService />} />

                {/* Compliance */}
                <Route path="/compliance/nist-800-171" element={<NIST800171 />} />
                <Route path="/compliance/cmmc-2-0" element={<CMMC20 />} />
                <Route path="/compliance/fedramp" element={<FedRAMP />} />
                <Route path="/compliance/iso-27001" element={<ISO27001 />} />
                <Route path="/compliance/hipaa" element={<HIPAA />} />
                <Route path="/compliance/soc-2" element={<SOC2 />} />

                {/* Top-level protected (non-dashboard) */}
                <Route
                  path="/chat"
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  }
                />

                {/* Admin-only */}
                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute requireAdmin>
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Users />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/analytics"
                  element={
                    <ProtectedRoute requireAdmin>
                      <Analytics />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/system"
                  element={
                    <ProtectedRoute requireAdmin>
                      <System />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/knowledge-base"
                  element={
                    <ProtectedRoute requireAdmin>
                      <KnowledgeBase />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/security-test"
                  element={
                    <ProtectedRoute requireAdmin>
                      <SecurityTest />
                    </ProtectedRoute>
                  }
                />

                {/* Consultant-only top-level */}
                <Route
                  path="/consultant-dashboard"
                  element={
                    <ProtectedRoute allowRoles={['consultant', 'admin']}>
                      <ConsultantDashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/escalation-queue"
                  element={
                    <ProtectedRoute allowRoles={['consultant', 'admin']}>
                      <EscalationQueue />
                    </ProtectedRoute>
                  }
                />

                {/* Dashboard + nested children */}
                <Route
                  path="/dashboard/*"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                >
                  {/* index -> /dashboard */}
                  <Route index element={<AiChatInterface />} />
                  {/* explicit chat + deep link with conversation id */}
                  <Route path="chat" element={<AiChatInterface />} />
                  <Route path="chat/c/:conversationId" element={<AiChatInterface />} />

                  <Route path="history" element={<ChatHistoryPage />} />
                  <Route path="documents" element={<DocumentsPage />} />
                  <Route path="usage" element={<UsageSummary />} />
                  <Route path="billing" element={<BillingSubscription />} />
                  <Route path="billing-summary" element={<BillingSummary />} />
                  <Route path="tools" element={<ToolsTemplates />} />
                  <Route path="notifications" element={<NotificationsInbox />} />
                  <Route path="profile" element={<ProfileAvailability />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="help" element={<HelpFeedbackPage />} />
                  <Route path="contact-expert" element={<ContactExpertPage />} />
                  <Route path="escalate" element={<EscalationPage />} />
                  <Route path="client/:clientId" element={<ClientDetailsPage />} />

                  {/* fallback within /dashboard */}
                  <Route path="*" element={<AiChatInterface />} />
                </Route>

                {/* Catch-all */}
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
