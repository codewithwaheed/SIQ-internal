import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Plus, Trash2, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { MFASetup } from "@/components/auth/MFASetup";

export const MFASettings = () => {
  const { getMFAFactors, unenrollMFA } = useAuth();
  const [factors, setFactors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);

  const loadFactors = async () => {
    const { error, factors: mfaFactors } = await getMFAFactors();
    if (!error && mfaFactors) {
      setFactors(mfaFactors);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const handleRemoveFactor = async (factorId: string) => {
    // Confirm before removing MFA
    if (
      !confirm(
        "Are you sure you want to disable MFA? This will reduce your account security.",
      )
    ) {
      return;
    }

    setLoading(true);
    try {
      const { error } = await unenrollMFA(factorId);
      if (!error) {
        setFactors(factors.filter((f) => f.id !== factorId));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSetupComplete = () => {
    setShowSetup(false);
    loadFactors();
  };

  if (showSetup) {
    return (
      <MFASetup
        onComplete={handleSetupComplete}
        onCancel={() => setShowSetup(false)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <Shield className="mr-2 h-5 w-5" />
              Two-Factor Authentication
            </CardTitle>
            <CardDescription>
              Add an extra layer of security to your account
            </CardDescription>
          </div>
          <Button
            onClick={() => setShowSetup(true)}
            disabled={factors.length > 0}
          >
            <Plus className="mr-2 h-4 w-4" />
            Enable MFA
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
          </div>
        ) : factors.length > 0 ? (
          <div className="space-y-3">
            <Alert>
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Two-factor authentication is enabled and protecting your
                account.
              </AlertDescription>
            </Alert>

            {factors.map((factor) => (
              <div
                key={factor.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center space-x-3">
                  <Shield className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Authenticator App</p>
                    <p className="text-sm text-muted-foreground">
                      TOTP - {factor.friendly_name || "Primary authenticator"}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-green-100 text-green-800"
                  >
                    Active
                  </Badge>
                </div>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleRemoveFactor(factor.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              Two-factor authentication is not enabled. We recommend enabling
              MFA to secure your account.
            </AlertDescription>
          </Alert>
        )}

        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            <strong>What is Two-Factor Authentication?</strong>
          </p>
          <p>
            MFA adds an extra layer of security by requiring a second form of
            authentication in addition to your password. Even if someone gets
            your password, they won't be able to access your account without the
            authentication code from your device.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};
