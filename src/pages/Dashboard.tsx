// Dashboard.tsx
import { Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { UnifiedHeader } from '@/components/ui/unified-header';

const Dashboard = () => {
  const { needsOnboarding, completeOnboarding } = useAuth();
  const location = useLocation();

  // Show chat without the global header (it has its own)
  const isChatRoute =
    location.pathname === '/dashboard' || location.pathname.startsWith('/dashboard/chat');

  return (
    <>
      {/* <OnboardingModal open={needsOnboarding} onComplete={completeOnboarding} /> */}
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-gradient-background">
          <AppSidebar />

          <div className="flex min-h-screen flex-1 flex-col">
            {/* Global dashboard header on all non-chat pages */}
            {!isChatRoute && <UnifiedHeader context="dashboard" />}

            {/* Main scroll area:
               - chat routes manage their own scroll, so keep it hidden there
               - other pages scroll normally */}
            <main className={`flex-1 ${isChatRoute ? 'overflow-hidden' : 'overflow-auto'}`}>
              <Outlet />
            </main>
          </div>
        </div>
      </SidebarProvider>
    </>
  );
};

export default Dashboard;
