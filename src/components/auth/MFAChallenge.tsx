import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface MFAChallengeProps {
  onComplete: () => void;
  onBack: () => void;
}

export const MFAChallenge = ({ onComplete, onBack }: MFAChallengeProps) => {
  const { challengeMFA, mfaChallenge } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Enhanced security validation - no hardcoded fallbacks
      if (!mfaChallenge?.factorId) {
        console.error("No MFA challenge factor ID available");
        alert(
          "MFA verification failed: No valid challenge found. Please try signing in again.",
        );
        onBack();
        return;
      }

      // Validate code format
      if (!/^\d{6}$/.test(code)) {
        console.error("Invalid MFA code format");
        alert("Please enter a valid 6-digit authentication code.");
        return;
      }

      const { error } = await challengeMFA(mfaChallenge.factorId, code);

      if (error) {
        console.error("MFA challenge error:", error);
        alert(
          "Authentication code verification failed. Please check your code and try again.",
        );
        return;
      }

      onComplete();
    } catch (error) {
      console.error("MFA challenge failed:", error);
      alert(
        "MFA verification failed due to an unexpected error. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-4">
          <Shield className="h-12 w-12 text-primary" />
        </div>
        <CardTitle>Two-Factor Authentication</CardTitle>
        <CardDescription>
          Enter the 6-digit code from your authenticator app
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Open your authenticator app and enter the current 6-digit code for
            your account.
          </AlertDescription>
        </Alert>

        <form onSubmit={handleVerify} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mfa-code">Authentication Code</Label>
            <Input
              id="mfa-code"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              placeholder="000000"
              className="text-center text-lg tracking-widest font-mono"
              maxLength={6}
              autoComplete="one-time-code"
              autoFocus
              required
            />
          </div>

          <div className="flex space-x-2">
            <Button
              type="submit"
              disabled={loading || code.length !== 6}
              className="flex-1"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : null}
              Verify Code
            </Button>
            <Button type="button" variant="outline" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </div>
        </form>

        <p className="text-xs text-center text-muted-foreground">
          Having trouble? Make sure your device's time is synchronized and try a
          new code.
        </p>
      </CardContent>
    </Card>
  );
};
