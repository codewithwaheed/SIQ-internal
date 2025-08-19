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
import { CheckCircle, Shield, Cloud, Lock } from "lucide-react";

const FedRAMP = () => {
  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader context="public" showAuth />

      <main className="pt-24 pb-12">
        <div className="max-w-4xl mx-auto px-6">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              <Cloud className="h-3 w-3 mr-1" />
              Cloud Security Authorization
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              FedRAMP Compliance
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Federal Risk and Authorization Management Program for cloud
              service providers
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
                FedRAMP is a government-wide program that provides a
                standardized approach to security assessment, authorization, and
                continuous monitoring for cloud products and services used by
                federal agencies.
              </p>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock className="h-6 w-6 text-green-700" />
                  </div>
                  <h4 className="font-semibold mb-2">Low Impact</h4>
                  <p className="text-sm text-muted-foreground">
                    Basic security controls for low-risk systems
                  </p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock className="h-6 w-6 text-yellow-700" />
                  </div>
                  <h4 className="font-semibold mb-2">Moderate Impact</h4>
                  <p className="text-sm text-muted-foreground">
                    Enhanced controls for moderate-risk systems
                  </p>
                </div>
                <div className="text-center p-4 bg-muted/50 rounded-lg">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Lock className="h-6 w-6 text-red-700" />
                  </div>
                  <h4 className="font-semibold mb-2">High Impact</h4>
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
                  <h4 className="font-semibold mb-2">
                    Joint Authorization Board (JAB) P-ATO
                  </h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Provisional Authorization to Operate granted by the JAB for
                    cloud services with widespread government use.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      High-impact, widely-used cloud services
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Most rigorous review process
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-green-500 pl-4">
                  <h4 className="font-semibold mb-2">Agency ATO</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Authorization to Operate granted by a federal agency for
                    their specific use.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Agency-specific authorization
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Can be leveraged by other agencies
                    </li>
                  </ul>
                </div>

                <div className="border-l-4 border-purple-500 pl-4">
                  <h4 className="font-semibold mb-2">FedRAMP Connect</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Process for CSPs to work directly with agencies to achieve
                    authorization.
                  </p>
                  <ul className="space-y-1 text-sm">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      Direct agency partnership
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
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
                FedRAMP leverages NIST 800-53 security controls organized into
                families
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  "Access Control (AC)",
                  "Awareness and Training (AT)",
                  "Audit and Accountability (AU)",
                  "Security Assessment (CA)",
                  "Configuration Management (CM)",
                  "Contingency Planning (CP)",
                  "Identification and Authentication (IA)",
                  "Incident Response (IR)",
                  "Maintenance (MA)",
                  "Media Protection (MP)",
                  "Physical and Environmental Protection (PE)",
                  "Planning (PL)",
                  "Personnel Security (PS)",
                  "Risk Assessment (RA)",
                  "System and Services Acquisition (SA)",
                  "System and Communications Protection (SC)",
                  "System and Information Integrity (SI)",
                  "Program Management (PM)",
                ].map((control, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg"
                  >
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
              <h3 className="text-2xl font-bold mb-4">
                Need FedRAMP Authorization Guidance?
              </h3>
              <p className="text-muted-foreground mb-6">
                Navigate the complex FedRAMP authorization process with expert
                AI assistance and consulting services.
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

export default FedRAMP;
