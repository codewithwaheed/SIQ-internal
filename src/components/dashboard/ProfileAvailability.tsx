import { useState, useEffect } from 'react';
import { DashboardLayout } from './DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  User,
  Clock,
  Globe,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Award,
  Settings,
  Camera,
  Save,
  Bell,
  Users,
  Shield,
} from 'lucide-react';

interface ConsultantProfile {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone?: string;
  bio?: string;
  avatar_url?: string;
  timezone: string;
  hourly_rate?: number;
  specializations: string[];
  certifications: string[];
  years_experience?: number;
  created_at: string;
  updated_at: string;
}

interface AvailabilitySettings {
  id: string;
  user_id: string;
  monday_start?: string;
  monday_end?: string;
  tuesday_start?: string;
  tuesday_end?: string;
  wednesday_start?: string;
  wednesday_end?: string;
  thursday_start?: string;
  thursday_end?: string;
  friday_start?: string;
  friday_end?: string;
  saturday_start?: string;
  saturday_end?: string;
  sunday_start?: string;
  sunday_end?: string;
  auto_forward_enabled: boolean;
  backup_consultant_id?: string;
  max_concurrent_escalations: number;
  vacation_mode: boolean;
  vacation_start?: string;
  vacation_end?: string;
  vacation_message?: string;
}

const TIMEZONES = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'UTC', label: 'UTC' },
  { value: 'Europe/London', label: 'GMT' },
  { value: 'Europe/Paris', label: 'CET' },
  { value: 'Asia/Tokyo', label: 'JST' },
  { value: 'Asia/Shanghai', label: 'CST' },
  { value: 'Australia/Sydney', label: 'AEST' },
];

const SPECIALIZATIONS = [
  'NIST 800-171',
  'CMMC',
  'FedRAMP',
  'SOC 2',
  'ISO 27001',
  'HIPAA',
  'PCI DSS',
  'GDPR',
  'Risk Assessment',
  'Penetration Testing',
  'Incident Response',
  'Security Architecture',
];

