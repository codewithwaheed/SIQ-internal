import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import {
  Users,
  Search,
  Filter,
  UserPlus,
  MoreHorizontal,
  CheckCircle,
  XCircle,
  Activity,
  Clock,
  Star,
  TrendingUp,
  UserCheck,
  AlertTriangle,
  Calendar,
  Award,
} from 'lucide-react';

interface ConsultantProfile {
  id: string;
  user_id: string;
  bio: string;
  expertise_areas: string[];
  certifications: string[];
  years_experience: number;
  hourly_rate?: number;
  availability_status: 'online' | 'offline' | 'busy' | 'away';
  timezone: string;
  rating: number;
  total_escalations_handled: number;
  avg_response_time_hours: number;
  success_rate: number;
  client_feedback_score: number;
  last_active_at: string;
  is_verified: boolean;
  is_active: boolean;
  created_at: string;
  profiles: {
    email: string;
    first_name: string;
    last_name: string;
    company_name?: string;
    phone?: string;
    country?: string;
  };
}

interface ConsultantApplication {
  id: string;
  full_name: string;
  email: string;
  expertise_areas: string[];
  certifications: string[];
  experience_years: string;
  status: string;
  created_at: string;
  admin_notes?: string;
}

const AVAILABILITY_STATUS_CONFIG = {
  online: {
    label: 'Online',
    color: 'bg-green-500',
    textColor: 'text-green-600',
    icon: CheckCircle,
  },
  offline: {
    label: 'Offline',
    color: 'bg-gray-500',
    textColor: 'text-gray-600',
    icon: XCircle,
  },
  busy: {
    label: 'Busy',
    color: 'bg-red-500',
    textColor: 'text-red-600',
    icon: Activity,
  },
  away: {
    label: 'Away',
    color: 'bg-yellow-500',
    textColor: 'text-yellow-600',
    icon: Clock,
  },
};

