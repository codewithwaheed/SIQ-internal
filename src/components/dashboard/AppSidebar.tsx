import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { MessageCircle, FileText, UserCheck, HelpCircle, Settings, CreditCard, Users, BarChart3, Shield, History, AlertTriangle, TrendingUp, Library, Home, Bell, User, Plus, Loader, Menu, LogOut } from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarFooter, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarGroup, SidebarGroupLabel, SidebarGroupContent, SidebarTrigger, useSidebar } from "@/components/ui/sidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";

// Simplified navigation structure
const getNavigationItems = (userRole: string | null) => {
  const businessOwnerItems = [{
    title: "Chat",
    url: "/dashboard",
    icon: MessageCircle,
    exact: true
  }, {
    title: "Documents",
    url: "/dashboard/documents",
    icon: FileText
  }, {
    title: "Policy Library",
    url: "/dashboard/policies",
    icon: Library
  }, {
    title: "History",
    url: "/dashboard/history",
    icon: History
  }, {
    title: "Usage",
    url: "/dashboard/usage",
    icon: TrendingUp
  }, {
    title: "Billing",
    url: "/dashboard/billing",
    icon: CreditCard
  }];
  const consultantItems = [{
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
    exact: true
  }, {
    title: "Queue",
    url: "/dashboard/escalation-queue",
    icon: AlertTriangle
  }, {
    title: "Notifications",
    url: "/dashboard/notifications",
    icon: Bell
  }, {
    title: "Tools",
    url: "/dashboard/tools",
    icon: Library
  }, {
    title: "Profile",
    url: "/dashboard/profile",
    icon: User
  }];
  const adminItems = [{
    title: "Chat",
    url: "/dashboard",
    icon: MessageCircle,
    exact: true
  }, {
    title: "Users",
    url: "/users",
    icon: Users
  }, {
    title: "Analytics",
    url: "/analytics",
    icon: BarChart3
  }, {
    title: "System",
    url: "/system",
    icon: Shield
  }, {
    title: "Knowledge Base",
    url: "/knowledge-base",
    icon: Library
  }];
  const supportItems = [{
    title: "Contact Expert",
    url: "/dashboard/contact-expert",
    icon: UserCheck
  }, {
    title: "Help",
    url: "/dashboard/help",
    icon: HelpCircle
  }];
  switch (userRole) {
    case 'consultant':
      return {
        main: consultantItems,
        support: []
      };
    case 'admin':
      return {
        main: adminItems,
        support: []
      };
    case 'business_owner':
    default:
      return {
        main: businessOwnerItems,
        support: supportItems
      };
  }
};
export function AppSidebar() {
  const {
    userRole,
    signOut,
    user
  } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const {
    state
  } = useSidebar();
  const collapsed = state === 'collapsed';
  const currentPath = location.pathname;
  const navigationItems = getNavigationItems(userRole);
  const mainItems = navigationItems.main;
  const supportItems = navigationItems.support;
  const isActive = (path: string, exact = false) => {
    if (exact) return currentPath === path;
    return currentPath.startsWith(path);
  };
  const startNewConversation = () => {
    navigate('/dashboard?new=true', {
      replace: true
    });
  };
  const getUserInitials = () => {
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return 'U';
  };
  return <Sidebar className={`border-r border-border/20 transition-all duration-300 ${collapsed ? 'w-16' : 'w-80'}`} collapsible="icon">
      <SidebarHeader className="p-6 border-b border-border/10">
        <div className="flex items-center justify-between">
          <SidebarTrigger />
          {!collapsed && <div className="flex justify-center flex-1 ml-4">
            <img src="/lovable-uploads/6362c9bd-c403-4a72-abae-4de6f5238518.png" alt="SentriQ Labs" className="h-8 object-contain" />
          </div>}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-4 py-6">
        <SidebarGroup>
          {!collapsed && <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-3 mb-3 uppercase tracking-wider">Navigation</SidebarGroupLabel>}
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems.map(item => <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="w-full">
                     <NavLink to={item.url} className={({
                  isActive: linkIsActive
                }) => `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-xl transition-all duration-200 group ${linkIsActive || isActive(item.url, 'exact' in item ? item.exact : false) ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:shadow-sm'}`}>
                       <item.icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${collapsed ? '' : 'group-hover:scale-110'}`} />
                       {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                     </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {supportItems.length > 0 && <SidebarGroup className="mt-8">
            {!collapsed && <SidebarGroupLabel className="text-xs font-medium text-muted-foreground px-3 mb-3 uppercase tracking-wider">Support</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {supportItems.map(item => <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild className="w-full">
                       <NavLink to={item.url} className={({
                  isActive: linkIsActive
                }) => `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-xl transition-all duration-200 group ${linkIsActive || isActive(item.url) ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:shadow-sm'}`}>
                         <item.icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${collapsed ? '' : 'group-hover:scale-110'}`} />
                         {!collapsed && <span className="text-sm font-medium">{item.title}</span>}
                       </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/10 p-6">
        <div className="space-y-2">
          <SidebarMenuButton asChild className="w-full">
            <NavLink to="/dashboard/settings" className={({
            isActive: linkIsActive
          }) => `flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-xl transition-all duration-200 group ${linkIsActive ? 'bg-primary/10 text-primary shadow-sm' : 'text-muted-foreground hover:bg-accent hover:text-foreground hover:shadow-sm'}`}>
              <Settings className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${collapsed ? '' : 'group-hover:scale-110'}`} />
              {!collapsed && <span className="text-sm font-medium">Settings</span>}
            </NavLink>
          </SidebarMenuButton>

          <button onClick={signOut} className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'} px-3 py-3 rounded-xl w-full text-left text-muted-foreground hover:bg-accent hover:text-foreground transition-all duration-200 group hover:shadow-sm`}>
            <LogOut className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${collapsed ? '' : 'group-hover:scale-110'}`} />
            {!collapsed && <span className="text-sm font-medium">Sign Out</span>}
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>;
}