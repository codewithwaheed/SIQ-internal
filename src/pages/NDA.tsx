import { Navigation } from "@/components/ui/navigation";
import { Footer } from "@/components/ui/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const NDA = () => {
  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <Navigation />
      
      <main className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-4xl font-bold text-foreground mb-6">
              SentrIQ Non-Disclosure Agreement
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Protecting confidential information and maintaining trust in our consultant network.
            </p>
          </div>

          <Card className="animate-fade-in" style={{animationDelay: '300ms'}}>
            <CardHeader>
              <CardTitle>Non-Disclosure Agreement for Consultants</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none dark:prose-invert">
              <div className="space-y-6 text-muted-foreground leading-relaxed">
                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">1. Purpose</h3>
                  <p>
                    This Non-Disclosure Agreement ("Agreement") is entered into between SentrIQ ("Company") and the consulting professional ("Consultant") to protect confidential and proprietary information that may be disclosed during the course of the consulting relationship.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">2. Definition of Confidential Information</h3>
                  <p>Confidential Information includes, but is not limited to:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Client data, documents, and cybersecurity assessments</li>
                    <li>SentrIQ's proprietary methodologies and frameworks</li>
                    <li>Business strategies, financial information, and pricing models</li>
                    <li>Technical specifications, AI algorithms, and platform architecture</li>
                    <li>Client lists, contact information, and relationship details</li>
                    <li>Any information marked as confidential or that would reasonably be considered confidential</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">3. Obligations of the Consultant</h3>
                  <p>The Consultant agrees to:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Maintain strict confidentiality of all Confidential Information</li>
                    <li>Use Confidential Information solely for the purpose of providing consulting services</li>
                    <li>Not disclose Confidential Information to any third party without prior written consent</li>
                    <li>Implement appropriate security measures to protect Confidential Information</li>
                    <li>Return or destroy all Confidential Information upon termination of the relationship</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">4. Data Security Requirements</h3>
                  <p>Consultants must adhere to the following security practices:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Use encrypted devices and secure communication channels</li>
                    <li>Implement multi-factor authentication where required</li>
                    <li>Maintain current security software and operating systems</li>
                    <li>Report any suspected security incidents immediately</li>
                    <li>Follow SentrIQ's data handling and storage policies</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">5. Client Information Protection</h3>
                  <p>
                    Consultants acknowledge that client information is highly sensitive and must be protected with the utmost care. This includes compliance frameworks, security assessments, vulnerabilities, and business operations discussed during consulting engagements.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">6. Term and Survival</h3>
                  <p>
                    This Agreement remains in effect for the duration of the consulting relationship and continues indefinitely thereafter regarding the protection of Confidential Information disclosed during the relationship.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">7. Remedies</h3>
                  <p>
                    The Consultant acknowledges that any breach of this Agreement may cause irreparable harm to SentrIQ and its clients, and that monetary damages may be inadequate. Therefore, SentrIQ may seek injunctive relief and other equitable remedies in addition to any other available remedies.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">8. Contact Information</h3>
                  <p>
                    For questions regarding this Non-Disclosure Agreement, please contact us at{' '}
                    <a href="mailto:legal@sentriq.io" className="text-accent hover:underline">legal@sentriq.io</a>.
                  </p>
                </section>

                <div className="mt-8 p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Last Updated:</strong> January 2025<br />
                    This document may be updated from time to time. Consultants will be notified of any material changes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default NDA;