export const ConsultantManagementDashboard = () => {
  const { userRole } = useAuth();
  const { toast } = useToast();

  const [consultants, setConsultants] = useState<ConsultantProfile[]>([]);
  const [applications, setApplications] = useState<ConsultantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedConsultant, setSelectedConsultant] = useState<ConsultantProfile | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (userRole === 'admin') {
      Promise.all([fetchConsultants(), fetchApplications()]).finally(() => setLoading(false));
    }
  }, [userRole]);

  const fetchConsultants = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-consultants', {
        body: null,
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) throw error;
      setConsultants(data.consultants || []);
    } catch (error: any) {
      console.error('Error fetching consultants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load consultants',
        variant: 'destructive',
      });
    }
  };

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-consultant-applications', {
        body: null,
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) throw error;
      setApplications(data.applications || []);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      // Don't show error toast for applications as it's secondary
    }
  };

  const createConsultantFromApplication = async (applicationId: string) => {
    try {
      const { error } = await supabase.functions.invoke('manage-consultants', {
        body: { application_id: applicationId },
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Consultant profile created successfully',
      });

      fetchConsultants();
      fetchApplications();
    } catch (error: any) {
      console.error('Error creating consultant:', error);
      toast({
        title: 'Error',
        description: 'Failed to create consultant profile',
        variant: 'destructive',
      });
    }
  };

  const updateConsultantStatus = async (consultantId: string, isActive: boolean) => {
    try {
      const { error } = await supabase.functions.invoke('manage-consultants', {
        body: { is_active: isActive },
        headers: { 'Content-Type': 'application/json' },
      });

      if (error) throw error;

      setConsultants((prev) =>
        prev.map((c) => (c.id === consultantId ? { ...c, is_active: isActive } : c)),
      );

      toast({
        title: 'Success',
        description: `Consultant ${isActive ? 'activated' : 'deactivated'} successfully`,
      });
    } catch (error: any) {
      console.error('Error updating consultant status:', error);
      toast({
        title: 'Error',
        description: 'Failed to update consultant status',
        variant: 'destructive',
      });
    }
  };

  const filteredConsultants = consultants.filter((consultant) => {
    const matchesSearch =
      consultant.profiles.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultant.profiles.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultant.profiles.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      consultant.expertise_areas.some((area) =>
        area.toLowerCase().includes(searchTerm.toLowerCase()),
      );

    const matchesStatus = statusFilter === 'all' || consultant.availability_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const config = AVAILABILITY_STATUS_CONFIG[status as keyof typeof AVAILABILITY_STATUS_CONFIG];
    if (!config) return null;

    const Icon = config.icon;
    return (
      <Badge variant="outline" className={`${config.textColor} border-current`}>
        <Icon className="mr-1 h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  if (userRole !== 'admin') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">
              Access denied. This page is only available to administrators.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-1/3 rounded bg-muted"></div>
          <div className="h-32 rounded bg-muted"></div>
          <div className="h-64 rounded bg-muted"></div>
        </div>
      </div>
    );
  }

  const totalConsultants = consultants.length;
  const activeConsultants = consultants.filter((c) => c.is_active).length;
  const onlineConsultants = consultants.filter((c) => c.availability_status === 'online').length;
  const pendingApplications = applications.filter((a) => a.status === 'pending').length;

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Consultant Management</h1>
          <p className="text-muted-foreground">
            Manage consultant profiles, applications, and availability
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{totalConsultants}</p>
                <p className="text-xs text-muted-foreground">Total Consultants</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <UserCheck className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{activeConsultants}</p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-2xl font-bold text-blue-600">{onlineConsultants}</p>
                <p className="text-xs text-muted-foreground">Online Now</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-2xl font-bold text-orange-600">{pendingApplications}</p>
                <p className="text-xs text-muted-foreground">Pending Applications</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="consultants" className="space-y-6">
        <TabsList>
          <TabsTrigger value="consultants">Active Consultants</TabsTrigger>
          <TabsTrigger value="applications">Applications ({pendingApplications})</TabsTrigger>
        </TabsList>

        <TabsContent value="consultants" className="space-y-6">
          {/* Filters */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 transform text-muted-foreground" />
                    <Input
                      placeholder="Search consultants..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="online">Online</SelectItem>
                    <SelectItem value="away">Away</SelectItem>
                    <SelectItem value="busy">Busy</SelectItem>
                    <SelectItem value="offline">Offline</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Consultants Table */}
          <Card>
            <CardHeader>
              <CardTitle>Consultants ({filteredConsultants.length})</CardTitle>
              <CardDescription>
                Manage consultant profiles and their availability status
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Consultant</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Expertise</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Cases</TableHead>
                    <TableHead>Last Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredConsultants.map((consultant) => (
                    <TableRow key={consultant.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {consultant.profiles.first_name} {consultant.profiles.last_name}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {consultant.profiles.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(consultant.availability_status)}
                          <div className="flex space-x-1">
                            {consultant.is_verified && (
                              <Badge variant="outline" className="border-green-600 text-green-600">
                                <Award className="mr-1 h-3 w-3" />
                                Verified
                              </Badge>
                            )}
                            {!consultant.is_active && <Badge variant="destructive">Inactive</Badge>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {consultant.expertise_areas.slice(0, 2).map((area) => (
                            <Badge key={area} variant="secondary" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                          {consultant.expertise_areas.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{consultant.expertise_areas.length - 2} more
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 text-yellow-500" />
                          <span>{consultant.rating.toFixed(1)}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <div className="font-medium">{consultant.total_escalations_handled}</div>
                          <div className="text-xs text-muted-foreground">
                            {consultant.avg_response_time_hours.toFixed(1)}h avg
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(consultant.last_active_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedConsultant(consultant);
                              setShowDetails(true);
                            }}
                          >
                            View
                          </Button>
                          <Button
                            variant={consultant.is_active ? 'destructive' : 'default'}
                            size="sm"
                            onClick={() =>
                              updateConsultantStatus(consultant.id, !consultant.is_active)
                            }
                          >
                            {consultant.is_active ? 'Deactivate' : 'Activate'}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Consultant Applications</CardTitle>
              <CardDescription>Review and approve consultant applications</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Applicant</TableHead>
                    <TableHead>Experience</TableHead>
                    <TableHead>Expertise</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {applications.map((application) => (
                    <TableRow key={application.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{application.full_name}</div>
                          <div className="text-sm text-muted-foreground">{application.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>{application.experience_years}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {application.expertise_areas.slice(0, 2).map((area) => (
                            <Badge key={area} variant="secondary" className="text-xs">
                              {area}
                            </Badge>
                          ))}
                          {application.expertise_areas.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{application.expertise_areas.length - 2} more
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            application.status === 'approved'
                              ? 'default'
                              : application.status === 'rejected'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {application.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-muted-foreground">
                          {new Date(application.created_at).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        {application.status === 'approved' ? (
                          <Button
                            size="sm"
                            onClick={() => createConsultantFromApplication(application.id)}
                          >
                            Create Profile
                          </Button>
                        ) : application.status === 'pending' ? (
                          <div className="flex space-x-2">
                            <Button variant="outline" size="sm">
                              Review
                            </Button>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            {application.status}
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Consultant Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedConsultant &&
                `${selectedConsultant.profiles.first_name} ${selectedConsultant.profiles.last_name}`}
            </DialogTitle>
            <DialogDescription>
              Consultant profile details and performance metrics
            </DialogDescription>
          </DialogHeader>

          {selectedConsultant && (
            <div className="space-y-6">
              {/* Profile Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <p className="text-sm">{selectedConsultant.profiles.email}</p>
                </div>
                <div>
                  <Label>Experience</Label>
                  <p className="text-sm">{selectedConsultant.years_experience} years</p>
                </div>
                <div>
                  <Label>Timezone</Label>
                  <p className="text-sm">{selectedConsultant.timezone}</p>
                </div>
                <div>
                  <Label>Hourly Rate</Label>
                  <p className="text-sm">
                    {selectedConsultant.hourly_rate
                      ? `$${selectedConsultant.hourly_rate}`
                      : 'Not set'}
                  </p>
                </div>
              </div>

              {/* Bio */}
              {selectedConsultant.bio && (
                <div>
                  <Label>Bio</Label>
                  <p className="mt-1 text-sm text-muted-foreground">{selectedConsultant.bio}</p>
                </div>
              )}

              {/* Expertise */}
              <div>
                <Label>Expertise Areas</Label>
                <div className="mt-1 flex flex-wrap gap-2">
                  {selectedConsultant.expertise_areas.map((area) => (
                    <Badge key={area} variant="secondary">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Certifications */}
              {selectedConsultant.certifications.length > 0 && (
                <div>
                  <Label>Certifications</Label>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {selectedConsultant.certifications.map((cert) => (
                      <Badge key={cert} variant="outline">
                        {cert}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Performance Metrics */}
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {selectedConsultant.total_escalations_handled}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Cases</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {selectedConsultant.avg_response_time_hours.toFixed(1)}h
                  </p>
                  <p className="text-xs text-muted-foreground">Avg Response</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {(selectedConsultant.success_rate * 100).toFixed(1)}%
                  </p>
                  <p className="text-xs text-muted-foreground">Success Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold">
                    {selectedConsultant.client_feedback_score.toFixed(1)}
                  </p>
                  <p className="text-xs text-muted-foreground">Client Score</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
