import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, XCircle, Clock, Eye, MessageSquare } from "lucide-react";

interface ConsultantApplication {
  id: string;
  full_name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  experience_years: string;
  expertise_areas: string[];
  certifications: string[];
  other_expertise?: string;
  other_certifications?: string;
  smb_experience?: boolean;
  vciso_experience?: boolean;
  timezone: string;
  availability_hours: string;
  work_authorization?: string;
  security_clearance?: string;
  engagement_preferences: string[];
  resume_url?: string;
  portfolio_url?: string;
  testimonials?: string;
  background_check_consent: boolean;
  nda_agreement: boolean;
  additional_info?: string;
  status: 'pending' | 'approved' | 'rejected';
  admin_notes?: string;
  created_at: string;
  updated_at: string;
  approved_by?: string;
  approved_at?: string;
}

export const ConsultantApplicationsDashboard = () => {
  const [applications, setApplications] = useState<ConsultantApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<ConsultantApplication | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const { toast } = useToast();

  const fetchApplications = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('manage-consultant-applications', {
        method: 'GET'
      });

      if (error) throw error;
      setApplications(data || []);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast({
        title: "Error",
        description: "Failed to load applications",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, []);

  const updateApplicationStatus = async (applicationId: string, status: 'approved' | 'rejected') => {
    setUpdating(true);
    try {
      const { data, error } = await supabase.functions.invoke('manage-consultant-applications', {
        method: 'PATCH',
        body: {
          applicationId,
          status,
          adminNotes
        }
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: `Application ${status} successfully`
      });

      // Refresh applications
      await fetchApplications();
      setSelectedApplication(null);
      setAdminNotes("");
      
    } catch (error: any) {
      console.error('Error updating application:', error);
      toast({
        title: "Error",
        description: "Failed to update application",
        variant: "destructive"
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredApplications = applications.filter(app => 
    filter === 'all' || app.status === filter
  );

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading applications...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Consultant Applications</h1>
        <p className="text-muted-foreground">Review and manage consultant applications</p>
      </div>

      <Tabs value={filter} onValueChange={(value) => setFilter(value as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all">All ({applications.length})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({applications.filter(a => a.status === 'pending').length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({applications.filter(a => a.status === 'approved').length})</TabsTrigger>
          <TabsTrigger value="rejected">Rejected ({applications.filter(a => a.status === 'rejected').length})</TabsTrigger>
        </TabsList>

        <TabsContent value={filter} className="space-y-4">
          {filteredApplications.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No applications found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredApplications.map((application) => (
                <Card key={application.id}>
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {application.full_name}
                          {getStatusBadge(application.status)}
                        </CardTitle>
                        <CardDescription>{application.email}</CardDescription>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Applied {new Date(application.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div>
                        <p className="text-sm font-medium">Experience</p>
                        <p className="text-sm text-muted-foreground">{application.experience_years}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Timezone</p>
                        <p className="text-sm text-muted-foreground">{application.timezone}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Availability</p>
                        <p className="text-sm text-muted-foreground">{application.availability_hours}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">SMB Experience</p>
                        <p className="text-sm text-muted-foreground">{application.smb_experience ? 'Yes' : 'No'}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1 mb-4">
                      {application.expertise_areas.map((area, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {area}
                        </Badge>
                      ))}
                    </div>

                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedApplication(application)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>{application.full_name}</DialogTitle>
                            <DialogDescription>
                              Consultant Application Details
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-6">
                            {/* Basic Info */}
                            <div>
                              <h3 className="font-semibold mb-2">Contact Information</h3>
                              <div className="grid grid-cols-2 gap-4 text-sm">
                                <div><strong>Email:</strong> {application.email}</div>
                                <div><strong>Phone:</strong> {application.phone || 'Not provided'}</div>
                                <div><strong>LinkedIn:</strong> {application.linkedin || 'Not provided'}</div>
                                <div><strong>Timezone:</strong> {application.timezone}</div>
                              </div>
                            </div>

                            {/* Experience */}
                            <div>
                              <h3 className="font-semibold mb-2">Experience & Background</h3>
                              <div className="space-y-2 text-sm">
                                <div><strong>Years of Experience:</strong> {application.experience_years}</div>
                                <div><strong>SMB Experience:</strong> {application.smb_experience ? 'Yes' : 'No'}</div>
                                <div><strong>vCISO Experience:</strong> {application.vciso_experience ? 'Yes' : 'No'}</div>
                                <div>
                                  <strong>Expertise Areas:</strong>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {application.expertise_areas.map((area, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">{area}</Badge>
                                    ))}
                                  </div>
                                </div>
                                <div>
                                  <strong>Certifications:</strong>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {application.certifications.map((cert, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">{cert}</Badge>
                                    ))}
                                  </div>
                                </div>
                                {application.other_expertise && (
                                  <div><strong>Other Expertise:</strong> {application.other_expertise}</div>
                                )}
                                {application.other_certifications && (
                                  <div><strong>Other Certifications:</strong> {application.other_certifications}</div>
                                )}
                              </div>
                            </div>

                            {/* Availability */}
                            <div>
                              <h3 className="font-semibold mb-2">Availability</h3>
                              <div className="text-sm space-y-2">
                                <div><strong>Hours per week:</strong> {application.availability_hours}</div>
                                <div>
                                  <strong>Engagement Preferences:</strong>
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {application.engagement_preferences.map((pref, index) => (
                                      <Badge key={index} variant="outline" className="text-xs">{pref}</Badge>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Additional Info */}
                            {application.additional_info && (
                              <div>
                                <h3 className="font-semibold mb-2">Additional Information</h3>
                                <p className="text-sm">{application.additional_info}</p>
                              </div>
                            )}

                            {/* Admin Actions */}
                            {application.status === 'pending' && (
                              <div className="border-t pt-4">
                                <h3 className="font-semibold mb-2">Admin Actions</h3>
                                <div className="space-y-4">
                                  <div>
                                    <label className="text-sm font-medium">Admin Notes</label>
                                    <Textarea
                                      value={adminNotes}
                                      onChange={(e) => setAdminNotes(e.target.value)}
                                      placeholder="Add notes about this application..."
                                      className="mt-1"
                                    />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button
                                      onClick={() => updateApplicationStatus(application.id, 'approved')}
                                      disabled={updating}
                                      className="bg-green-500 hover:bg-green-600"
                                    >
                                      <CheckCircle className="w-4 h-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      onClick={() => updateApplicationStatus(application.id, 'rejected')}
                                      disabled={updating}
                                      variant="destructive"
                                    >
                                      <XCircle className="w-4 h-4 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Admin Notes Display */}
                            {application.admin_notes && (
                              <div>
                                <h3 className="font-semibold mb-2">Admin Notes</h3>
                                <p className="text-sm bg-muted p-3 rounded">{application.admin_notes}</p>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>

                      {application.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedApplication(application);
                              updateApplicationStatus(application.id, 'approved');
                            }}
                            disabled={updating}
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setSelectedApplication(application);
                              updateApplicationStatus(application.id, 'rejected');
                            }}
                            disabled={updating}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};