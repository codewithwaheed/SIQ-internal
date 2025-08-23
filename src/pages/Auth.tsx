import { useState, useEffect } from 'react';
import { Navigate, useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { MFAChallenge } from '@/components/auth/MFAChallenge';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { AuthErrorHandler } from '@/lib/password-validation';
import { ClientRateLimiter } from '@/lib/security';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  Shield,
  Building,
  User,
  Lock,
  Users,
  HeadphonesIcon,
  Mail,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  Zap,
  UserCheck,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
const Auth = () => {
  const { user, session, loading, mfaChallenge, signIn, signUp } = useAuth();
  const [searchParams] = useSearchParams();
  const selectedRole = 'business_owner';
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showMFAChallenge, setShowMFAChallenge] = useState(false);

  const [signupPassword, setSignupPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const [lastError, setLastError] = useState<string | null>(null);

  // Rate limiter for auth attempts
  const rateLimiter = new ClientRateLimiter();

  // Get URL parameters for pricing flow
  const priceId = searchParams.get('priceId');
  const redirect = searchParams.get('redirect');

  // Handle authenticated user with pricing flow
  useEffect(() => {
    if (user && !loading && priceId && redirect === 'checkout') {
      // Redirect to checkout after authentication
      const checkoutFlow = async () => {
        try {
          const { data, error } = await supabase.functions.invoke('create-checkout', {
            body: {
              priceId,
            },
            headers: {
              Authorization: `Bearer ${session?.access_token}`,
            },
          });
          if (error) throw error;

          // Open Stripe checkout in a new tab
          window.open(data.url, '_blank');
          // Redirect to dashboard after opening checkout
          window.location.href = '/dashboard';
        } catch (error: any) {
          console.error('Error creating checkout session:', error);
          toast.error(error.message || 'Failed to create checkout session');
          // Still redirect to dashboard on error
          window.location.href = '/dashboard';
        }
      };
      checkoutFlow();
    }
  }, [user, loading, priceId, redirect]);

  // Regular redirect if already authenticated (no pricing flow)
  if (user && !loading && (!priceId || redirect !== 'checkout')) {
    return <Navigate to="/dashboard" replace />;
  }
  const handleSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLastError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    // Client-side rate limiting
    if (!rateLimiter.checkLimit(`signin_${email}`, 5, 15 * 60 * 1000)) {
      const remaining = rateLimiter.getRemainingAttempts(`signin_${email}`, 5, 15 * 60 * 1000);
      toast.error(`Too many sign-in attempts. Please wait 15 minutes before trying again.`);
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn(email, password);

      // Check if MFA challenge is required
      if (result.mfaChallenge) {
        setShowMFAChallenge(true);
      } else if (result.error) {
        const errorMessage = AuthErrorHandler.getErrorMessage(result.error);
        const suggestedAction = AuthErrorHandler.getSuggestedAction(result.error);
        setLastError(errorMessage);

        toast.error(errorMessage, {
          description: suggestedAction,
          duration: 6000,
        });
      }
    } catch (error) {
      const errorMessage = AuthErrorHandler.getErrorMessage(error);
      setLastError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLastError(null);

    const formEl = e.currentTarget;
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const companyName = formData.get('companyName') as string;

    // Client-side rate limiting for signup
    if (!rateLimiter.checkLimit(`signup_${email}`, 3, 60 * 60 * 1000)) {
      toast.error('Too many signup attempts. Please wait an hour before trying again.');
      return;
    }

    // Validate password strength before submitting
    if (!isPasswordValid) {
      toast.error('Please ensure your password meets all security requirements.');
      return;
    }

    setIsLoading(true);

    try {
      // Build redirect URL with pricing parameters if they exist
      let redirectUrl = `${window.location.origin}/`;
      if (priceId && redirect === 'checkout') {
        redirectUrl = `${
          window.location.origin
        }/auth?priceId=${encodeURIComponent(priceId)}&redirect=checkout`;
      }

      const result: any = await signUp(
        email,
        password,
        {
          first_name: firstName,
          last_name: lastName,
          company_name: companyName,
          role: selectedRole,
        },
        redirectUrl,
      );

      if (result.error) {
        const errorMessage = AuthErrorHandler.getErrorMessage(result.error);
        const suggestedAction = AuthErrorHandler.getSuggestedAction(result.error);
        setLastError(errorMessage);

        toast.error(errorMessage, {
          description: suggestedAction,
          duration: 6000,
        });
      }else{
        formEl.reset();
        setSignupPassword("")

        if(result?.isAlreadyRegisterd){
          toast.error("This email is already registered, Please login")
        }else{
          setSignupSuccess(true);
        }
      }
    } catch (error) {
      const errorMessage = AuthErrorHandler.getErrorMessage(error);
      setLastError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };
  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setResetEmailSent(true);
      toast.success('Password reset email sent! Check your inbox.');
    } catch (error: any) {
      const errorMessage = AuthErrorHandler.getErrorMessage(error);
      toast.error(errorMessage);
    }
    setIsLoading(false);
  };
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show MFA challenge if required
  if (showMFAChallenge || mfaChallenge) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-background p-4">
        <MFAChallenge
          onComplete={() => {
            setShowMFAChallenge(false);
            // Will redirect via auth state change
          }}
          onBack={() => {
            setShowMFAChallenge(false);
          }}
        />
      </div>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center">
            <img
              src="/lovable-uploads/6362c9bd-c403-4a72-abae-4de6f5238518.png"
              alt="SentriQ Labs"
              className="h-12"
            />
          </div>
          <div className="space-y-2">
            <p className="text-muted-foreground">
              AI-powered security insights and expert guidance at your fingertips
            </p>
          </div>
        </div>

        <Card className="border-0 shadow-elevated">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-center text-2xl">{showForgotPassword ? "Reset Password" : "Welcome"}</CardTitle>
            <CardDescription className="text-center">
              {showForgotPassword
                ? 'Enter your email to reset your password'
                : 'Sign in to your account or create a new one'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {signupSuccess ? (
              <div className="space-y-4 text-center">
              <CheckCircle className="h-10 w-10 text-success mx-auto" />
              <h2 className="text-xl font-semibold">Thanks for signing up!</h2>
              <p className="text-muted-foreground">
                We sent a verification link to your email. Please verify to continue.
              </p>
              
              <Button
                variant="ghost"
                className="w-full mt-2"
                onClick={() => setSignupSuccess(false)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Button>
            </div>
            ) : showForgotPassword ? (
              <div className="space-y-4">
                {resetEmailSent ? (
                  <Alert className="border-success bg-success/10">
                    <CheckCircle className="h-4 w-4 text-success" />
                    <AlertDescription className="text-success">
                      Password reset email sent! Check your inbox and follow the instructions.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="reset-email">Email Address</Label>
                      <Input
                        id="reset-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email address"
                        required
                        className="h-11"
                      />
                    </div>
                    <Button type="submit" className="h-11 w-full" disabled={isLoading}>
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                          Sending...
                        </div>
                      ) : (
                        <>
                          <Mail className="mr-2 h-4 w-4" />
                          Send Reset Email
                        </>
                      )}
                    </Button>
                  </form>
                )}
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setResetEmailSent(false);
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Sign In
                </Button>
              </div>
            ) : (
              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid h-11 w-full grid-cols-2">
                  <TabsTrigger
                    onClick={() => setLastError(null)}
                    value="signin"
                    className="text-sm"
                  >
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    onClick={() => setLastError(null)}
                    value="signup"
                    className="text-sm"
                  >
                    Sign Up
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="mt-6">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    {/* Error Display */}
                    {lastError && (
                      <Alert className="border-destructive bg-destructive/10">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <AlertDescription className="text-destructive">
                          {lastError}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="password">Password</Label>
                        <Button
                          type="button"
                          variant="link"
                          className="px-0 text-sm font-normal text-primary hover:text-primary/80"
                          onClick={() => setShowForgotPassword(true)}
                        >
                          Forgot password?
                        </Button>
                      </div>
                      <div className="relative">
                        <Input
                          id="password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter your password"
                          required
                          className="h-11 pr-10"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </div>
                    <Button type="submit" className="h-11 w-full text-base" disabled={isLoading}>
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                          Signing in...
                        </div>
                      ) : (
                        <>
                          <Lock className="mr-2 h-4 w-4" />
                          Sign In
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-6">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    {/* Error Display */}
                    {lastError && (
                      <Alert className="border-destructive bg-destructive/10">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        <AlertDescription className="text-destructive">
                          {lastError}
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          name="firstName"
                          placeholder="John"
                          required
                          className="h-11"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          placeholder="Doe"
                          required
                          className="h-11"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email Address</Label>
                      <Input
                        id="signup-email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        required
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <div className="relative">
                        <Input
                          id="signup-password"
                          name="password"
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Create a secure password"
                          required
                          minLength={12}
                          className="h-11 pr-10"
                          value={signupPassword}
                          onChange={(e) => setSignupPassword(e.target.value)}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>

                      <PasswordStrengthIndicator
                        password={signupPassword}
                        onValidationChange={setIsPasswordValid}
                      />
                    </div>
                    <Button
                      type="submit"
                      className="h-11 w-full text-base"
                      disabled={isLoading || !isPasswordValid}
                    >
                      {isLoading ? (
                        <div className="flex items-center">
                          <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                          Creating account...
                        </div>
                      ) : (
                        <>
                          <User className="mr-2 h-4 w-4" />
                          Create Account
                        </>
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        {/* Trust Signals */}
        <div className="mt-8 space-y-4">
          <div className="flex justify-center space-x-6">
            <Badge
              variant="secondary"
              className="border-green-200 bg-green-100 px-3 py-1 text-green-800"
            >
              <Lock className="mr-1.5 h-3 w-3" />
              SSL Secured
            </Badge>
            <Badge
              variant="secondary"
              className="border-purple-200 bg-purple-100 px-3 py-1 text-purple-800"
            >
              <CreditCard className="mr-1.5 h-3 w-3" />
              Stripe Secured
            </Badge>
          </div>

          <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
            <div className="flex items-center">
              <UserCheck className="mr-1.5 h-4 w-4 text-green-600" />
              <span>No data shared</span>
            </div>
            <div className="flex items-center">
              <Zap className="mr-1.5 h-4 w-4 text-blue-600" />
              <span>Instant setup</span>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>
            By creating an account, you agree to our{' '}
            <Link to="/terms-of-service" className="text-primary hover:underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Auth;
