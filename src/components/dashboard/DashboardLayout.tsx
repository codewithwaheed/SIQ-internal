import { ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Shield, LogOut, Settings, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
}
export const DashboardLayout = ({
  children,
  title,
  subtitle,
}: DashboardLayoutProps) => {
  const { user, profile, userRole, signOut } = useAuth();
  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-destructive text-destructive-foreground";
      case "consultant":
        return "bg-accent text-accent-foreground";
      case "business_owner":
        return "bg-primary text-primary-foreground";
      default:
        return "bg-muted text-muted-foreground";
    }
  };
  const getRoleLabel = (role: string) => {
    switch (role) {
      case "business_owner":
        return "Business Owner";
      case "consultant":
        return "Consultant";
      case "admin":
        return "Admin";
      default:
        return "User";
    }
  };
  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || "U";
  };
  return (
    <div className="page min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card shadow-sm"></header>

      {/* Main Content with proper scroll container */}
      <main className="app-content flex-1">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">{title}</h1>
            {subtitle && (
              <p className="text-muted-foreground mt-2">{subtitle}</p>
            )}
          </div>
          {children}
        </div>
      </main>
    </div>
  );
};
