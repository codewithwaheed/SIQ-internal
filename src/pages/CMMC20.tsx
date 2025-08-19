import { UnifiedHeader } from '@/components/ui/unified-header';
import { Footer } from '@/components/ui/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, Star, Target } from 'lucide-react';

const CMMC20 = () => {
  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader context="public" showAuth />

      <main className="pb-12 pt-24">
        <div className="mx-auto max-w-4xl px-6">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <Badge variant="secondary" className="mb-4">
              <Shield className="mr-1 h-3 w-3" />
              Cybersecurity Certification
            </Badge>
            <h1 className="mb-4 text-4xl font-bold tracking-tight">CMMC 2.0 Compliance</h1>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              Cybersecurity Maturity Model Certification for Defense Industrial Base contractors
            </p>
          </div>

          {/* Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                What is CMMC 2.0?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                The Cybersecurity Maturity Model Certification (CMMC) 2.0 is a framework designed to
                protect Federal Contract Information (FCI) and Controlled Unclassified Information
                (CUI) within the Defense Industrial Base (DIB).
              </p>

              <div className="grid gap-6 md:grid-cols-3">
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                    <span className="text-lg font-bold text-green-700">1</span>
                  </div>
                  <h4 className="mb-2 font-semibold">Level 1</h4>
                  <p className="text-sm text-muted-foreground">Foundational safeguarding of FCI</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
                    <span className="text-lg font-bold text-blue-700">2</span>
                  </div>
                  <h4 className="mb-2 font-semibold">Level 2</h4>
                  <p className="text-sm text-muted-foreground">Advanced protection of CUI</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-4 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-purple-100">
                    <span className="text-lg font-bold text-purple-700">3</span>
                  </div>
                  <h4 className="mb-2 font-semibold">Level 3</h4>
                  <p className="text-sm text-muted-foreground">Expert protection against APTs</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Key Requirements by Level</CardTitle>
              <CardDescription>
                Understanding the progressive security requirements across CMMC levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="mb-3 flex items-center gap-2 font-semibold">
                    <Star className="h-4 w-4 text-green-600" />
                    Level 1 Requirements
                  </h4>
                  <ul className="space-y-2 pl-6 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Basic cyber hygiene practices
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      17 safeguarding requirements from 48 CFR 52.204-21
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Annual self-assessment
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="mb-3 flex items-center gap-2 font-semibold">
                    <Star className="h-4 w-4 text-blue-600" />
                    Level 2 Requirements
                  </h4>
                  <ul className="space-y-2 pl-6 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                      110 security requirements based on NIST 800-171
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                      Third-party assessment required
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600" />
                      System Security Plan (SSP) and Plan of Action & Milestones (POA&M)
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="mb-3 flex items-center gap-2 font-semibold">
                    <Star className="h-4 w-4 text-purple-600" />
                    Level 3 Requirements
                  </h4>
                  <ul className="space-y-2 pl-6 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-600" />
                      Additional security practices for advanced persistent threats
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-600" />
                      Government-led assessment
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-purple-600" />
                      Enhanced monitoring and incident response capabilities
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="mb-4 text-2xl font-bold">Ready for CMMC 2.0 Certification?</h3>
              <p className="mb-6 text-muted-foreground">
                Get expert guidance on CMMC requirements, gap analysis, and implementation
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

export default CMMC20;
