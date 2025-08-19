import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { User, Lock, Trash2, HelpCircle, Download, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { SecuritySettings } from '@/components/settings/SecuritySettings';
export function SettingsPage() {
  const { user, profile, updateProfile, signOut } = useAuth();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    first_name: profile?.first_name || '',
    last_name: profile?.last_name || '',
    company_name: profile?.company_name || '',
    phone: profile?.phone || '',
  });
  const [preferences, setPreferences] = useState({
    auto_delete_uploads: false,
    email_notifications: true,
    security_alerts: true,
  });
  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await updateProfile(profileData);
      toast({
        title: 'Profile Updated',
        description: 'Your profile information has been saved successfully.',
      });
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: 'Failed to update profile. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  const handleDeleteAccount = async () => {
    // In a real app, this would call a backend service to delete the account
    toast({
      title: 'Account Deletion',
      description: 'Account deletion functionality would be implemented here.',
      variant: 'destructive',
    });
  };
  const handleExportData = () => {
    // Mock data export
    const data = {
      profile: profileData,
      preferences: preferences,
      export_date: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sentriq-data-export.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({
      title: 'Data Exported',
      description: 'Your data has been downloaded as a JSON file.',
    });
  };
  return (
    <div className="page">
      <div className="page-title">
        <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences</p>
      </div>

      {/* Profile Settings */}
      <div className="section-card">
        <h2 className="mb-space-2 flex items-center gap-space-2 text-xl font-semibold">
          <User className="h-5 w-5" />
          Profile Information
        </h2>
        <p className="mb-space-4 text-muted-foreground">
          Update your personal information and contact details
        </p>
        <form onSubmit={handleProfileUpdate} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={profileData.first_name}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    first_name: e.target.value,
                  }))
                }
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={profileData.last_name}
                onChange={(e) =>
                  setProfileData((prev) => ({
                    ...prev,
                    last_name: e.target.value,
                  }))
                }
                placeholder="Enter your last name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={user?.email || ''}
              disabled
              className="bg-muted"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Email address cannot be changed. Contact support if needed.
            </p>
          </div>

          <div>
            <Label htmlFor="company_name">Company Name</Label>
            <Input
              id="company_name"
              value={profileData.company_name}
              onChange={(e) =>
                setProfileData((prev) => ({
                  ...prev,
                  company_name: e.target.value,
                }))
              }
              placeholder="Enter your company name"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={profileData.phone}
              onChange={(e) =>
                setProfileData((prev) => ({
                  ...prev,
                  phone: e.target.value,
                }))
              }
              placeholder="Enter your phone number"
            />
          </div>

          <Button type="submit" disabled={loading}>
            {loading ? 'Updating...' : 'Update Profile'}
          </Button>
        </form>
      </div>

      {/* Theme Settings */}
      <div className="section-card">
        <h2 className="mb-space-2 flex items-center gap-space-2 text-xl font-semibold">
          {theme === 'dark' ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
          Appearance
        </h2>
        <p className="mb-space-4 text-muted-foreground">Customize how SentrIQ looks and feels</p>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Dark Mode</h3>
            <p className="text-sm text-muted-foreground">Toggle between light and dark themes</p>
          </div>
          <Switch
            checked={theme === 'dark'}
            onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')}
          />
        </div>
      </div>

      {/* Security Settings */}
      <SecuritySettings />

      {/* Privacy & Security */}
      <div className="section-card">
        <h2 className="mb-space-2 flex items-center gap-space-2 text-xl font-semibold">
          <Lock className="h-5 w-5" />
          Privacy & Security
        </h2>
        <p className="mb-space-4 text-muted-foreground">
          Manage your data and security preferences
        </p>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Auto-delete uploads</h3>
            <p className="text-sm text-muted-foreground">
              Automatically delete uploaded documents after 30 days
            </p>
          </div>
          <Switch
            checked={preferences.auto_delete_uploads}
            onCheckedChange={(checked) =>
              setPreferences((prev) => ({
                ...prev,
                auto_delete_uploads: checked,
              }))
            }
          />
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Email notifications</h3>
            <p className="text-sm text-muted-foreground">
              Receive email updates about your account
            </p>
          </div>
          <Switch
            checked={preferences.email_notifications}
            onCheckedChange={(checked) =>
              setPreferences((prev) => ({
                ...prev,
                email_notifications: checked,
              }))
            }
          />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium">Security alerts</h3>
            <p className="text-sm text-muted-foreground">
              Get notified about important security updates
            </p>
          </div>
          <Switch
            checked={preferences.security_alerts}
            onCheckedChange={(checked) =>
              setPreferences((prev) => ({
                ...prev,
                security_alerts: checked,
              }))
            }
          />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="section-card border-red-200">
        <h2 className="mb-space-2 flex items-center gap-space-2 text-xl font-semibold text-red-700">
          <Trash2 className="h-5 w-5" />
          Danger Zone
        </h2>
        <p className="mb-space-4 text-muted-foreground">
          Irreversible actions that will affect your account
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete Account
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your account and remove
                all your data from our servers, including:
                <ul className="mt-2 list-inside list-disc space-y-1">
                  <li>All chat conversations and history</li>
                  <li>Uploaded documents and analysis</li>
                  <li>Profile information and preferences</li>
                  <li>Subscription and billing information</li>
                </ul>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteAccount}
                className="bg-red-600 hover:bg-red-700"
              >
                Yes, delete my account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
