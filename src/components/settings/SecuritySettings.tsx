import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Shield, Key, Clock, AlertTriangle, CheckCircle, Settings } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { MFASettings } from './MFASettings';
import { supabase } from '@/integrations/supabase/client';

interface SecurityEvent {
  id: string;
  action: string;
  description: string;
  timestamp: string;
  ip_address?: unknown;
  user_agent?: unknown;
  created_at?: string;
  metadata?: any;
  tenant_id?: string;
  user_id?: string;
}

export const SecuritySettings = () => {
  const { user } = useAuth();
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [autoLogout, setAutoLogout] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);

  useEffect(() => {
    loadSecurityData();
  }, []);

  const loadSecurityData = async () => {
    try {
      // Load recent security events
      const { data: events } = await supabase
        .from('audit_logs')
        .select('*')
        .eq('user_id', user?.id)
        .order('timestamp', { ascending: false })
        .limit(10);

      if (events) {
        setSecurityEvents(events);
      }

      // Load active sessions
      const { data: sessions } = await supabase
        .from('user_sessions')
        .select('*')
        .eq('user_id', user?.id)
        .eq('is_active', true)
        .order('last_activity', { ascending: false });

      if (sessions) {
        setActiveSessions(sessions);
      }
    } catch (error) {
      console.error('Failed to load security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const terminateSession = async (sessionId: string) => {
    try {
      const { error } = await supabase
        .from('user_sessions')
        .update({ is_active: false })
        .eq('id', sessionId);

      if (!error) {
        setActiveSessions(sessions => sessions.filter(s => s.id !== sessionId));
      }
    } catch (error) {
      console.error('Failed to terminate session:', error);
    }
  };

  const formatEventTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const getEventIcon = (action: string) => {
    if (action.includes('SIGN_IN') || action.includes('LOGIN')) {
      return <Key className="h-4 w-4 text-green-600" />;
    }
    if (action.includes('MFA') || action.includes('SECURITY')) {
      return <Shield className="h-4 w-4 text-blue-600" />;
    }
    if (action.includes('FAILED') || action.includes('ERROR')) {
      return <AlertTriangle className="h-4 w-4 text-red-600" />;
    }
    return <Settings className="h-4 w-4 text-gray-600" />;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Loading security settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* MFA Settings */}
      <MFASettings />
      
      {/* Security Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Security Preferences
          </CardTitle>
          <CardDescription>
            Configure additional security options for your account
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-logout">Auto-logout on inactivity</Label>
              <p className="text-sm text-muted-foreground">
                Automatically sign out after 30 minutes of inactivity
              </p>
            </div>
            <Switch
              id="auto-logout"
              checked={autoLogout}
              onCheckedChange={setAutoLogout}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Security notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive email alerts for suspicious account activity
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
          </div>
        </CardContent>
      </Card>

      {/* Active Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="mr-2 h-5 w-5" />
            Active Sessions
          </CardTitle>
          <CardDescription>
            Manage devices and locations where you're currently signed in
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activeSessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No active sessions found</p>
          ) : (
            <div className="space-y-3">
              {activeSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <Badge variant="secondary">
                        {session.ip_address || 'Unknown IP'}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        Last active: {formatEventTime(session.last_activity)}
                      </span>
                    </div>
                    {session.user_agent && (
                      <p className="text-xs text-muted-foreground mt-1 truncate">
                        {session.user_agent}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => terminateSession(session.id)}
                  >
                    End Session
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Security Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="mr-2 h-5 w-5" />
            Recent Security Activity
          </CardTitle>
          <CardDescription>
            Review recent security-related events on your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {securityEvents.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recent security events</p>
          ) : (
            <div className="space-y-3">
              {securityEvents.map((event) => (
                <div key={event.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <div className="mt-0.5">
                    {getEventIcon(event.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{event.description}</p>
                    <div className="flex items-center space-x-4 mt-1 text-xs text-muted-foreground">
                      <span>{formatEventTime(event.timestamp)}</span>
                      {event.ip_address && (
                        <span>IP: {String(event.ip_address)}</span>
                      )}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {event.action}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Security Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-green-600" />
            Security Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Enable MFA:</strong> Multi-factor authentication adds an extra layer of security to your account.
            </AlertDescription>
          </Alert>
          
          <Alert>
            <Key className="h-4 w-4" />
            <AlertDescription>
              <strong>Regular Password Updates:</strong> Consider updating your password every 3-6 months.
            </AlertDescription>
          </Alert>
          
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              <strong>Monitor Active Sessions:</strong> Regularly review and terminate unrecognized sessions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};