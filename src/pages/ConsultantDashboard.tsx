import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { ConsultantDashboardMain } from "@/components/consultant/ConsultantDashboardMain";
import { UnifiedHeader } from "@/components/ui/unified-header";

const ConsultantDashboard = () => {
  const { userRole, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        Loading...
      </div>
    );
  }

  // Redirect non-consultants to regular dashboard
  if (userRole !== "consultant" && userRole !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-background">
      <UnifiedHeader context="dashboard" />
      <main className="pt-16">
        <ConsultantDashboardMain />
      </main>
    </div>
  );
};

export default ConsultantDashboard;
