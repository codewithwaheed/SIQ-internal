import { UnifiedHeader } from '@/components/ui/unified-header';
import { Footer } from '@/components/ui/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, Star, Target } from 'lucide-react';

const CMMC20 = () => {
  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader context="public" showAuth />
      
      <main className="pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              <Shield className="h-3 w-3 mr-1" />
              Cybersecurity Certification
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              CMMC 2.0 Compliance
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
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
                The Cybersecurity Maturity Model Certification (CMMC) 2.0 is a framework designed to protect Federal Contract Information (FCI) 
                and Controlled Unclassified Information (CUI) within the Defense Industrial Base (DIB).
              </p>
              
              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-green-700 font-bold text-lg">1</span>
                  </div>
                  <h4 className="font-semibold mb-2">Level 1</h4>
                  <p className="text-sm text-muted-foreground">Foundational safeguarding of FCI</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-blue-700 font-bold text-lg">2</span>
                  </div>
                  <h4 className="font-semibold mb-2">Level 2</h4>
                  <p className="text-sm text-muted-foreground">Advanced protection of CUI</p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-purple-700 font-bold text-lg">3</span>
                  </div>
                  <h4 className="font-semibold mb-2">Level 3</h4>
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
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-green-600" />
                    Level 1 Requirements
                  </h4>
                  <ul className="space-y-2 text-sm pl-6">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Basic cyber hygiene practices
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      17 safeguarding requirements from 48 CFR 52.204-21
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Annual self-assessment
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-blue-600" />
                    Level 2 Requirements
                  </h4>
                  <ul className="space-y-2 text-sm pl-6">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      110 security requirements based on NIST 800-171
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      Third-party assessment required
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      System Security Plan (SSP) and Plan of Action & Milestones (POA&M)
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <Star className="h-4 w-4 text-purple-600" />
                    Level 3 Requirements
                  </h4>
                  <ul className="space-y-2 text-sm pl-6">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      Additional security practices for advanced persistent threats
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      Government-led assessment
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5 flex-shrink-0" />
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
              <h3 className="text-2xl font-bold mb-4">Ready for CMMC 2.0 Certification?</h3>
              <p className="text-muted-foreground mb-6">
                Get expert guidance on CMMC requirements, gap analysis, and implementation strategies.
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

export default CMMC20;