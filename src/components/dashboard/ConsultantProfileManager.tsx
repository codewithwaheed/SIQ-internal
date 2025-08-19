import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { 
  User, 
  MapPin, 
  Clock, 
  Star, 
  Award, 
  Briefcase, 
  Globe, 
  Shield,
  CheckCircle,
  XCircle,
  Activity,
  Calendar,
  TrendingUp,
  Users,
  Timer
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
  availability_hours: Record<string, any>;
  specializations: string[];
  security_clearance?: string;
  work_authorization?: string;
  languages: string[];
  rating: number;
  total_escalations_handled: number;
  avg_response_time_hours: number;
  success_rate: number;
  client_feedback_score: number;
  portfolio_url?: string;
  linkedin_url?: string;
  resume_url?: string;
  last_active_at: string;
  is_verified: boolean;
  is_active: boolean;
  profiles: {
    email: string;
    first_name: string;
    last_name: string;
    company_name?: string;
    phone?: string;
    country?: string;
  };
}

const AVAILABILITY_STATUS_CONFIG = {
  online: { label: 'Online', color: 'bg-green-500', icon: CheckCircle },
  offline: { label: 'Offline', color: 'bg-gray-500', icon: XCircle },
  busy: { label: 'Busy', color: 'bg-red-500', icon: Activity },
  away: { label: 'Away', color: 'bg-yellow-500', icon: Clock }
};

const EXPERTISE_AREAS = [
  'NIST Cybersecurity Framework',
  'ISO 27001',
  'SOC 2',
  'HIPAA',
  'PCI DSS',
  'GDPR',
  'FedRAMP',
  'CMMC',
  'Risk Assessment',
  'Incident Response',
  'Security Architecture',
  'Penetration Testing',
  'Vulnerability Management',
  'Identity & Access Management',
  'Cloud Security',
  'Network Security',
  'Application Security',
  'Compliance Auditing',
  'Security Training',
  'Business Continuity'
];

