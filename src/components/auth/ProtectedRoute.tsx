import { ReactNode, useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: ReactNode;
  requireAdmin?: boolean;
  requireConsultant?: boolean;
  requireSubscription?: boolean;
  minimumTier?: 'Basic' | 'Pro' | 'Premium';
  allowRoles?: Array<'business_owner' | 'consultant' | 'admin'>;
}

export const ProtectedRoute = ({
  children,
  requireAdmin = false,
  requireConsultant = false,
  requireSubscription = false,
  minimumTier = 'Basic',
  allowRoles,
}: ProtectedRouteProps) => {
  const { user, userRole, loading, subscriptionInfo } = useAuth();
  const location = useLocation();

  // Redirect consultants to consultant dashboard on login
  useEffect(() => {
    if (!loading && user && userRole === 'consultant' && location.pathname === '/dashboard') {
      // Auto-redirect consultants to their dedicated dashboard
      window.location.href = '/consultant-dashboard';
    }
  }, [user, userRole, loading, location.pathname]);

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Check role-based access
  if (requireAdmin && userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireConsultant && userRole !== 'consultant' && userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Check specific role allowlist
  if (allowRoles && userRole && !allowRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  // Check subscription requirements
  if (requireSubscription && !subscriptionInfo?.subscribed) {
    return <Navigate to="/pricing" replace />;
  }

  // Check tier requirements
  if (minimumTier !== 'Basic') {
    const tierHierarchy = { Basic: 0, Pro: 1, Premium: 2 };
    const currentTier = subscriptionInfo?.subscription_tier || 'Basic';

    if (tierHierarchy[currentTier] < tierHierarchy[minimumTier]) {
      return <Navigate to="/pricing" replace />;
    }
  }

  // Check subscription expiry
  if (subscriptionInfo?.subscription_end) {
    const expiryDate = new Date(subscriptionInfo.subscription_end);
    if (expiryDate < new Date()) {
      // Subscription expired
      return <Navigate to="/billing" replace />;
    }
  }

  // Render protected content
  return <>{children}</>;
};
