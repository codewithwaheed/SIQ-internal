import { UnifiedHeader } from "@/components/ui/unified-header";
import { Footer } from "@/components/ui/footer";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Shield, Heart, Users } from "lucide-react";

const HIPAA = () => {
  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader context="public" showAuth />

      <main className="pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              <Heart className="h-3 w-3 mr-1" />
              Healthcare Privacy
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              HIPAA Compliance
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Health Insurance Portability and Accountability Act - Protecting
              patient health information
            </p>
          </div>

          {/* Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                What is HIPAA?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                HIPAA is a federal law that protects the privacy and security of
                protected health information (PHI). It applies to covered
                entities and business associates who handle PHI in the
                healthcare industry.
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Covered Entities
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Healthcare providers
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Health plans
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Healthcare clearinghouses
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Business Associates
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      IT service providers
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      Billing companies
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      Cloud service providers
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* HIPAA Rules */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>HIPAA Rules & Requirements</CardTitle>
              <CardDescription>
                Understanding the key components of HIPAA compliance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="font-semibold mb-2">Privacy Rule</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Establishes national standards for protecting PHI and gives
                    patients rights over their health information.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Minimum necessary standard
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Patient access rights
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Administrative safeguards
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold mb-2">Security Rule</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Sets standards for protecting electronic PHI (ePHI) through
                    administrative, physical, and technical safeguards.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Access controls and encryption
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Audit logs and monitoring
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Data integrity and transmission security
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold mb-2">
                    Breach Notification Rule
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Requires notification of breaches of unsecured PHI to
                    patients, HHS, and sometimes the media.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      60-day notification to patients
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      60-day notification to HHS
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Media notification for large breaches
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="font-semibold mb-2">Omnibus Rule</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Implements provisions of the HITECH Act and strengthens
                    privacy and security protections.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Business associate liability
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Genetic information protection
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Individual authorization requirements
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Safeguards */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Required Safeguards</CardTitle>
              <CardDescription>
                Three types of safeguards required by the HIPAA Security Rule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Users className="h-6 w-6 text-blue-700" />
                  </div>
                  <h4 className="font-semibold mb-2">Administrative</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Security officer</li>
                    <li>Workforce training</li>
                    <li>Access management</li>
                    <li>Contingency planning</li>
                  </ul>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Shield className="h-6 w-6 text-green-700" />
                  </div>
                  <h4 className="font-semibold mb-2">Physical</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Facility access controls</li>
                    <li>Workstation use</li>
                    <li>Device controls</li>
                    <li>Media controls</li>
                  </ul>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Heart className="h-6 w-6 text-purple-700" />
                  </div>
                  <h4 className="font-semibold mb-2">Technical</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>Access control</li>
                    <li>Audit controls</li>
                    <li>Integrity</li>
                    <li>Transmission security</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">
                Ensure HIPAA Compliance
              </h3>
              <p className="text-muted-foreground mb-6">
                Get comprehensive guidance on HIPAA requirements, risk
                assessments, and compliance strategies.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a
                  href="/#chat"
                  className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-6 py-3 text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Start Free Chat
                </a>
                <a
                  href="/auth"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
                >
                  Get Full Access
                </a>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default HIPAA;
