import React, { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Menu, X, LogOut, Settings, User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger, useSidebar } from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

interface UnifiedHeaderProps {
  context: 'public' | 'dashboard';
  showAuth?: boolean;
  transparent?: boolean;
}

export const UnifiedHeader = ({
  context,
  showAuth = true,
  transparent = false,
}: UnifiedHeaderProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { user, profile, userRole, signOut } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';

  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing-section');
    if (pricingSection) pricingSection.scrollIntoView({ behavior: 'smooth' });
    else window.location.href = '/#pricing-section';
  };

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

  const getUserInitials = () =>
    profile?.first_name && profile?.last_name
      ? `${profile.first_name[0]}${profile.last_name[0]}`.toUpperCase()
      : user?.email?.[0]?.toUpperCase() || 'U';

  const headerClasses = cn(
    transparent
      ? 'bg-transparent'
      : 'bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60',
    'border-b border-border sticky top-0 z-50 w-full',
    // Avoid overlap with the sidebar on desktop when in dashboard
    // Match Sidebar widths: 16rem expanded (pl-64), 3rem collapsed (pl-12)
    context === 'dashboard' && (collapsed ? 'md:pl-12' : 'md:pl-64'),
  );

  return (
    <nav className={headerClasses}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Mobile sidebar toggle (dashboard only) */}
            {context === 'dashboard' && (
              <div className="md:hidden">
                <SidebarTrigger />
              </div>
            )}

            {/* Logo — mobile only (hidden on desktop as requested) */}
            <Link
              to={context === 'dashboard' ? '/dashboard' : '/'}
              className="flex items-center md:hidden"
              onClick={() => context === 'public' && window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <img
                src="/lovable-uploads/6362c9bd-c403-4a72-abae-4de6f5238518.png"
                alt="SentrIQ Labs"
                className="h-8"
              />
            </Link>
          </div>

          {/* Public Navigation */}
          {context === 'public' && (
            <>
              {/* Desktop Menu */}
              <div className="hidden items-center space-x-8 md:flex">
                <Link to="/features" className="text-foreground transition-colors hover:text-primary">
                  Features
                </Link>
                <button
                  onClick={scrollToPricing}
                  className="text-foreground transition-colors hover:text-primary"
                >
                  Pricing
                </button>
                <Link to="/about" className="text-foreground transition-colors hover:text-primary">
                  About
                </Link>
                <Link to="/faq" className="text-foreground transition-colors hover:text-primary">
                  FAQ
                </Link>
                <Link to="/contact" className="text-foreground transition-colors hover:text-primary">
                  Contact
                </Link>
                {showAuth && !user && (
                  <div className="flex items-center space-x-3">
                    <Button variant="outline" asChild>
                      <Link to="/auth">Sign In</Link>
                    </Button>
                    <Button asChild>
                      <Link to="/auth">Get Started</Link>
                    </Button>
                  </div>
                )}
                {user && (
                  <Button asChild>
                    <Link to="/dashboard">Dashboard</Link>
                  </Button>
                )}
              </div>

              {/* Mobile Menu Button */}
              <div className="md:hidden">
                <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                  {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </Button>
              </div>
            </>
          )}

          {/* Dashboard Navigation (avatar, role) */}
          {context === 'dashboard' && user && (
            <div className="flex items-center space-x-4">
              {userRole && <Badge className={getRoleColor(userRole)}>{getRoleLabel(userRole)}</Badge>}

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.user_metadata?.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {profile?.first_name && profile?.last_name
                          ? `${profile.first_name} ${profile.last_name}`
                          : 'User'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                      {profile?.company_name && (
                        <p className="text-xs leading-none text-muted-foreground">
                          {profile.company_name}
                        </p>
                      )}
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <NavLink to="/dashboard/profile" className="w-full">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <NavLink to="/dashboard/settings" className="w-full">
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </NavLink>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Mobile Menu for Public Pages */}
        {context === 'public' && isMenuOpen && (
          <div className="space-y-4 border-t border-border py-4 md:hidden">
            <Link
              to="/features"
              className="block text-foreground transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Features
            </Link>
            <button
              onClick={() => {
                scrollToPricing();
                setIsMenuOpen(false);
              }}
              className="block text-foreground transition-colors hover:text-primary"
            >
              Pricing
            </button>
            <Link
              to="/about"
              className="block text-foreground transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <Link
              to="/faq"
              className="block text-foreground transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              FAQ
            </Link>
            <Link
              to="/contact"
              className="block text-foreground transition-colors hover:text-primary"
              onClick={() => setIsMenuOpen(false)}
            >
              Contact
            </Link>
            {showAuth && !user && (
              <div className="space-y-2 pt-4">
                <Button variant="outline" className="w-full" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button className="w-full" asChild>
                  <Link to="/auth">Get Started</Link>
                </Button>
              </div>
            )}
            {user && (
              <div className="pt-4">
                <Button className="w-full" asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};
