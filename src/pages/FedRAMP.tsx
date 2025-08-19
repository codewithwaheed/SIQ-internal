import { UnifiedHeader } from '@/components/ui/unified-header';
import { Footer } from '@/components/ui/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, Cloud, Lock } from 'lucide-react';

const FedRAMP = () => {
  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader context="public" showAuth />

      <main className="pb-12 pt-24">
        <div className="mx-auto max-w-4xl px-6">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <Badge variant="secondary" className="mb-4">
              <Cloud className="mr-1 h-3 w-3" />
              Cloud Security Authorization
            </Badge>
            <h1 className="mb-4 text-4xl font-bold tracking-tight">FedRAMP Compliance</h1>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Federal Risk and Authorization Management Program for cloud service providers
            </p>
          </div>

          {/* Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                What is FedRAMP?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                FedRAMP is a government-wide program that provides a standardized approach to
                security assessment, authorization, and continuous monitoring for cloud products and
                services used by federal agencies.
              </p>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <Lock className="h-6 w-6 text-green-700" />
                  </div>
                  <h4 className="mb-2 font-semibold">Low Impact</h4>
                  <p className="text-sm text-muted-foreground">
                    Basic security controls for low-risk systems
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                    <Lock className="h-6 w-6 text-yellow-700" />
                  </div>
                  <h4 className="mb-2 font-semibold">Moderate Impact</h4>
                  <p className="text-sm text-muted-foreground">
                    Enhanced controls for moderate-risk systems
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
                    <Lock className="h-6 w-6 text-red-700" />
                  </div>
                  <h4 className="mb-2 font-semibold">High Impact</h4>
                  <p className="text-sm text-muted-foreground">
                    Rigorous controls for high-risk systems
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Authorization Paths */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>FedRAMP Authorization Paths</CardTitle>
              <CardDescription>
                Three primary paths to achieve FedRAMP authorization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h4 className="mb-2 font-semibold">Joint Authorization Board (JAB) P-ATO</h4>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Provisional Authorization to Operate granted by the JAB for cloud services with
                    widespread government use.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      High-impact, widely-used cloud services
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Most rigorous review process
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="mb-2 font-semibold">Agency ATO</h4>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Authorization to Operate granted by a federal agency for their specific use.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Agency-specific authorization
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Can be leveraged by other agencies
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="mb-2 font-semibold">FedRAMP Connect</h4>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Process for CSPs to work directly with agencies to achieve authorization.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Direct agency partnership
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Streamlined authorization process
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Control Families */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Security Control Families</CardTitle>
              <CardDescription>
                FedRAMP leverages NIST 800-53 security controls organized into families
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  'Access Control (AC)',
                  'Awareness and Training (AT)',
                  'Audit and Accountability (AU)',
                  'Security Assessment (CA)',
                  'Configuration Management (CM)',
                  'Contingency Planning (CP)',
                  'Identification and Authentication (IA)',
                  'Incident Response (IR)',
                  'Maintenance (MA)',
                  'Media Protection (MP)',
                  'Physical and Environmental Protection (PE)',
                  'Planning (PL)',
                  'Personnel Security (PS)',
                  'Risk Assessment (RA)',
                  'System and Services Acquisition (SA)',
                  'System and Communications Protection (SC)',
                  'System and Information Integrity (SI)',
                  'Program Management (PM)',
                ].map((control, index) => (
                  <div key={index} className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                    <Shield className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{control}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="mb-4 text-2xl font-bold">Need FedRAMP Authorization Guidance?</h3>
              <p className="mb-6 text-muted-foreground">
                Navigate the complex FedRAMP authorization process with expert AI assistance and
                consulting services.
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

export default FedRAMP;
