import { useState, useEffect } from "react";
import { PasswordValidator } from "@/lib/password-validation";
import { Progress } from "@/components/ui/progress";
import { Check, X, AlertTriangle } from "lucide-react";

interface PasswordStrengthIndicatorProps {
  password: string;
  onValidationChange?: (isValid: boolean) => void;
}

export const PasswordStrengthIndicator = ({
  password,
  onValidationChange,
}: PasswordStrengthIndicatorProps) => {
  const [validation, setValidation] = useState(PasswordValidator.validate(""));

  useEffect(() => {
    const result = PasswordValidator.validate(password);
    setValidation(result);
    onValidationChange?.(result.isValid);
  }, [password, onValidationChange]);

  if (!password) return null;

  const indicator = PasswordValidator.getStrengthIndicator(validation);

  return (
    <div className="space-y-3 mt-2">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            Password Strength
          </span>
          <span className={`text-xs font-medium ${indicator.color}`}>
            {indicator.text}
          </span>
        </div>
        <Progress
          value={indicator.percentage}
          className="h-2"
          style={{
            backgroundColor: "hsl(var(--muted))",
          }}
        />
      </div>

      {/* Requirements Checklist */}
      <div className="space-y-1">
        <div className="text-xs text-muted-foreground font-medium">
          Requirements:
        </div>
        <div className="grid grid-cols-1 gap-1 text-xs">
          <RequirementItem
            met={password.length >= 14}
            text="At least 14 characters"
          />
          <RequirementItem
            met={/[A-Z]/.test(password)}
            text="One uppercase letter"
          />
          <RequirementItem
            met={/[a-z]/.test(password)}
            text="One lowercase letter"
          />
          <RequirementItem met={/[0-9]/.test(password)} text="One number" />
          <RequirementItem
            met={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)}
            text="One special character"
          />
        </div>
      </div>

      {/* Security Warnings */}
      {validation.errors.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center text-xs text-red-600">
            <AlertTriangle className="h-3 w-3 mr-1" />
            Security Issues:
          </div>
          <div className="space-y-1">
            {validation.errors.map((error, index) => (
              <div
                key={index}
                className="flex items-start text-xs text-red-600"
              >
                <X className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Compromised Password Warning */}
      {password && PasswordValidator.checkCompromised(password) && (
        <div className="flex items-start text-xs text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
          <AlertTriangle className="h-3 w-3 mr-1 mt-0.5 flex-shrink-0" />
          <span>
            This password appears to follow a common pattern and may be easily
            guessed.
          </span>
        </div>
      )}
    </div>
  );
};

interface RequirementItemProps {
  met: boolean;
  text: string;
}

const RequirementItem = ({ met, text }: RequirementItemProps) => (
  <div className="flex items-center space-x-2">
    {met ? (
      <Check className="h-3 w-3 text-green-600" />
    ) : (
      <X className="h-3 w-3 text-red-400" />
    )}
    <span className={met ? "text-green-600" : "text-muted-foreground"}>
      {text}
    </span>
  </div>
);
