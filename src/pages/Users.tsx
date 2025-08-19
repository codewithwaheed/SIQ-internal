import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { UnifiedHeader } from '@/components/ui/unified-header';
import { InviteUserModal } from '@/components/admin/InviteUserModal';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Search,
  UserPlus,
  Settings,
  Shield,
  Users as UsersIcon,
  Mail,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';

interface User {
  id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  status: string;
  last_active_at?: string;
  user_roles: Array<{ role: string }>;
}

interface UsersResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

const Users = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [usersData, setUsersData] = useState<UsersResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('No authentication token');
      }

      const params = new URLSearchParams({
        search: searchQuery,
        page: currentPage.toString(),
        limit: '10',
      });

      const response = await fetch(
        `https://xfdqnmtzuuphxivsgmua.supabase.co/functions/v1/admin-users?${params}`,
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            apikey:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZHFubXR6dXVwaHhpdnNnbXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjE2MDksImV4cCI6MjA2OTQ5NzYwOX0.op82w015Am91OghHdNauFrQbajQzeu4E0VKY_mqt5M0',
          },
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setUsersData(data);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      setError(error.message || 'Failed to fetch users');
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No authentication token');

      const response = await fetch(
        `https://xfdqnmtzuuphxivsgmua.supabase.co/functions/v1/admin-users/${userId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            apikey:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZHFubXR6dXVwaHhpdnNnbXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjE2MDksImV4cCI6MjA2OTQ5NzYwOX0.op82w015Am91OghHdNauFrQbajQzeu4E0VKY_mqt5M0',
          },
          body: JSON.stringify({ role: newRole }),
        },
      );

      if (!response.ok) throw new Error('Failed to update role');

      toast({
        title: 'Success',
        description: 'User role updated successfully',
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update role',
        variant: 'destructive',
      });
    }
  };

  const handleStatusChange = async (userId: string, newStatus: string) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error('No authentication token');

      const response = await fetch(
        `https://xfdqnmtzuuphxivsgmua.supabase.co/functions/v1/admin-users/${userId}`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            apikey:
              'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhmZHFubXR6dXVwaHhpdnNnbXVhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5MjE2MDksImV4cCI6MjA2OTQ5NzYwOX0.op82w015Am91OghHdNauFrQbajQzeu4E0VKY_mqt5M0',
          },
          body: JSON.stringify({ status: newStatus }),
        },
      );

      if (!response.ok) throw new Error('Failed to update status');

      toast({
        title: 'Success',
        description: 'User status updated successfully',
      });

      fetchUsers();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update status',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery, currentPage]);

  const users = usersData?.users || [];
  const pagination = usersData?.pagination;

  const getRoleBadge = (role: string) => {
    const roleConfig = {
      admin: { color: 'destructive' as const, icon: Shield },
      business_owner: { color: 'default' as const, icon: UsersIcon },
      consultant: { color: 'secondary' as const, icon: Settings },
    };

    const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.business_owner;
    const Icon = config.icon;

    return (
      <Badge variant={config.color} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {role.replace('_', ' ')}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      active: 'default' as const,
      invited: 'secondary' as const,
      inactive: 'outline' as const,
    };

    return (
      <Badge variant={statusConfig[status as keyof typeof statusConfig] || 'outline'}>
        {status}
      </Badge>
    );
  };

  const ErrorCard = ({ error, onRetry }: { error: string; onRetry: () => void }) => (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span>{error}</span>
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Retry
        </Button>
      </AlertDescription>
    </Alert>
  );

  const EmptyState = () => (
    <div className="py-8 text-center">
      <UsersIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
      <h3 className="mb-2 text-lg font-medium">No users found</h3>
      <p className="mb-4 text-muted-foreground">
        {searchQuery
          ? 'Try adjusting your search terms.'
          : 'Get started by inviting your first user.'}
      </p>
      <Button onClick={() => setShowInviteModal(true)}>
        <UserPlus className="mr-2 h-4 w-4" />
        Invite User
      </Button>
    </div>
  );

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-background">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <UnifiedHeader context="dashboard" />

          <main className="flex-1 overflow-hidden">
            <div className="h-full p-6">
              <div className="mx-auto max-w-6xl space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="flex items-center gap-2 text-3xl font-bold">
                      <UsersIcon className="h-8 w-8" />
                      User Management
                    </h1>
                    <p className="text-muted-foreground">
                      Manage workspace members, roles, and permissions
                    </p>
                  </div>
                  <Button
                    className="flex items-center gap-2"
                    onClick={() => setShowInviteModal(true)}
                  >
                    <UserPlus className="h-4 w-4" />
                    Invite User
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle>Workspace Members</CardTitle>
                    <CardDescription>
                      View and manage all users in your organization
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users..."
                        className="max-w-sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>

                    {loading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <Card key={i} className="animate-pulse">
                            <CardContent className="p-4">
                              <div className="flex items-center gap-3">
                                <div className="h-10 w-10 rounded-full bg-muted"></div>
                                <div className="flex-1 space-y-2">
                                  <div className="h-4 w-1/4 rounded bg-muted"></div>
                                  <div className="h-3 w-1/3 rounded bg-muted"></div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    ) : error ? (
                      <ErrorCard error={error} onRetry={fetchUsers} />
                    ) : users.length === 0 ? (
                      <EmptyState />
                    ) : (
                      <div className="space-y-4">
                        {users.map((user) => (
                          <Card key={user.id}>
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <Avatar>
                                    <AvatarImage
                                      src={`https://api.dicebear.com/6/initials/svg?seed=${user.first_name} ${user.last_name}`}
                                    />
                                    <AvatarFallback>
                                      {((user.first_name || '') + ' ' + (user.last_name || ''))
                                        .split(' ')
                                        .map((n) => n[0])
                                        .join('')
                                        .toUpperCase() || user.email[0].toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>

                                  <div>
                                    <h3 className="font-semibold">
                                      {user.first_name && user.last_name
                                        ? `${user.first_name} ${user.last_name}`
                                        : user.email}
                                    </h3>
                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                      <Mail className="h-3 w-3" />
                                      {user.email}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-3">
                                  <Select
                                    value={user.user_roles?.[0]?.role || 'business_owner'}
                                    onValueChange={(value) => handleRoleChange(user.user_id, value)}
                                  >
                                    <SelectTrigger className="w-40">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="business_owner">Business Owner</SelectItem>
                                      <SelectItem value="consultant">Consultant</SelectItem>
                                      <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <Select
                                    value={user.status || 'active'}
                                    onValueChange={(value) =>
                                      handleStatusChange(user.user_id, value)
                                    }
                                  >
                                    <SelectTrigger className="w-32">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <div className="text-right text-sm">
                                    <div className="text-muted-foreground">Last active</div>
                                    <div>
                                      {user.last_active_at
                                        ? new Date(user.last_active_at).toLocaleDateString()
                                        : 'Never'}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Total Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">{pagination?.total || 0}</div>
                      <p className="text-sm text-muted-foreground">Active workspace members</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Pending Invites</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {users.filter((u) => u.status === 'invited').length}
                      </div>
                      <p className="text-sm text-muted-foreground">Awaiting acceptance</p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Admin Users</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold">
                        {users.filter((u) => u.user_roles?.[0]?.role === 'admin').length}
                      </div>
                      <p className="text-sm text-muted-foreground">System administrators</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <InviteUserModal
        open={showInviteModal}
        onOpenChange={setShowInviteModal}
        onSuccess={() => fetchUsers()}
      />
    </SidebarProvider>
  );
};

export default Users;