export const ProfileAvailability = () => {
  const { user, profile } = useAuth();
  const [consultantProfile, setConsultantProfile] = useState<ConsultantProfile>({
    id: '',
    user_id: user?.id || '',
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
    bio: '',
    avatar_url: '',
    timezone: 'America/New_York',
    hourly_rate: 150,
    specializations: ['NIST 800-171', 'CMMC'],
    certifications: [],
    years_experience: 5,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });

  const [availability, setAvailability] = useState<AvailabilitySettings>({
    id: '',
    user_id: user?.id || '',
    monday_start: '09:00',
    monday_end: '17:00',
    tuesday_start: '09:00',
    tuesday_end: '17:00',
    wednesday_start: '09:00',
    wednesday_end: '17:00',
    thursday_start: '09:00',
    thursday_end: '17:00',
    friday_start: '09:00',
    friday_end: '17:00',
    saturday_start: '',
    saturday_end: '',
    sunday_start: '',
    sunday_end: '',
    auto_forward_enabled: false,
    backup_consultant_id: '',
    max_concurrent_escalations: 5,
    vacation_mode: false,
    vacation_start: '',
    vacation_end: '',
    vacation_message: '',
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSpecialization, setNewSpecialization] = useState('');
  const [newCertification, setNewCertification] = useState('');

  useEffect(() => {
    if (user) {
      loadProfile();
      loadAvailability();
    }
  }, [user]);

  const loadProfile = async () => {
    try {
      // In a real implementation, this would fetch from a consultant_profiles table
      // For now, we'll use mock data based on the existing profile
      const mockProfile: ConsultantProfile = {
        id: '1',
        user_id: user?.id || '',
        first_name: profile?.first_name || 'John',
        last_name: profile?.last_name || 'Smith',
        email: profile?.email || user?.email || '',
        phone: profile?.phone || '',
        bio: 'Experienced cybersecurity consultant specializing in NIST 800-171 and CMMC compliance. Over 10 years of experience helping organizations achieve and maintain security compliance.',
        avatar_url: '',
        timezone: 'America/New_York',
        hourly_rate: 175,
        specializations: ['NIST 800-171', 'CMMC', 'SOC 2', 'Risk Assessment'],
        certifications: ['CISSP', 'CISA', 'CMMC-AB Certified Assessor'],
        years_experience: 12,
        created_at: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      };

      setConsultantProfile(mockProfile);
    } catch (error: any) {
      console.error('Error loading profile:', error);
    }
  };

  const loadAvailability = async () => {
    try {
      // Mock availability data
      const mockAvailability: AvailabilitySettings = {
        id: '1',
        user_id: user?.id || '',
        monday_start: '08:00',
        monday_end: '18:00',
        tuesday_start: '08:00',
        tuesday_end: '18:00',
        wednesday_start: '08:00',
        wednesday_end: '18:00',
        thursday_start: '08:00',
        thursday_end: '18:00',
        friday_start: '08:00',
        friday_end: '17:00',
        saturday_start: '',
        saturday_end: '',
        sunday_start: '',
        sunday_end: '',
        auto_forward_enabled: true,
        backup_consultant_id: 'consultant-2',
        max_concurrent_escalations: 8,
        vacation_mode: false,
        vacation_start: '',
        vacation_end: '',
        vacation_message: '',
      };

      setAvailability(mockAvailability);
    } catch (error: any) {
      console.error('Error loading availability:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async () => {
    try {
      setSaving(true);

      // In real implementation, this would update the consultant_profiles table
      console.log('Saving profile:', consultantProfile);

      toast.success('Profile updated successfully');
    } catch (error: any) {
      toast.error('Failed to update profile');
      console.error('Error saving profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveAvailability = async () => {
    try {
      setSaving(true);

      // In real implementation, this would update the consultant_availability table
      console.log('Saving availability:', availability);

      toast.success('Availability settings updated');
    } catch (error: any) {
      toast.error('Failed to update availability');
      console.error('Error saving availability:', error);
    } finally {
      setSaving(false);
    }
  };

  const addSpecialization = () => {
    if (newSpecialization && !consultantProfile.specializations.includes(newSpecialization)) {
      setConsultantProfile((prev) => ({
        ...prev,
        specializations: [...prev.specializations, newSpecialization],
      }));
      setNewSpecialization('');
    }
  };

  const removeSpecialization = (spec: string) => {
    setConsultantProfile((prev) => ({
      ...prev,
      specializations: prev.specializations.filter((s) => s !== spec),
    }));
  };

  const addCertification = () => {
    if (newCertification && !consultantProfile.certifications.includes(newCertification)) {
      setConsultantProfile((prev) => ({
        ...prev,
        certifications: [...prev.certifications, newCertification],
      }));
      setNewCertification('');
    }
  };

  const removeCertification = (cert: string) => {
    setConsultantProfile((prev) => ({
      ...prev,
      certifications: prev.certifications.filter((c) => c !== cert),
    }));
  };

  const generateInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  if (loading) {
    return (
      <DashboardLayout title="Profile & Availability" subtitle="Loading profile...">
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="Profile & Availability"
      subtitle="Manage your consultant profile and working hours"
    >
      <div className="space-y-6">
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="availability">Availability</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="mr-2 h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center space-x-6">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={consultantProfile.avatar_url} />
                    <AvatarFallback className="text-lg">
                      {generateInitials(consultantProfile.first_name, consultantProfile.last_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <Button variant="outline" size="sm">
                      <Camera className="mr-2 h-4 w-4" />
                      Upload Photo
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">JPG, PNG up to 2MB</p>
                  </div>
                </div>

                {/* Personal Details */}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      value={consultantProfile.first_name}
                      onChange={(e) =>
                        setConsultantProfile((prev) => ({
                          ...prev,
                          first_name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      value={consultantProfile.last_name}
                      onChange={(e) =>
                        setConsultantProfile((prev) => ({
                          ...prev,
                          last_name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={consultantProfile.email}
                      onChange={(e) =>
                        setConsultantProfile((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      value={consultantProfile.phone || ''}
                      onChange={(e) =>
                        setConsultantProfile((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="timezone">Timezone</Label>
                    <Select
                      value={consultantProfile.timezone}
                      onValueChange={(value) =>
                        setConsultantProfile((prev) => ({
                          ...prev,
                          timezone: value,
                        }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIMEZONES.map((tz) => (
                          <SelectItem key={tz.value} value={tz.value}>
                            {tz.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                    <Input
                      id="hourlyRate"
                      type="number"
                      value={consultantProfile.hourly_rate || ''}
                      onChange={(e) =>
                        setConsultantProfile((prev) => ({
                          ...prev,
                          hourly_rate: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Bio */}
                <div>
                  <Label htmlFor="bio">Professional Bio</Label>
                  <Textarea
                    id="bio"
                    value={consultantProfile.bio || ''}
                    onChange={(e) =>
                      setConsultantProfile((prev) => ({
                        ...prev,
                        bio: e.target.value,
                      }))
                    }
                    rows={4}
                    placeholder="Describe your experience and expertise..."
                  />
                </div>

                <Button onClick={saveProfile} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </Button>
              </CardContent>
            </Card>

            {/* Specializations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Shield className="mr-2 h-5 w-5" />
                  Specializations
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {consultantProfile.specializations.map((spec) => (
                    <Badge key={spec} variant="secondary" className="flex items-center space-x-1">
                      <span>{spec}</span>
                      <button
                        onClick={() => removeSpecialization(spec)}
                        className="ml-1 text-xs hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Select value={newSpecialization} onValueChange={setNewSpecialization}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Add specialization" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALIZATIONS.filter(
                        (s) => !consultantProfile.specializations.includes(s),
                      ).map((spec) => (
                        <SelectItem key={spec} value={spec}>
                          {spec}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={addSpecialization} disabled={!newSpecialization}>
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Certifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Award className="mr-2 h-5 w-5" />
                  Certifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {consultantProfile.certifications.map((cert) => (
                    <Badge key={cert} className="flex items-center space-x-1">
                      <span>{cert}</span>
                      <button
                        onClick={() => removeCertification(cert)}
                        className="ml-1 text-xs hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Input
                    value={newCertification}
                    onChange={(e) => setNewCertification(e.target.value)}
                    placeholder="Add certification"
                    onKeyPress={(e) => e.key === 'Enter' && addCertification()}
                  />
                  <Button onClick={addCertification} disabled={!newCertification}>
                    Add
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="availability" className="space-y-6">
            {/* Working Hours */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="mr-2 h-5 w-5" />
                  Working Hours
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(
                  (day) => (
                    <div key={day} className="flex items-center space-x-4">
                      <div className="w-24 font-medium capitalize">{day}</div>
                      <div className="flex flex-1 items-center space-x-2">
                        <Input
                          type="time"
                          value={
                            (availability[
                              `${day}_start` as keyof AvailabilitySettings
                            ] as string) || ''
                          }
                          onChange={(e) =>
                            setAvailability((prev) => ({
                              ...prev,
                              [`${day}_start`]: e.target.value,
                            }))
                          }
                          className="w-32"
                        />
                        <span className="text-muted-foreground">to</span>
                        <Input
                          type="time"
                          value={
                            (availability[`${day}_end` as keyof AvailabilitySettings] as string) ||
                            ''
                          }
                          onChange={(e) =>
                            setAvailability((prev) => ({
                              ...prev,
                              [`${day}_end`]: e.target.value,
                            }))
                          }
                          className="w-32"
                        />
                      </div>
                    </div>
                  ),
                )}

                <Button onClick={saveAvailability} disabled={saving}>
                  <Save className="mr-2 h-4 w-4" />
                  {saving ? 'Saving...' : 'Save Schedule'}
                </Button>
              </CardContent>
            </Card>

            {/* Escalation Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Escalation Management
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="maxEscalations">Max Concurrent Escalations</Label>
                    <Input
                      id="maxEscalations"
                      type="number"
                      min="1"
                      max="20"
                      value={availability.max_concurrent_escalations}
                      onChange={(e) =>
                        setAvailability((prev) => ({
                          ...prev,
                          max_concurrent_escalations: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-forward escalations when unavailable</Label>
                      <p className="text-sm text-muted-foreground">
                        Automatically forward escalations to backup consultant
                      </p>
                    </div>
                    <Switch
                      checked={availability.auto_forward_enabled}
                      onCheckedChange={(checked) =>
                        setAvailability((prev) => ({
                          ...prev,
                          auto_forward_enabled: checked,
                        }))
                      }
                    />
                  </div>

                  {availability.auto_forward_enabled && (
                    <div>
                      <Label htmlFor="backupConsultant">Backup Consultant</Label>
                      <Select
                        value={availability.backup_consultant_id || ''}
                        onValueChange={(value) =>
                          setAvailability((prev) => ({
                            ...prev,
                            backup_consultant_id: value,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select backup consultant" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="consultant-2">Jane Smith</SelectItem>
                          <SelectItem value="consultant-3">Mike Johnson</SelectItem>
                          <SelectItem value="consultant-4">Sarah Wilson</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Vacation Mode */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5" />
                  Vacation Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Vacation mode</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically forward all escalations
                    </p>
                  </div>
                  <Switch
                    checked={availability.vacation_mode}
                    onCheckedChange={(checked) =>
                      setAvailability((prev) => ({
                        ...prev,
                        vacation_mode: checked,
                      }))
                    }
                  />
                </div>

                {availability.vacation_mode && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="vacationStart">Start Date</Label>
                        <Input
                          id="vacationStart"
                          type="date"
                          value={availability.vacation_start || ''}
                          onChange={(e) =>
                            setAvailability((prev) => ({
                              ...prev,
                              vacation_start: e.target.value,
                            }))
                          }
                        />
                      </div>
                      <div>
                        <Label htmlFor="vacationEnd">End Date</Label>
                        <Input
                          id="vacationEnd"
                          type="date"
                          value={availability.vacation_end || ''}
                          onChange={(e) =>
                            setAvailability((prev) => ({
                              ...prev,
                              vacation_end: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="vacationMessage">Auto-reply Message</Label>
                      <Textarea
                        id="vacationMessage"
                        value={availability.vacation_message || ''}
                        onChange={(e) =>
                          setAvailability((prev) => ({
                            ...prev,
                            vacation_message: e.target.value,
                          }))
                        }
                        placeholder="I'm currently on vacation and will return on..."
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="preferences" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Bell className="mr-2 h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Notification settings can be managed in the
                  <Button variant="link" className="h-auto px-1">
                    Notifications & Inbox
                  </Button>
                  section.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};
