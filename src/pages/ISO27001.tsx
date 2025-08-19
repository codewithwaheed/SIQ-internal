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
import { CheckCircle, Shield, Globe, Cog } from "lucide-react";

const ISO27001 = () => {
  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader context="public" showAuth />

      <main className="pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              <Globe className="h-3 w-3 mr-1" />
              International Standard
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              ISO 27001 Compliance
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              International standard for information security management systems
              (ISMS)
            </p>
          </div>

          {/* Overview */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                What is ISO 27001?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                ISO/IEC 27001 is an international standard that specifies the
                requirements for establishing, implementing, maintaining, and
                continually improving an information security management system
                (ISMS).
              </p>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Key Benefits</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Demonstrates commitment to information security
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Reduces security breaches and incidents
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Improves business resilience
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Competitive advantage in tenders
                    </li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold mb-3">PDCA Cycle</h4>
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <h5 className="font-medium text-blue-900">Plan</h5>
                      <p className="text-sm text-blue-700">
                        Establish ISMS policy and objectives
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <h5 className="font-medium text-green-900">Do</h5>
                      <p className="text-sm text-green-700">
                        Implement and operate the ISMS
                      </p>
                    </div>
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <h5 className="font-medium text-yellow-900">Check</h5>
                      <p className="text-sm text-yellow-700">
                        Monitor and review the ISMS
                      </p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-lg">
                      <h5 className="font-medium text-purple-900">Act</h5>
                      <p className="text-sm text-purple-700">
                        Maintain and improve the ISMS
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Control Categories */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cog className="h-5 w-5" />
                ISO 27001:2022 Control Categories
              </CardTitle>
              <CardDescription>
                The updated standard includes 93 controls across 4 themes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-semibold mb-3 text-blue-700">
                    Organizational Controls (37 controls)
                  </h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {[
                      "Information security policies",
                      "Information security in project management",
                      "Information security in supplier relationships",
                      "Information security incident management",
                      "Business continuity",
                      "Compliance",
                    ].map((control, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-blue-50 rounded"
                      >
                        <Shield className="h-3 w-3 text-blue-600" />
                        <span className="text-sm">{control}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 text-green-700">
                    People Controls (8 controls)
                  </h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {[
                      "Screening",
                      "Terms and conditions of employment",
                      "Information security awareness",
                      "Disciplinary process",
                      "Remote working",
                      "Information security event reporting",
                    ].map((control, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-green-50 rounded"
                      >
                        <Shield className="h-3 w-3 text-green-600" />
                        <span className="text-sm">{control}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 text-purple-700">
                    Physical Controls (14 controls)
                  </h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {[
                      "Physical security perimeters",
                      "Physical entry",
                      "Protection against environmental threats",
                      "Equipment siting and protection",
                      "Secure disposal or reuse of equipment",
                      "Clear desk and clear screen",
                    ].map((control, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-purple-50 rounded"
                      >
                        <Shield className="h-3 w-3 text-purple-600" />
                        <span className="text-sm">{control}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3 text-orange-700">
                    Technological Controls (34 controls)
                  </h4>
                  <div className="grid md:grid-cols-2 gap-2">
                    {[
                      "Access control management",
                      "Cryptography",
                      "Systems security",
                      "Network security management",
                      "Application security",
                      "Secure coding",
                      "Security testing",
                      "Vulnerability management",
                    ].map((control, index) => (
                      <div
                        key={index}
                        className="flex items-center gap-2 p-2 bg-orange-50 rounded"
                      >
                        <Shield className="h-3 w-3 text-orange-600" />
                        <span className="text-sm">{control}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Implementation Process */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Implementation Process</CardTitle>
              <CardDescription>
                Key steps to achieve ISO 27001 certification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    step: 1,
                    title: "Gap Analysis",
                    description:
                      "Assess current security posture against ISO 27001 requirements",
                  },
                  {
                    step: 2,
                    title: "Risk Assessment",
                    description:
                      "Identify and evaluate information security risks",
                  },
                  {
                    step: 3,
                    title: "ISMS Design",
                    description:
                      "Design and document the information security management system",
                  },
                  {
                    step: 4,
                    title: "Implementation",
                    description: "Implement security controls and procedures",
                  },
                  {
                    step: 5,
                    title: "Internal Audit",
                    description:
                      "Conduct internal audits to verify ISMS effectiveness",
                  },
                  {
                    step: 6,
                    title: "Management Review",
                    description:
                      "Review ISMS performance and make improvements",
                  },
                  {
                    step: 7,
                    title: "Certification Audit",
                    description:
                      "External audit by accredited certification body",
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex gap-4 p-4 bg-muted/50 rounded-lg"
                  >
                    <div className="w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0">
                      {item.step}
                    </div>
                    <div>
                      <h5 className="font-semibold">{item.title}</h5>
                      <p className="text-sm text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* CTA */}
          <Card>
            <CardContent className="p-8 text-center">
              <h3 className="text-2xl font-bold mb-4">
                Start Your ISO 27001 Journey
              </h3>
              <p className="text-muted-foreground mb-6">
                Get expert guidance on ISO 27001 implementation, gap analysis,
                and certification readiness.
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

export default ISO27001;
