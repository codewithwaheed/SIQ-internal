import { Navigation } from "@/components/ui/navigation";
import { Footer } from "@/components/ui/footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
const ConsultantSignup = () => {
  const {
    toast
  } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm({
    defaultValues: {
      fullName: "",
      email: "",
      phone: "",
      linkedin: "",
      experience: "",
      expertise: [],
      certifications: [],
      otherExpertise: "",
      otherCertifications: "",
      smbExperience: "",
      vcisoExperience: "",
      timezone: "",
      availability: "",
      workAuthorization: "",
      securityClearance: "",
      engagementPreference: [],
      resume: null,
      portfolio: "",
      references: "",
      backgroundCheck: "",
      ndaAgreement: "",
      additionalInfo: ""
    }
  });
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    try {
      // Collect form data and convert to proper format
      const formData = {
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        linkedin: data.linkedin,
        experienceYears: data.experience,
        expertiseAreas: data.expertise || [],
        certifications: data.certifications || [],
        otherExpertise: data.otherExpertise,
        otherCertifications: data.otherCertifications,
        smbExperience: data.smbExperience === 'yes',
        vcisoExperience: data.vcisoExperience === 'yes',
        timezone: data.timezone,
        availabilityHours: data.availability,
        workAuthorization: data.workAuthorization,
        securityClearance: data.securityClearance,
        engagementPreferences: data.engagementPreference || [],
        resumeUrl: data.resume,
        portfolioUrl: data.portfolio,
        testimonials: data.references,
        backgroundCheckConsent: data.backgroundCheck === 'yes',
        ndaAgreement: data.ndaAgreement === 'yes',
        additionalInfo: data.additionalInfo
      };

      const { data: result, error } = await supabase.functions.invoke('submit-consultant-application', {
        body: formData
      });

      if (error) throw error;

      toast({
        title: "Application Submitted Successfully!",
        description: "Thank you for your interest! We'll review your application and get back to you within 3-5 business days."
      });

      // Reset form
      form.reset();
      
    } catch (error: any) {
      console.error('Submission error:', error);
      toast({
        title: "Error",
        description: error.message || "There was an error submitting your application. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  return <div className="min-h-screen bg-background animate-fade-in">
      <Navigation />
      
      <main className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-4xl font-bold text-foreground mb-6">
              SentrIQ Consultant Application
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Join our trusted network of cybersecurity professionals supporting SMBs with meaningful, flexible work.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 animate-fade-in" style={{
            animationDelay: '300ms'
          }}>
              
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                  <CardDescription>Tell us about yourself</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="fullName" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Full Name *</FormLabel>
                        <FormControl>
                          <Input placeholder="John Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                  
                  <FormField control={form.control} name="email" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Email Address *</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="john@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                  
                  <FormField control={form.control} name="phone" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Phone Number (optional)</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder="(555) 123-4567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                  
                  <FormField control={form.control} name="linkedin" render={({
                  field
                }) => <FormItem>
                        <FormLabel>LinkedIn Profile (optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://linkedin.com/in/johndoe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </CardContent>
              </Card>

              {/* Experience & Background */}
              <Card>
                <CardHeader>
                  <CardTitle>Experience & Background</CardTitle>
                  <CardDescription>Share your cybersecurity expertise</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">Years of Cybersecurity Experience *</Label>
                    <div className="mt-2 space-y-2">
                      {['0–2', '3–5', '6–10', '10+'].map(option => <div key={option} className="flex items-center space-x-2">
                          <Checkbox id={`exp-${option}`} />
                          <Label htmlFor={`exp-${option}`}>{option}</Label>
                        </div>)}
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Primary Areas of Expertise (check all that apply) *</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {['NIST 800-171', 'NIST 800-53', 'CMMC (Level 1)', 'CMMC (Level 2 or Provisional Assessor)', 'SOC 2', 'FedRAMP', 'HIPAA', 'ISO 27001', 'Risk Management / GRC', 'Security Assessments', 'Policy & Procedure Development'].map(expertise => <div key={expertise} className="flex items-center space-x-2">
                          <Checkbox id={`expertise-${expertise}`} />
                          <Label htmlFor={`expertise-${expertise}`} className="text-sm">{expertise}</Label>
                        </div>)}
                    </div>
                    <div className="mt-4">
                      <FormField control={form.control} name="otherExpertise" render={({
                      field
                    }) => <FormItem>
                            <FormLabel>Other Expertise</FormLabel>
                            <FormControl>
                              <Input placeholder="Specify other areas of expertise" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Certifications (select all that apply)</Label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {['CISSP', 'CISM', 'CCSP', 'CISA', 'PMP', 'CEH'].map(cert => <div key={cert} className="flex items-center space-x-2">
                          <Checkbox id={`cert-${cert}`} />
                          <Label htmlFor={`cert-${cert}`} className="text-sm">{cert}</Label>
                        </div>)}
                    </div>
                    <div className="mt-4">
                      <FormField control={form.control} name="otherCertifications" render={({
                      field
                    }) => <FormItem>
                            <FormLabel>Other Certifications</FormLabel>
                            <FormControl>
                              <Input placeholder="List other relevant certifications" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Have you worked with SMBs under 300 employees? *</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="radio" id="smb-yes" name="smbExperience" value="yes" />
                        <Label htmlFor="smb-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="radio" id="smb-no" name="smbExperience" value="no" />
                        <Label htmlFor="smb-no">No</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">Have you served as a vCISO or cybersecurity advisor? *</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="radio" id="vciso-yes" name="vcisoExperience" value="yes" />
                        <Label htmlFor="vciso-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="radio" id="vciso-no" name="vcisoExperience" value="no" />
                        <Label htmlFor="vciso-no">No</Label>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Availability & Logistics */}
              <Card>
                <CardHeader>
                  <CardTitle>Availability & Logistics</CardTitle>
                  <CardDescription>Help us understand your availability and preferences</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="timezone" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Timezone / Preferred Working Hours *</FormLabel>
                        <FormControl>
                          <Input placeholder="EST, 9 AM - 5 PM" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <div>
                    <Label className="text-base font-medium">Typical Availability Per Week *</Label>
                    <div className="mt-2 space-y-2">
                      {['<5 hours', '5–10 hours', '10–20 hours', '20+ hours'].map(hours => <div key={hours} className="flex items-center space-x-2">
                          <Checkbox id={`hours-${hours}`} />
                          <Label htmlFor={`hours-${hours}`}>{hours}</Label>
                        </div>)}
                    </div>
                  </div>

                  

                  

                  <div>
                    <Label className="text-base font-medium">Engagement Preference *</Label>
                    <div className="mt-2 space-y-2">
                      {['One-time consultations', 'Recurring support', 'Both'].map(pref => <div key={pref} className="flex items-center space-x-2">
                          <Checkbox id={`pref-${pref}`} />
                          <Label htmlFor={`pref-${pref}`}>{pref}</Label>
                        </div>)}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Supporting Materials */}
              <Card>
                <CardHeader>
                  <CardTitle>Supporting Materials</CardTitle>
                  <CardDescription>Share your professional background</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="resume" className="text-base font-medium">Upload Resume or CV (PDF or DOCX)</Label>
                    <Input id="resume" type="file" accept=".pdf,.docx" className="mt-2" />
                  </div>

                  <FormField control={form.control} name="portfolio" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Portfolio or Work Samples (link)</FormLabel>
                        <FormControl>
                          <Input placeholder="https://yourportfolio.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="references" render={({
                  field
                }) => <FormItem>
                        <FormLabel>References or Testimonials (optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Provide contact information for references or paste testimonials" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </CardContent>
              </Card>

              {/* Legal & Final Steps */}
              <Card>
                <CardHeader>
                  <CardTitle>Legal & Final Steps</CardTitle>
                  <CardDescription>Final requirements to complete your application</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label className="text-base font-medium">Do you agree to a background check if requested? *</Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="radio" id="bg-yes" name="backgroundCheck" value="yes" />
                        <Label htmlFor="bg-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="radio" id="bg-no" name="backgroundCheck" value="no" />
                        <Label htmlFor="bg-no">No</Label>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-base font-medium">
                      Do you agree to the{' '}
                      <Link to="/nda" className="text-accent hover:underline">SentrIQ NDA</Link>
                      {' '}and{' '}
                      <Link to="/code-of-conduct" className="text-accent hover:underline">Code of Conduct</Link>? *
                    </Label>
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center space-x-2">
                        <input type="radio" id="nda-yes" name="ndaAgreement" value="yes" />
                        <Label htmlFor="nda-yes">Yes</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <input type="radio" id="nda-no" name="ndaAgreement" value="no" />
                        <Label htmlFor="nda-no">No</Label>
                      </div>
                    </div>
                  </div>

                  <FormField control={form.control} name="additionalInfo" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Anything else you'd like us to know?</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Share any additional information that would help us understand your background and interest in joining SentrIQ" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />
                </CardContent>
              </Card>

              <div className="text-center">
                <Button type="submit" size="lg" disabled={isSubmitting} className="w-full sm:w-auto">
                  {isSubmitting ? "Submitting..." : "Submit Application"}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </main>

      <Footer />
    </div>;
};
export default ConsultantSignup;