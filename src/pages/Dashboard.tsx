import { Outlet } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { OnboardingModal } from '@/components/onboarding/OnboardingModal';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';

const Dashboard = () => {
  const { needsOnboarding, completeOnboarding } = useAuth();

  return (
    <>
      <OnboardingModal open={needsOnboarding} onComplete={completeOnboarding} />
      <SidebarProvider>
        <div className="flex min-h-screen w-full bg-gradient-background">
          <AppSidebar />
          {/* All dashboard children render here via nested routes */}
          <main className="flex-1 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </SidebarProvider>
    </>
  );
};

export default Dashboard;
