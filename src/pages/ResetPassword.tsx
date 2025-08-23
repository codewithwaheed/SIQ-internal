import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { PasswordStrengthIndicator } from '@/components/auth/PasswordStrengthIndicator';
import { ClientRateLimiter } from '@/lib/security';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  Zap,
  UserCheck,
  CreditCard,
  AlertTriangle,
} from 'lucide-react';
const Auth = () => {
  const { loading } = useAuth();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [signupPassword, setSignupPassword] = useState('');
  const [isPasswordValid, setIsPasswordValid] = useState(false);

  const [lastError, setLastError] = useState<string | null>(null);

  // Rate limiter for auth attempts
  const rateLimiter = new ClientRateLimiter();

  useEffect(() => {
    // Supabase automatically handles the token from the URL fragment
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        console.log("Password recovery mode active");
      }
    });
  }, []);

  const handleSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLastError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;

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
    const { error } = await supabase.auth.updateUser({ password: signupPassword });

    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Password updated successfully!");
      window.location.href = '/auth';
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-background">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
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
            <CardTitle className="text-center text-2xl">Reset Password</CardTitle>
            <CardDescription className="text-center">
            Reset your password
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                        <>
                          <User className="mr-2 h-4 w-4" />
                          Reset Password
                        </>
                    
                    </Button>
                  </form>
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