import { UnifiedHeader } from '@/components/ui/unified-header';
import { Footer } from '@/components/ui/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, Heart, Users } from 'lucide-react';

const HIPAA = () => {
  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader context="public" showAuth />

      <main className="pb-12 pt-24">
        <div className="mx-auto max-w-4xl px-6">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <Badge variant="secondary" className="mb-4">
              <Heart className="mr-1 h-3 w-3" />
              Healthcare Privacy
            </Badge>
            <h1 className="mb-4 text-4xl font-bold tracking-tight">HIPAA Compliance</h1>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Health Insurance Portability and Accountability Act - Protecting patient health
              information
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
                HIPAA is a federal law that protects the privacy and security of protected health
                information (PHI). It applies to covered entities and business associates who handle
                PHI in the healthcare industry.
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="mb-3 flex items-center gap-2 font-semibold">
                    <Users className="h-4 w-4" />
                    Covered Entities
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Healthcare providers
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Health plans
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Healthcare clearinghouses
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="mb-3 flex items-center gap-2 font-semibold">
                    <Users className="h-4 w-4" />
                    Business Associates
                  </h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                      IT service providers
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                      Billing companies
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
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
                  <h4 className="mb-2 font-semibold">Privacy Rule</h4>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Establishes national standards for protecting PHI and gives patients rights over
                    their health information.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Minimum necessary standard
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Patient access rights
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Administrative safeguards
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="mb-2 font-semibold">Security Rule</h4>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Sets standards for protecting electronic PHI (ePHI) through administrative,
                    physical, and technical safeguards.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Access controls and encryption
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Audit logs and monitoring
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Data integrity and transmission security
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="mb-2 font-semibold">Breach Notification Rule</h4>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Requires notification of breaches of unsecured PHI to patients, HHS, and
                    sometimes the media.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      60-day notification to patients
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      60-day notification to HHS
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Media notification for large breaches
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <h4 className="mb-2 font-semibold">Omnibus Rule</h4>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Implements provisions of the HITECH Act and strengthens privacy and security
                    protections.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Business associate liability
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Genetic information protection
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
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
              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <Users className="h-6 w-6 text-blue-700" />
                  </div>
                  <h4 className="mb-2 font-semibold">Administrative</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Security officer</li>
                    <li>Workforce training</li>
                    <li>Access management</li>
                    <li>Contingency planning</li>
                  </ul>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <Shield className="h-6 w-6 text-green-700" />
                  </div>
                  <h4 className="mb-2 font-semibold">Physical</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>Facility access controls</li>
                    <li>Workstation use</li>
                    <li>Device controls</li>
                    <li>Media controls</li>
                  </ul>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <Heart className="h-6 w-6 text-purple-700" />
                  </div>
                  <h4 className="mb-2 font-semibold">Technical</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
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
              <h3 className="mb-4 text-2xl font-bold">Ensure HIPAA Compliance</h3>
              <p className="mb-6 text-muted-foreground">
                Get comprehensive guidance on HIPAA requirements, risk assessments, and compliance
                strategies.
              </p>
              <div className="flex flex-col justify-center gap-4 sm:flex-row">
                <a
                  href="/#chat"
                  className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Start Free Chat
                </a>
                <a
                  href="/auth"
                  className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
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
