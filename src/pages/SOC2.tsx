import { UnifiedHeader } from '@/components/ui/unified-header';
import { Footer } from '@/components/ui/footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Shield, Eye, Lock, Clock, Users } from 'lucide-react';

const SOC2 = () => {
  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader context="public" showAuth />

      <main className="pb-12 pt-24">
        <div className="mx-auto max-w-4xl px-6">
          {/* Hero Section */}
          <div className="mb-12 text-center">
            <Badge variant="secondary" className="mb-4">
              <Eye className="mr-1 h-3 w-3" />
              Service Organization Control
            </Badge>
            <h1 className="mb-4 text-4xl font-bold tracking-tight">SOC 2 Compliance</h1>
            <p className="mx-auto max-w-2xl text-xl text-muted-foreground">
              System and Organization Controls for service organizations handling customer data
            </p>
          </div>

          {/* Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                What is SOC 2?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                SOC 2 is an auditing procedure that ensures service organizations securely manage
                data to protect the interests of the organization and the privacy of its clients.
                It's based on five Trust Service Criteria.
              </p>

              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="mb-3 font-semibold">SOC 2 Type I vs Type II</h4>
                  <div className="space-y-3">
                    <div className="rounded-lg bg-blue-50 p-3">
                      <h5 className="font-medium text-blue-900">Type I</h5>
                      <p className="text-sm text-blue-700">
                        Point-in-time assessment of system design
                      </p>
                    </div>
                    <div className="rounded-lg bg-green-50 p-3">
                      <h5 className="font-medium text-green-900">Type II</h5>
                      <p className="text-sm text-green-700">
                        6-12 month assessment of operational effectiveness
                      </p>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="mb-3 font-semibold">Who Needs SOC 2?</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      SaaS providers
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Cloud computing services
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Data centers
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Managed service providers
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Trust Service Criteria */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Five Trust Service Criteria</CardTitle>
              <CardDescription>The foundation of SOC 2 compliance framework</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-l-4 border-blue-500 pl-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600" />
                    <h4 className="font-semibold">Security (Required)</h4>
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Protection against unauthorized access, use, or modification of information and
                    systems.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Network and host intrusion detection
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Multi-factor authentication
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Vulnerability management
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-600" />
                    <h4 className="font-semibold">Availability (Optional)</h4>
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    System availability for operation and use as committed or agreed.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Business continuity planning
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Disaster recovery procedures
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      System monitoring and alerting
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Lock className="h-5 w-5 text-purple-600" />
                    <h4 className="font-semibold">Processing Integrity (Optional)</h4>
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    System processing is complete, valid, accurate, timely, and authorized.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Data validation controls
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Processing monitoring
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Error handling procedures
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-orange-500 pl-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Eye className="h-5 w-5 text-orange-600" />
                    <h4 className="font-semibold">Confidentiality (Optional)</h4>
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Information designated as confidential is protected as committed or agreed.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Data classification policies
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Encryption in transit and at rest
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Access controls and monitoring
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-red-500 pl-4">
                  <div className="mb-2 flex items-center gap-2">
                    <Users className="h-5 w-5 text-red-600" />
                    <h4 className="font-semibold">Privacy (Optional)</h4>
                  </div>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Personal information is collected, used, retained, disclosed, and disposed of in
                    conformity with commitments.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Privacy policy and procedures
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Data retention and disposal
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-green-600" />
                      Individual rights management
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Implementation Process */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>SOC 2 Implementation Process</CardTitle>
              <CardDescription>
                Key steps to achieve SOC 2 compliance and certification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: 'Scope Definition',
                    description: 'Define the systems and processes to be included in the audit',
                  },
                  {
                    step: 2,
                    title: 'Gap Assessment',
                    description: 'Identify gaps between current state and SOC 2 requirements',
                  },
                  {
                    step: 3,
                    title: 'Control Implementation',
                    description: 'Implement necessary controls and document policies',
                  },
                  {
                    step: 4,
                    title: 'Monitoring Period',
                    description: 'Operate controls for the required period (Type II)',
                  },
                  {
                    step: 5,
                    title: 'Audit Preparation',
                    description: 'Prepare evidence and documentation for the audit',
                  },
                  {
                    step: 6,
                    title: 'External Audit',
                    description: 'Independent auditor conducts the SOC 2 examination',
                  },
                  {
                    step: 7,
                    title: 'Report Issuance',
                    description: 'Receive SOC 2 report and share with stakeholders',
                  },
                ].map((item, index) => (
                  <div key={index} className="flex gap-4 rounded-lg bg-muted/50 p-4">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {item.step}
                    </div>
                    <div>
                      <h5 className="font-semibold">{item.title}</h5>
                      <p className="text-sm text-muted-foreground">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="mb-4 text-2xl font-bold">Achieve SOC 2 Compliance</h3>
              <p className="mb-6 text-muted-foreground">
                Get expert assistance with SOC 2 preparation, control implementation, and audit
                readiness.
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

export default SOC2;