export const ConsultantProfileManager = () => {
  const { user, userRole } = useAuth();
  const { toast } = useToast();
  const [profile, setProfile] = useState<ConsultantProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Form data
  const [formData, setFormData] = useState({
    bio: '',
    expertise_areas: [] as string[],
    certifications: [] as string[],
    years_experience: 0,
    hourly_rate: 0,
    timezone: 'UTC',
    specializations: [] as string[],
    security_clearance: '',
    work_authorization: '',
    languages: ['English'],
    portfolio_url: '',
    linkedin_url: '',
    resume_url: ''
  });

  useEffect(() => {
    if (user && userRole === 'consultant') {
      fetchProfile();
    }
  }, [user, userRole]);

  const fetchProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('manage-consultants', {
        body: null,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;

      // Look for current user's profile in the list
      const userProfile = data.consultants?.find((c: any) => c.user_id === user.id);
      
      if (userProfile) {
        setProfile(userProfile);
        setFormData({
          bio: userProfile.bio || '',
          expertise_areas: userProfile.expertise_areas || [],
          certifications: userProfile.certifications || [],
          years_experience: userProfile.years_experience || 0,
          hourly_rate: userProfile.hourly_rate || 0,
          timezone: userProfile.timezone || 'UTC',
          specializations: userProfile.specializations || [],
          security_clearance: userProfile.security_clearance || '',
          work_authorization: userProfile.work_authorization || '',
          languages: userProfile.languages || ['English'],
          portfolio_url: userProfile.portfolio_url || '',
          linkedin_url: userProfile.linkedin_url || '',
          resume_url: userProfile.resume_url || ''
        });
      }
    } catch (error: any) {
      console.error('Error fetching consultant profile:', error);
      toast({
        title: "Error",
        description: "Failed to load consultant profile",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAvailability = async (status: string) => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('manage-consultants', {
        body: { status },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, availability_status: status as any } : null);
      toast({
        title: "Success",
        description: `Availability updated to ${status}`
      });
    } catch (error: any) {
      console.error('Error updating availability:', error);
      toast({
        title: "Error",
        description: "Failed to update availability",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const saveProfile = async () => {
    if (!profile) return;

    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke('manage-consultants', {
        body: formData,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, ...formData } : null);
      setEditMode(false);
      toast({
        title: "Success",
        description: "Profile updated successfully"
      });
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const addExpertiseArea = (area: string) => {
    if (!formData.expertise_areas.includes(area)) {
      setFormData(prev => ({
        ...prev,
        expertise_areas: [...prev.expertise_areas, area]
      }));
    }
  };

  const removeExpertiseArea = (area: string) => {
    setFormData(prev => ({
      ...prev,
      expertise_areas: prev.expertise_areas.filter(a => a !== area)
    }));
  };

  const addCertification = () => {
    const input = document.getElementById('new-certification') as HTMLInputElement;
    const certification = input.value.trim();
    
    if (certification && !formData.certifications.includes(certification)) {
      setFormData(prev => ({
        ...prev,
        certifications: [...prev.certifications, certification]
      }));
      input.value = '';
    }
  };

  const removeCertification = (cert: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter(c => c !== cert)
    }));
  };

  if (userRole !== 'consultant') {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Access denied. This page is only available to consultants.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="h-32 bg-muted rounded"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <User className="h-12 w-12 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">No Consultant Profile Found</h3>
                <p className="text-muted-foreground">
                  Your consultant profile has not been set up yet. Please contact an administrator.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const statusConfig = AVAILABILITY_STATUS_CONFIG[profile.availability_status];
  const StatusIcon = statusConfig.icon;

  return (
    <div className="p-6 space-y-6">
      {/* Header with Availability Controls */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Consultant Profile</h1>
          <p className="text-muted-foreground">
            Manage your consultant profile and availability status
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Availability Status */}
          <div className="flex items-center space-x-2">
            <StatusIcon className={`h-4 w-4 text-white rounded-full p-0.5 ${statusConfig.color}`} />
            <span className="font-medium">{statusConfig.label}</span>
          </div>
          
          {/* Availability Controls */}
          <Select 
            value={profile.availability_status} 
            onValueChange={updateAvailability}
            disabled={saving}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="online">Online</SelectItem>
              <SelectItem value="away">Away</SelectItem>
              <SelectItem value="busy">Busy</SelectItem>
              <SelectItem value="offline">Offline</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="stats">Performance Stats</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          {/* Profile Overview */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Your professional consultant profile information
                </CardDescription>
              </div>
              <Button
                variant={editMode ? "outline" : "default"}
                onClick={() => setEditMode(!editMode)}
                disabled={saving}
              >
                {editMode ? "Cancel" : "Edit Profile"}
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              {editMode ? (
                <div className="space-y-4">
                  {/* Bio */}
                  <div className="space-y-2">
                    <Label htmlFor="bio">Professional Bio</Label>
                    <Textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                      placeholder="Describe your professional background and expertise..."
                      rows={4}
                    />
                  </div>

                  {/* Experience */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="experience">Years of Experience</Label>
                      <Input
                        id="experience"
                        type="number"
                        value={formData.years_experience}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          years_experience: parseInt(e.target.value) || 0 
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="hourly-rate">Hourly Rate ($)</Label>
                      <Input
                        id="hourly-rate"
                        type="number"
                        value={formData.hourly_rate}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          hourly_rate: parseFloat(e.target.value) || 0 
                        }))}
                      />
                    </div>
                  </div>

                  {/* Expertise Areas */}
                  <div className="space-y-2">
                    <Label>Expertise Areas</Label>
                    <div className="space-y-2">
                      <Select onValueChange={addExpertiseArea}>
                        <SelectTrigger>
                          <SelectValue placeholder="Add expertise area..." />
                        </SelectTrigger>
                        <SelectContent>
                          {EXPERTISE_AREAS.filter(area => !formData.expertise_areas.includes(area)).map(area => (
                            <SelectItem key={area} value={area}>{area}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex flex-wrap gap-2">
                        {formData.expertise_areas.map(area => (
                          <Badge 
                            key={area} 
                            variant="secondary" 
                            className="cursor-pointer"
                            onClick={() => removeExpertiseArea(area)}
                          >
                            {area} ×
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Certifications */}
                  <div className="space-y-2">
                    <Label>Certifications</Label>
                    <div className="flex space-x-2">
                      <Input
                        id="new-certification"
                        placeholder="Add certification..."
                        onKeyPress={(e) => e.key === 'Enter' && addCertification()}
                      />
                      <Button type="button" onClick={addCertification}>Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {formData.certifications.map(cert => (
                        <Badge 
                          key={cert} 
                          variant="outline"
                          className="cursor-pointer"
                          onClick={() => removeCertification(cert)}
                        >
                          {cert} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Links */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="portfolio">Portfolio URL</Label>
                      <Input
                        id="portfolio"
                        type="url"
                        value={formData.portfolio_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, portfolio_url: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="linkedin">LinkedIn URL</Label>
                      <Input
                        id="linkedin"
                        type="url"
                        value={formData.linkedin_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, linkedin_url: e.target.value }))}
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="resume">Resume URL</Label>
                      <Input
                        id="resume"
                        type="url"
                        value={formData.resume_url}
                        onChange={(e) => setFormData(prev => ({ ...prev, resume_url: e.target.value }))}
                        placeholder="https://..."
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setEditMode(false)}>
                      Cancel
                    </Button>
                    <Button onClick={saveProfile} disabled={saving}>
                      {saving ? "Saving..." : "Save Changes"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {profile.profiles.first_name} {profile.profiles.last_name}
                        </h3>
                        <p className="text-muted-foreground">{profile.profiles.email}</p>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <Badge variant={profile.is_verified ? "default" : "secondary"}>
                          {profile.is_verified ? "Verified" : "Pending Verification"}
                        </Badge>
                        <Badge variant={profile.is_active ? "default" : "destructive"}>
                          {profile.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <span>{profile.years_experience} years experience</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Star className="h-4 w-4 text-yellow-500" />
                        <span>{profile.rating.toFixed(1)} rating</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>{profile.timezone}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bio */}
                  {profile.bio && (
                    <div>
                      <h4 className="font-medium mb-2">Bio</h4>
                      <p className="text-muted-foreground">{profile.bio}</p>
                    </div>
                  )}

                  {/* Expertise */}
                  <div>
                    <h4 className="font-medium mb-2">Expertise Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.expertise_areas.map(area => (
                        <Badge key={area} variant="secondary">{area}</Badge>
                      ))}
                    </div>
                  </div>

                  {/* Certifications */}
                  {profile.certifications.length > 0 && (
                    <div>
                      <h4 className="font-medium mb-2">Certifications</h4>
                      <div className="flex flex-wrap gap-2">
                        {profile.certifications.map(cert => (
                          <Badge key={cert} variant="outline">
                            <Award className="h-3 w-3 mr-1" />
                            {cert}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{profile.total_escalations_handled}</p>
                    <p className="text-xs text-muted-foreground">Total Cases</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Timer className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{profile.avg_response_time_hours.toFixed(1)}h</p>
                    <p className="text-xs text-muted-foreground">Avg Response Time</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{(profile.success_rate * 100).toFixed(1)}%</p>
                    <p className="text-xs text-muted-foreground">Success Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center space-x-2">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <div>
                    <p className="text-2xl font-bold">{profile.client_feedback_score.toFixed(1)}</p>
                    <p className="text-xs text-muted-foreground">Client Feedback</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="availability" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Availability Settings</CardTitle>
              <CardDescription>
                Manage your availability schedule and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label>Current Status</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <StatusIcon className={`h-4 w-4 text-white rounded-full p-0.5 ${statusConfig.color}`} />
                    <span className="font-medium">{statusConfig.label}</span>
                  </div>
                </div>

                <div>
                  <Label>Last Active</Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(profile.last_active_at).toLocaleString()}
                  </p>
                </div>

                <div>
                  <Label>Timezone</Label>
                  <p className="text-sm text-muted-foreground mt-1">{profile.timezone}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};