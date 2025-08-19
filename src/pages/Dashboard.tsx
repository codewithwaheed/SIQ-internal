import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { UnifiedHeader } from '@/components/ui/unified-header';
import { BusinessOwnerDashboard } from '@/components/dashboard/BusinessOwnerDashboard';
import { ConsultantDashboard } from '@/components/dashboard/ConsultantDashboard';
import { ClientDetailsPage } from '@/components/dashboard/ClientDetailsPage';
import { BillingSummary } from '@/components/dashboard/BillingSummary';
import { ToolsTemplates } from '@/components/dashboard/ToolsTemplates';
import { NotificationsInbox } from '@/components/dashboard/NotificationsInbox';
import { ProfileAvailability } from '@/components/dashboard/ProfileAvailability';
import { AdminDashboard } from '@/components/dashboard/AdminDashboard';
import { UsageSummary } from '@/components/dashboard/UsageSummary';
import { BillingSubscription } from '@/components/dashboard/BillingSubscription';
import { EscalationPage } from '@/components/dashboard/EscalationPage';
import { SettingsPage } from '@/components/dashboard/SettingsPage';
import { HelpFeedbackPage } from '@/components/dashboard/HelpFeedbackPage';
import { DocumentsPage } from '@/components/dashboard/DocumentsPage';
import { ChatHistoryPage } from '@/components/dashboard/ChatHistoryPage';
import { ContactExpertPage } from '@/components/dashboard/ContactExpertPage';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { AiChatInterface } from '@/components/chat/AiChatInterface';

const Dashboard = () => {
  const { userRole, needsOnboarding, completeOnboarding } = useAuth();
  const location = useLocation();

  const renderDashboard = () => {
    const path = location.pathname;

    // Always show AiChatInterface for the main dashboard route (/dashboard)
    if (path === '/dashboard') {
      return <AiChatInterface />;
    }

    // Handle specific routes
    if (path === '/dashboard/usage') {
      return <UsageSummary />;
    }
    if (path === '/dashboard/billing') {
      return <BillingSubscription />;
    }
    if (path === '/dashboard/escalate') {
      return <EscalationPage />;
    }
    if (path === '/dashboard/settings') {
      return <SettingsPage />;
    }
    if (path === '/dashboard/help') {
      return <HelpFeedbackPage />;
    }
    if (path === '/dashboard/contact-expert') {
      return <ContactExpertPage />;
    }
    if (path === '/dashboard/documents') {
      return <DocumentsPage />;
    }
    if (path === '/dashboard/history') {
      return <ChatHistoryPage />;
    }
    if (path.startsWith('/dashboard/client/')) {
      return <ClientDetailsPage />;
    }
    if (path === '/dashboard/billing-summary') {
      return <BillingSummary />;
    }
    if (path === '/dashboard/tools') {
      return <ToolsTemplates />;
    }
    if (path === '/dashboard/notifications') {
      return <NotificationsInbox />;
    }
    if (path === '/dashboard/profile') {
      return <ProfileAvailability />;
    }

    // Handle role-based dashboards for other undefined routes
    switch (userRole) {
      case 'business_owner':
        return <BusinessOwnerDashboard />;
      case 'consultant':
        return <ConsultantDashboard />;
      case 'admin':
        return <AdminDashboard />;
      default:
        return <BusinessOwnerDashboard />;
    }
  };

  return (
    <>
      <OnboardingModal open={needsOnboarding} onComplete={completeOnboarding} />

      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-gradient-background">
          <AppSidebar />

          <main className="flex-1 overflow-hidden">{renderDashboard()}</main>
        </div>
      </SidebarProvider>
    </>
  );
};

export default Dashboard;
