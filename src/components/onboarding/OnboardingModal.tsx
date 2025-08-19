import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface OnboardingModalProps {
  open: boolean;
  onComplete: () => void;
}

const countries = [
  "United States",
  "Canada",
  "United Kingdom",
  "Australia",
  "Germany",
  "France",
  "Japan",
  "South Korea",
  "Singapore",
  "Netherlands",
  "Switzerland",
  "Sweden",
  "Norway",
  "Denmark",
  "Finland",
  "New Zealand",
  "Ireland",
  "Austria",
  "Belgium",
  "Luxembourg",
];

export const OnboardingModal = ({ open, onComplete }: OnboardingModalProps) => {
  const [step, setStep] = useState(1);
  const [country, setCountry] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleNext = () => {
    if (!country) {
      toast({
        title: "Please select a country",
        variant: "destructive",
      });
      return;
    }
    setStep(2);
  };

  const handleComplete = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          country,
          company_name: companyName || null,
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Profile updated successfully!",
        description: "Welcome to your personalized experience.",
      });

      onComplete();
    } catch (error) {
      console.error("Error updating profile:", error);
      toast({
        title: "Error updating profile",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md [&>button]:hidden">
        <DialogHeader className="sr-only">
          <DialogTitle>Onboarding</DialogTitle>
          <DialogDescription>
            Complete your profile setup to personalize your experience
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <h2 className="text-xl font-semibold text-foreground">
                Make SentrIQ Smarter for You
              </h2>
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              {step === 1
                ? "Answer a few questions to boost AI's accuracy"
                : "Answer a few questions to boost AI's accuracy"}
            </p>
          </div>

          {step === 1 ? (
            /* Step 1: Country Selection */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-medium">
                  Country
                </Label>
                <p className="text-xs text-muted-foreground">
                  Helps us apply the right legal framework based on your
                  location.
                </p>
                <Select value={country} onValueChange={setCountry}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleNext} disabled={!country}>
                  Next
                </Button>
              </div>
            </div>
          ) : (
            /* Step 2: Company Name */
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="company" className="text-sm font-medium">
                  Company name (optional)
                </Label>
                <p className="text-xs text-muted-foreground">
                  Used to auto-fill your business name in relevant documents
                </p>
                <Input
                  id="company"
                  placeholder="Acme Inc"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Go back
                </Button>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={handleComplete}
                    disabled={loading}
                  >
                    Skip
                  </Button>
                  <Button onClick={handleComplete} disabled={loading}>
                    {loading ? "Saving..." : "Save and Exit"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
