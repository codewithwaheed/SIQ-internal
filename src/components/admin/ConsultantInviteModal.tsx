import React, { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, UserPlus, Shield, X } from "lucide-react";

interface ConsultantInviteModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const expertiseOptions = [
  "ISO 27001",
  "NIST Cybersecurity Framework",
  "SOC 2",
  "HIPAA",
  "GDPR",
  "PCI DSS",
  "FedRAMP",
  "CMMC",
  "SOX",
  "FISMA",
  "COBIT",
  "Risk Assessment",
  "Penetration Testing",
  "Incident Response",
  "Cloud Security",
  "Network Security",
  "Application Security",
  "Identity & Access Management",
  "Data Protection",
  "Vulnerability Management",
];

export const ConsultantInviteModal = ({
  open,
  onClose,
  onSuccess,
}: ConsultantInviteModalProps) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    message: "",
  });
  const [selectedExpertise, setSelectedExpertise] = useState<string[]>([]);
  const { toast } = useToast();

  const handleExpertiseToggle = (expertise: string) => {
    setSelectedExpertise((prev) =>
      prev.includes(expertise)
        ? prev.filter((e) => e !== expertise)
        : [...prev, expertise],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.email || !formData.firstName || !formData.lastName) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (selectedExpertise.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one expertise area",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Not authenticated");
      }

      const { data, error } = await supabase.functions.invoke(
        "invite-consultant",
        {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: {
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            expertise: selectedExpertise,
            message: formData.message,
          },
        },
      );

      if (error) throw error;

      toast({
        title: "Success",
        description: `Invitation sent to ${formData.email}`,
      });

      // Reset form
      setFormData({ email: "", firstName: "", lastName: "", message: "" });
      setSelectedExpertise([]);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Error sending invitation:", error);
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite New Consultant
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a cybersecurity expert to join as a consultant
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="firstName">First Name *</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      firstName: e.target.value,
                    }))
                  }
                  placeholder="Enter first name"
                  required
                />
              </div>

              <div>
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      lastName: e.target.value,
                    }))
                  }
                  placeholder="Enter last name"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, email: e.target.value }))
                }
                placeholder="Enter email address"
                required
              />
            </div>
          </div>

          {/* Expertise Areas */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Expertise Areas *</h3>
            <p className="text-sm text-muted-foreground">
              Select the cybersecurity frameworks and areas this consultant
              specializes in:
            </p>

            <div className="grid grid-cols-2 gap-3 max-h-48 overflow-y-auto p-3 border rounded-lg">
              {expertiseOptions.map((expertise) => (
                <div key={expertise} className="flex items-center space-x-2">
                  <Checkbox
                    id={expertise}
                    checked={selectedExpertise.includes(expertise)}
                    onCheckedChange={() => handleExpertiseToggle(expertise)}
                  />
                  <Label htmlFor={expertise} className="text-sm cursor-pointer">
                    {expertise}
                  </Label>
                </div>
              ))}
            </div>

            {selectedExpertise.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedExpertise.map((expertise) => (
                  <Badge
                    key={expertise}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <Shield className="h-3 w-3" />
                    {expertise}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 ml-1"
                      onClick={() => handleExpertiseToggle(expertise)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Personal Message */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Personal Message</h3>
            <div>
              <Label htmlFor="message">
                Optional message to include in invitation
              </Label>
              <Textarea
                id="message"
                value={formData.message}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, message: e.target.value }))
                }
                placeholder="Add a personal note about why you're inviting this consultant..."
                rows={3}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2"
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Mail className="h-4 w-4" />
              )}
              {loading ? "Sending..." : "Send Invitation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
