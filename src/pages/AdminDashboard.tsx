import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { UnifiedHeader } from "@/components/ui/unified-header";
import { AdminDashboard as AdminDashboardComponent } from "@/components/admin/AdminDashboard";

const AdminDashboard = () => {
  const { user, userRole, loading } = useAuth();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Check if user is admin
  if (userRole !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-background flex w-full">
        <AppSidebar />

        <div className="flex-1 flex flex-col">
          <UnifiedHeader context="dashboard" />

          <main className="flex-1 overflow-hidden">
            <div className="container mx-auto p-6 space-y-6 h-full overflow-y-auto">
              <AdminDashboardComponent />
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;
