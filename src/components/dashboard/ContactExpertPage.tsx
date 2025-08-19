import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Shield, Clock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function ContactExpertPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Simulate form submission
    await new Promise(resolve => setTimeout(resolve, 1000));

    toast({
      title: "Request submitted",
      description: "A cybersecurity expert will contact you within 24 hours.",
    });

    setIsSubmitting(false);
  };

  return (
    <div className="page">
      <div className="page-title">
        <h1 className="text-3xl font-bold tracking-tight">Contact Cybersecurity Expert</h1>
        <p className="text-muted-foreground">
          Connect with our certified cybersecurity professionals for advanced security guidance and support.
        </p>
      </div>

      <div className="grid-2 lg:grid-cols-3">
        <div className="lg:col-span-2 section-card">
          <h2 className="text-xl font-semibold mb-space-2">Request Expert Consultation</h2>
          <p className="text-muted-foreground mb-space-4">
            Fill out the form below and our experts will get back to you promptly.
          </p>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input id="firstName" placeholder="Enter your first name" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input id="lastName" placeholder="Enter your last name" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="Enter your email" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="company">Company Name</Label>
                  <Input id="company" placeholder="Enter your company name" />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgency">Priority Level</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select priority level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low - General inquiry</SelectItem>
                      <SelectItem value="medium">Medium - Business consultation</SelectItem>
                      <SelectItem value="high">High - Security concern</SelectItem>
                      <SelectItem value="critical">Critical - Active threat</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" placeholder="Brief description of your request" required />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Detailed Message</Label>
                  <Textarea 
                    id="message" 
                    placeholder="Please provide details about your cybersecurity needs, current challenges, or specific questions you have..."
                    className="min-h-[120px]"
                    required 
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
            </form>
        </div>

        <div className="flex-gap-4 flex-col">
          <div className="section-card">
            <h3 className="text-lg font-semibold flex items-center gap-space-2 mb-space-4">
              <Shield className="h-5 w-5 text-primary" />
              Expert Support
            </h3>
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <p className="font-medium">Response Time</p>
                  <p className="text-sm text-muted-foreground">
                    Standard: 24 hours<br />
                    Critical: 2 hours
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-muted-foreground mt-1" />
                <div>
                  <p className="font-medium">Emergency Contact</p>
                  <p className="text-sm text-muted-foreground">
                    For immediate security threats, call our 24/7 hotline: +1 (555) 123-CYBER
                  </p>
                </div>
            </div>
          </div>

          <div className="section-card">
            <h3 className="text-lg font-semibold mb-space-4">What We Help With</h3>
              <ul className="space-y-2 text-sm">
                <li>• Security assessments and audits</li>
                <li>• Incident response and investigation</li>
                <li>• Compliance and regulatory guidance</li>
                <li>• Risk management strategies</li>
                <li>• Security architecture review</li>
                <li>• Staff training and awareness</li>
                <li>• Threat intelligence analysis</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}