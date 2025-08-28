import { ReactNode, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Shield, LogOut, Settings, User } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface DashboardLayoutProps {
  children: ReactNode;
  title: string;
  subtitle?: string;
  fullBleed?: boolean;
}

export const DashboardLayout = ({
  children,
  title,
  subtitle,
  fullBleed = false,
}: DashboardLayoutProps) => {
  const { user, profile, userRole, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  // Ensure non-chat pages can scroll normally
  useEffect(() => {
    document.body.classList.remove('no-doc-scroll');
  }, []);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin':
        return 'bg-destructive text-destructive-foreground';
      case 'consultant':
        return 'bg-accent text-accent-foreground';
      case 'business_owner':
        return 'bg-primary text-primary-foreground';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'business_owner':
        return 'Business Owner';
      case 'consultant':
        return 'Consultant';
      case 'admin':
        return 'Admin';
      default:
        return 'User';
    }
  };

  const getUserInitials = () => {
    if (profile?.first_name && profile?.last_name) {
      return `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase();
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  return (
    <div
      className={cn(
        'min-h-screen bg-background transition-[margin] duration-200',
        collapsed ? 'md:ml-16' : 'md:ml-80',
        fullBleed && 'full-bleed', // <-- toggles CSS override for .page
      )}
    >
      {/* Header (unchanged, stays max-w-[1040px]) */}
      <header className="px-4 pt-6 sm:px-6">
        <div className="mx-auto w-full max-w-[1040px]">
          <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">{title}</h1>
              {subtitle && <p className="mt-2 text-muted-foreground">{subtitle}</p>}
            </div>

            <div className="flex items-center gap-3">
              <Badge className={getRoleColor(userRole || '')}>
                <Shield className="mr-1 h-3 w-3" />
                {getRoleLabel(userRole || '')}
              </Badge>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline">
                      {profile?.first_name ? `${profile.first_name}` : user?.email}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 pb-10 sm:px-6">
        <div
          className={cn(
            'w-full',
            // When fullBleed, do NOT cap width; keep side padding from <main>
            fullBleed ? 'max-w-none' : 'mx-auto max-w-[1040px]',
          )}
        >
          {children}
        </div>
      </main>
    </div>
  );
};
