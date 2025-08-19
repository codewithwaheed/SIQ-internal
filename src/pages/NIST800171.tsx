import { UnifiedHeader } from '@/components/ui/unified-header';
import { Footer } from '@/components/ui/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, Users, FileText } from 'lucide-react';

const NIST800171 = () => {
  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader context="public" showAuth />
      
      <main className="pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              <Shield className="h-3 w-3 mr-1" />
              Compliance Framework
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              NIST 800-171 Compliance
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Protecting Controlled Unclassified Information (CUI) in nonfederal systems and organizations
            </p>
          </div>

          {/* Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                What is NIST 800-171?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                NIST Special Publication 800-171 provides guidelines for protecting Controlled Unclassified Information (CUI) 
                in nonfederal systems and organizations. It's essential for organizations that handle federal contract information 
                or work with government agencies.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-2">Key Requirements</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Access control and user management
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Security awareness and training
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Audit and accountability
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Configuration management
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Industries Affected</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      Defense contractors
                    </li>
                    <li className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      Federal suppliers
                    </li>
                    <li className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      Government subcontractors
                    </li>
                    <li className="flex items-start gap-2">
                      <Users className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      Research institutions
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Controls */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>14 Control Families</CardTitle>
              <CardDescription>
                NIST 800-171 organizes security requirements into 14 control families
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  'Access Control (AC)',
                  'Awareness and Training (AT)',
                  'Audit and Accountability (AU)',
                  'Configuration Management (CM)',
                  'Identification and Authentication (IA)',
                  'Incident Response (IR)',
                  'Maintenance (MA)',
                  'Media Protection (MP)',
                  'Personnel Security (PS)',
                  'Physical Protection (PE)',
                  'Risk Assessment (RA)',
                  'Security Assessment (CA)',
                  'System and Communications Protection (SC)',
                  'System and Information Integrity (SI)'
                ].map((control, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
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
              <h3 className="text-2xl font-bold mb-4">Need Help with NIST 800-171 Compliance?</h3>
              <p className="text-muted-foreground mb-6">
                Our AI-powered platform can help you understand requirements, implement controls, and maintain compliance.
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

export default NIST800171;