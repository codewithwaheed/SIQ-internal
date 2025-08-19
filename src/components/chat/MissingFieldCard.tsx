import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";
import { getFieldHelp } from "@/config/fieldHelp";

type MissingField = {
  key: string;
  label: string;
  placeholder?: string;
};

interface MissingFieldCardProps {
  fields: MissingField[];
  onSubmit: (answers: Record<string, string>) => void;
  onDefaults: () => void;
  isLoading?: boolean;
}

export function MissingFieldCard({
  fields,
  onSubmit,
  onDefaults,
  isLoading = false,
}: MissingFieldCardProps) {
  const [draft, setDraft] = useState<Record<string, string>>({});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(draft);
  };

  const hasValues = Object.keys(draft).length > 0;

  return (
    <Card className="missing-card max-w-lg mx-auto">
      <CardContent className="p-4 space-y-4">
        <p className="text-sm text-muted-foreground">
          Please provide {fields.length}{" "}
          {fields.length > 1 ? "details" : "detail"}:
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {fields.map((field) => (
            <div key={field.key} className="field-row space-y-2">
              <div className="flex items-center gap-2">
                <Label htmlFor={field.key} className="text-sm font-medium">
                  {field.label}
                </Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
                      aria-label={`Help for ${field.label}`}
                    >
                      <HelpCircle className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-80 text-sm p-3"
                    side="top"
                    align="start"
                    sideOffset={5}
                  >
                    {getFieldHelp(field.key)}
                  </PopoverContent>
                </Popover>
              </div>
              <Input
                id={field.key}
                type="text"
                placeholder={field.placeholder || "Enter value…"}
                value={draft[field.key] || ""}
                onChange={(e) =>
                  setDraft({ ...draft, [field.key]: e.target.value })
                }
                className="w-full"
              />
            </div>
          ))}

          <div className="btn-row flex gap-3 justify-end pt-2 max-sm:flex-col">
            <Button
              type="button"
              variant="outline"
              onClick={onDefaults}
              disabled={isLoading}
              className="max-sm:w-full"
            >
              Use best-practice defaults
            </Button>
            <Button
              type="submit"
              disabled={!hasValues || isLoading}
              className="max-sm:w-full"
            >
              {isLoading ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Helper function to get placeholder text for common fields
export function getFieldPlaceholder(fieldKey: string): string {
  const placeholders: Record<string, string> = {
    min_password_length: "e.g., 12",
    password_complexity: "e.g., uppercase, lowercase, numbers",
    password_expiry_days: "e.g., 90",
    company_name: "Your organization name",
    company_email: "security@yourcompany.com",
    incident_contact_email: "security@yourcompany.com",
    escalation_timeframe: "e.g., 2 hours",
    device_encryption_required: "Yes/No",
    monitoring_enabled: "Yes/No",
  };

  return placeholders[fieldKey] || "Enter value…";
}
