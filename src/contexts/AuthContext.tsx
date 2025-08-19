import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AuditLogger } from '@/lib/audit-logger';

type UserRole = 'business_owner' | 'consultant' | 'admin';
type SubscriptionTier = 'Basic' | 'Pro' | 'Premium';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
  country?: string;
}

interface SubscriptionInfo {
  subscribed: boolean;
  subscription_tier: SubscriptionTier;
  subscription_end: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  userRole: UserRole | null;
  subscriptionInfo: SubscriptionInfo | null;
  loading: boolean;
  needsOnboarding: boolean;
  mfaChallenge: any | null;
  signUp: (
    email: string,
    password: string,
    metadata?: any,
    redirectUrl?: string,
  ) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any; mfaChallenge?: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  completeOnboarding: () => void;
  checkSubscription: () => Promise<void>;
  enrollMFA: () => Promise<{
    error: any;
    qr?: string;
    secret?: string;
    factorId?: string;
  }>;
  verifyMFA: (factorId: string, code: string) => Promise<{ error: any }>;
  challengeMFA: (factorId: string, code: string) => Promise<{ error: any }>;
  unenrollMFA: (factorId: string) => Promise<{ error: any }>;
  getMFAFactors: () => Promise<{ error: any; factors?: any[] }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [subscriptionInfo, setSubscriptionInfo] = useState<SubscriptionInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState<any | null>(null);
  const { toast } = useToast();

  const fetchProfile = async (userId: string) => {
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;

      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();

      if (roleError) throw roleError;

      setProfile(profileData);
      setUserRole(roleData.role);
      setNeedsOnboarding(!profileData.country);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const checkSubscription = async () => {
    if (!session?.access_token) {
      setSubscriptionInfo({
        subscribed: false,
        subscription_tier: 'Basic',
        subscription_end: null,
      });
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-subscription', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      setSubscriptionInfo({
        subscribed: data.subscribed || false,
        subscription_tier: data.subscription_tier || 'Basic',
        subscription_end: data.subscription_end || null,
      });
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscriptionInfo({
        subscribed: false,
        subscription_tier: 'Basic',
        subscription_end: null,
      });
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        // Defer profile fetching to avoid deadlock
        setTimeout(() => {
          fetchProfile(session.user.id);
          checkSubscription();
        }, 0);
      } else {
        setProfile(null);
        setUserRole(null);
        setSubscriptionInfo({
          subscribed: false,
          subscription_tier: 'Basic',
          subscription_end: null,
        });
      }
      setLoading(false);
    });

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, metadata?: any, redirectUrl?: string) => {
    const finalRedirectUrl = redirectUrl || `${window.location.origin}/`;

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: finalRedirectUrl,
        data: metadata,
      },
    });

    if (error) {
      // Log failed signup attempt
      AuditLogger.logAuth(
        'unknown',
        'LOGIN_FAILURE',
        `Signup failed for ${email}: ${error.message}`,
      );
      toast({
        title: 'Sign up failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      // Log successful signup
      AuditLogger.logAuth('unknown', 'SIGNUP', `User signed up with email: ${email}`);
      toast({
        title: 'Check your email',
        description: "We've sent you a confirmation link.",
      });
    }
    
    const isAlreadyRegisterd = data?.user?.identities?.length == 0
    return { error, isAlreadyRegisterd };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    // Check if MFA challenge is required
    if (data?.user && !data?.session && error?.message?.includes('mfa')) {
      // MFA challenge required
      const challenge = error as any;
      setMfaChallenge(challenge);
      return { error: null, mfaChallenge: challenge };
    }

    if (error) {
      // Log failed login attempt
      AuditLogger.logAuth(
        'unknown',
        'LOGIN_FAILURE',
        `Login failed for ${email}: ${error.message}`,
      );
      toast({
        title: 'Sign in failed',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      // Log successful login
      if (data?.user) {
        AuditLogger.logAuth(data.user.id, 'LOGIN_SUCCESS', `User ${email} logged in successfully`);
      }
      setMfaChallenge(null);
      toast({
        title: 'Welcome back!',
        description: "You've been signed in successfully.",
      });
    }

    return { error };
  };

  const signOut = async () => {
    const currentUserId = user?.id;
    await supabase.auth.signOut();

    // Log logout
    if (currentUserId) {
      AuditLogger.logAuth(currentUserId, 'LOGOUT', 'User logged out');
    }

    setUser(null);
    setSession(null);
    setProfile(null);
    setUserRole(null);
    toast({
      title: 'Signed out',
      description: "You've been signed out successfully.",
    });
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;

    try {
      const { error } = await supabase.from('profiles').update(updates).eq('user_id', user.id);

      if (error) throw error;

      setProfile((prev) => (prev ? { ...prev, ...updates } : null));

      // Log profile update
      AuditLogger.log({
        userId: user.id,
        action: 'PROFILE_UPDATED',
        description: `Profile updated: ${Object.keys(updates).join(', ')}`,
        metadata: { updatedFields: Object.keys(updates) },
      });

      toast({
        title: 'Profile updated',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error: any) {
      toast({
        title: 'Update failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const completeOnboarding = () => {
    setNeedsOnboarding(false);
  };

  const enrollMFA = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) throw error;

      return {
        error: null,
        qr: data.totp.qr_code,
        secret: data.totp.secret,
        factorId: data.id,
      };
    } catch (error: any) {
      toast({
        title: 'MFA enrollment failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const verifyMFA = async (factorId: string, code: string) => {
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: mfaChallenge?.id,
        code,
      });

      if (error) throw error;

      setMfaChallenge(null);
      toast({
        title: 'MFA setup complete',
        description: 'Multi-factor authentication has been enabled.',
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: 'MFA verification failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const challengeMFA = async (factorId: string, code: string) => {
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: mfaChallenge?.id,
        code,
      });

      if (error) throw error;

      setMfaChallenge(null);
      toast({
        title: 'Welcome back!',
        description: 'Successfully signed in with MFA.',
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: 'MFA verification failed',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const unenrollMFA = async (factorId: string) => {
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });

      if (error) throw error;

      toast({
        title: 'MFA disabled',
        description: 'Multi-factor authentication has been disabled.',
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: 'Failed to disable MFA',
        description: error.message,
        variant: 'destructive',
      });
      return { error };
    }
  };

  const getMFAFactors = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();

      if (error) throw error;

      return { error: null, factors: data.totp };
    } catch (error: any) {
      return { error, factors: [] };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        userRole,
        subscriptionInfo,
        loading,
        needsOnboarding,
        mfaChallenge,
        signUp,
        signIn,
        signOut,
        updateProfile,
        completeOnboarding,
        checkSubscription,
        enrollMFA,
        verifyMFA,
        challengeMFA,
        unenrollMFA,
        getMFAFactors,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
