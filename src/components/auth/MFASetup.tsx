import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { QrCode, Copy, CheckCircle, Shield } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface MFASetupProps {
  onComplete: () => void;
  onCancel: () => void;
}

export const MFASetup = ({ onComplete, onCancel }: MFASetupProps) => {
  const { enrollMFA, verifyMFA } = useAuth();
  const [step, setStep] = useState<'enroll' | 'verify'>('enroll');
  const [qrCode, setQrCode] = useState<string>('');
  const [secret, setSecret] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleEnroll = async () => {
    setLoading(true);
    try {
      const { error, qr, secret, factorId } = await enrollMFA();
      
      if (error) {
        console.error('MFA enrollment error:', error);
        // Show user-friendly error message
        alert('Failed to set up MFA. Please try again or contact support.');
        return;
      }

      // Enhanced validation - no fallbacks for security
      if (!qr || !secret || !factorId) {
        console.error('Invalid MFA enrollment response - missing required data');
        alert('MFA setup failed: incomplete response from server. Please try again.');
        return;
      }

      // Validate factor ID format (should be UUID or similar)
      if (typeof factorId !== 'string' || factorId.length < 10) {
        console.error('Invalid MFA factor ID format');
        alert('MFA setup failed: invalid factor ID received. Please try again.');
        return;
      }

      // Validate secret key format (should be base32 for TOTP)
      if (!/^[A-Z2-7]{16,}$/.test(secret)) {
        console.error('Invalid MFA secret format');
        alert('MFA setup failed: invalid secret format. Please try again.');
        return;
      }

      // Validate QR code format
      if (!qr.startsWith('data:image/') && !qr.startsWith('otpauth://')) {
        console.error('Invalid QR code format');
        alert('MFA setup failed: invalid QR code format. Please try again.');
        return;
      }

      setQrCode(qr);
      setSecret(secret);
      setFactorId(factorId);
      setStep('verify');
    } catch (error) {
      console.error('MFA enrollment failed:', error);
      alert('MFA setup failed due to an unexpected error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await verifyMFA(factorId, code);
      
      if (!error) {
        onComplete();
      }
    } catch (error) {
      console.error('MFA verification failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (step === 'enroll') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Shield className="h-12 w-12 text-primary" />
          </div>
          <CardTitle>Enable Two-Factor Authentication</CardTitle>
          <CardDescription>
            Add an extra layer of security to your account with TOTP-based MFA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              You'll need an authenticator app like Google Authenticator, Authy, or 1Password to generate codes.
            </AlertDescription>
          </Alert>
          
          <div className="flex space-x-2">
            <Button onClick={handleEnroll} disabled={loading} className="flex-1">
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <QrCode className="mr-2 h-4 w-4" />
              )}
              Set Up MFA
            </Button>
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle>Scan QR Code</CardTitle>
        <CardDescription>
          Use your authenticator app to scan this QR code
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {qrCode && (
          <div className="text-center">
            <div className="inline-block p-4 bg-white rounded-lg border">
              <img 
                src={qrCode} 
                alt="MFA Setup QR Code" 
                className="w-48 h-48 mx-auto"
                onError={(e) => {
                  console.error('QR code failed to load');
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          <Label>Manual Setup Key</Label>
          <div className="flex items-center space-x-2">
            <Input value={secret} readOnly className="font-mono text-sm" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={copySecret}
            >
              {copied ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Use this key if you can't scan the QR code
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="code">Verification Code</Label>
            <Input
              id="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              pattern="[0-9]{6}"
              required
            />
          </div>
          
          <div className="flex space-x-2">
            <Button type="submit" disabled={loading || code.length !== 6} className="flex-1">
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : null}
              Verify & Enable
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};