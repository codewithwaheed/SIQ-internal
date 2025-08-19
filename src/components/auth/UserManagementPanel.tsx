import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  Users,
  Shield,
  Crown,
  Building,
  AlertTriangle,
} from "lucide-react";
import { AuditLogger } from "@/lib/audit-logger";

type UserRole = "business_owner" | "consultant" | "admin";

interface UserProfile {
  id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  created_at: string;
}

interface UserWithRole extends UserProfile {
  role: UserRole;
  role_assigned_at: string;
}

export const UserManagementPanel = () => {
  const { userRole, user } = useAuth();
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<UserRole>("business_owner");
  const [isChangingRole, setIsChangingRole] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);

  // Only admins can access this panel
  if (userRole !== "admin") {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          Access denied. Administrator privileges required.
        </AlertDescription>
      </Alert>
    );
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all profiles with their roles
      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
          *,
          user_roles!inner(
            role,
            created_at
          )
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;

      const usersWithRoles = data.map((profile: any) => ({
        ...profile,
        role: profile.user_roles.role,
        role_assigned_at: profile.user_roles.created_at,
      }));

      setUsers(usersWithRoles);
    } catch (err: any) {
      console.error("Error fetching users:", err);
      setError(err.message || "Failed to fetch users");
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async () => {
    if (!selectedUser || !user) return;

    try {
      setIsChangingRole(true);

      // Update the user's role
      const { error } = await supabase
        .from("user_roles")
        .update({
          role: newRole,
          assigned_by: user.id,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", selectedUser.user_id);

      if (error) throw error;

      // Log the role change
      await AuditLogger.logAdminAction(
        user.id,
        "ROLE_CHANGE",
        `Changed user ${selectedUser.email} role from ${selectedUser.role} to ${newRole}`,
        selectedUser.user_id,
        {
          old_role: selectedUser.role,
          new_role: newRole,
          target_email: selectedUser.email,
        },
      );

      // Refresh the users list
      await fetchUsers();
      setShowRoleDialog(false);
      setSelectedUser(null);
    } catch (err: any) {
      console.error("Error changing role:", err);
      setError(err.message || "Failed to change user role");
    } finally {
      setIsChangingRole(false);
    }
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4" />;
      case "consultant":
        return <Shield className="h-4 w-4" />;
      case "business_owner":
        return <Building className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case "admin":
        return "destructive";
      case "consultant":
        return "default";
      case "business_owner":
        return "secondary";
      default:
        return "outline";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading users...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
          <CardDescription>
            Manage user accounts and roles for the platform
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-muted-foreground">
                Total users: {users.length}
              </div>
              <Button onClick={fetchUsers} variant="outline" size="sm">
                Refresh
              </Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((userProfile) => (
                  <TableRow key={userProfile.id}>
                    <TableCell>
                      <div className="font-medium">
                        {userProfile.first_name} {userProfile.last_name}
                      </div>
                    </TableCell>
                    <TableCell>{userProfile.email}</TableCell>
                    <TableCell>{userProfile.company_name || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={getRoleColor(userProfile.role)}
                        className="flex items-center gap-1 w-fit"
                      >
                        {getRoleIcon(userProfile.role)}
                        {userProfile.role.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(userProfile.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {userProfile.user_id !== user?.id && (
                        <Dialog
                          open={
                            showRoleDialog &&
                            selectedUser?.id === userProfile.id
                          }
                          onOpenChange={setShowRoleDialog}
                        >
                          <DialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(userProfile);
                                setNewRole(userProfile.role);
                                setShowRoleDialog(true);
                              }}
                            >
                              Change Role
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Change User Role</DialogTitle>
                              <DialogDescription>
                                Update the role for {userProfile.first_name}{" "}
                                {userProfile.last_name} ({userProfile.email})
                              </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  Current Role
                                </label>
                                <Badge
                                  variant={getRoleColor(userProfile.role)}
                                  className="flex items-center gap-1 w-fit"
                                >
                                  {getRoleIcon(userProfile.role)}
                                  {userProfile.role.replace("_", " ")}
                                </Badge>
                              </div>

                              <div className="space-y-2">
                                <label className="text-sm font-medium">
                                  New Role
                                </label>
                                <Select
                                  value={newRole}
                                  onValueChange={(value: UserRole) =>
                                    setNewRole(value)
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="business_owner">
                                      <div className="flex items-center gap-2">
                                        <Building className="h-4 w-4" />
                                        Business Owner
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="consultant">
                                      <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4" />
                                        Consultant
                                      </div>
                                    </SelectItem>
                                    <SelectItem value="admin">
                                      <div className="flex items-center gap-2">
                                        <Crown className="h-4 w-4" />
                                        Administrator
                                      </div>
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>

                              {newRole === "admin" && (
                                <Alert>
                                  <AlertTriangle className="h-4 w-4" />
                                  <AlertDescription>
                                    Warning: Admin role grants full system
                                    access including user management.
                                  </AlertDescription>
                                </Alert>
                              )}
                            </div>

                            <DialogFooter>
                              <Button
                                variant="outline"
                                onClick={() => setShowRoleDialog(false)}
                                disabled={isChangingRole}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={handleRoleChange}
                                disabled={
                                  isChangingRole || newRole === userProfile.role
                                }
                              >
                                {isChangingRole && (
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                )}
                                Update Role
                              </Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      )}
                      {userProfile.user_id === user?.id && (
                        <span className="text-sm text-muted-foreground">
                          Current user
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
