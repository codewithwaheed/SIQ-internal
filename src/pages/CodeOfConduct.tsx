import { Navigation } from "@/components/ui/navigation";
import { Footer } from "@/components/ui/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CodeOfConduct = () => {
  return (
    <div className="min-h-screen bg-background animate-fade-in">
      <Navigation />
      
      <main className="py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-4xl font-bold text-foreground mb-6">
              SentrIQ Code of Conduct
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
              Professional standards and ethical guidelines for our consultant network.
            </p>
          </div>

          <Card className="animate-fade-in" style={{animationDelay: '300ms'}}>
            <CardHeader>
              <CardTitle>Code of Conduct for SentrIQ Consultants</CardTitle>
            </CardHeader>
            <CardContent className="prose prose-gray max-w-none dark:prose-invert">
              <div className="space-y-6 text-muted-foreground leading-relaxed">
                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">1. Professional Excellence</h3>
                  <p>SentrIQ consultants are committed to:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Delivering high-quality, accurate, and timely cybersecurity guidance</li>
                    <li>Maintaining current knowledge of industry standards and best practices</li>
                    <li>Providing honest, objective assessments and recommendations</li>
                    <li>Clearly communicating technical concepts to non-technical stakeholders</li>
                    <li>Meeting all agreed-upon deadlines and commitments</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">2. Client-Focused Service</h3>
                  <p>Our consultants prioritize client success by:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Understanding each client's unique business context and constraints</li>
                    <li>Providing practical, implementable recommendations</li>
                    <li>Respecting client budgets and resource limitations</li>
                    <li>Being responsive to client questions and concerns</li>
                    <li>Escalating complex issues appropriately within the SentrIQ network</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">3. Ethical Standards</h3>
                  <p>All consultants must adhere to the highest ethical standards:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li><strong>Integrity:</strong> Act honestly and transparently in all interactions</li>
                    <li><strong>Confidentiality:</strong> Protect all client and SentrIQ confidential information</li>
                    <li><strong>Conflicts of Interest:</strong> Disclose any potential conflicts and recuse when appropriate</li>
                    <li><strong>Professional Boundaries:</strong> Maintain appropriate professional relationships</li>
                    <li><strong>Compliance:</strong> Follow all applicable laws, regulations, and industry standards</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">4. Communication Standards</h3>
                  <p>Professional communication guidelines include:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Respond to client inquiries within 24 hours during business days</li>
                    <li>Use clear, professional language free from jargon when possible</li>
                    <li>Provide regular status updates on ongoing engagements</li>
                    <li>Document important decisions and recommendations</li>
                    <li>Maintain respectful and collaborative interactions with all stakeholders</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">5. Continuous Improvement</h3>
                  <p>Consultants are expected to:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Participate in SentrIQ training and development programs</li>
                    <li>Stay current with evolving cybersecurity threats and regulations</li>
                    <li>Seek feedback from clients and incorporate improvements</li>
                    <li>Share knowledge and best practices with the consultant community</li>
                    <li>Maintain relevant professional certifications</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">6. Platform Usage</h3>
                  <p>When using the SentrIQ platform, consultants must:</p>
                  <ul className="list-disc pl-6 mt-2 space-y-1">
                    <li>Follow all platform guidelines and security protocols</li>
                    <li>Accurately track time and provide detailed engagement summaries</li>
                    <li>Use platform tools and resources appropriately</li>
                    <li>Report technical issues or concerns promptly</li>
                    <li>Respect the intellectual property rights of SentrIQ and its clients</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">7. Compliance with Laws and Regulations</h3>
                  <p>
                    Consultants must comply with all applicable federal, state, and local laws, as well as industry regulations including NIST, CMMC, SOC 2, HIPAA, and other relevant frameworks. This includes staying informed about regulatory changes that may affect client engagements.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">8. Reporting Violations</h3>
                  <p>
                    If you become aware of any violations of this Code of Conduct or have concerns about ethical behavior, please report them immediately to{' '}
                    <a href="mailto:ethics@sentriq.io" className="text-accent hover:underline">ethics@sentriq.io</a>. All reports will be handled confidentially and without retaliation.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">9. Consequences</h3>
                  <p>
                    Violations of this Code of Conduct may result in corrective action, including additional training, suspension, or termination from the SentrIQ consultant network, depending on the severity and nature of the violation.
                  </p>
                </section>

                <section>
                  <h3 className="text-lg font-semibold text-foreground mb-3">10. Acknowledgment</h3>
                  <p>
                    By joining the SentrIQ consultant network, you acknowledge that you have read, understood, and agree to abide by this Code of Conduct. You also agree to participate in any required training related to these standards.
                  </p>
                </section>

                <div className="mt-8 p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Last Updated:</strong> January 2025<br />
                    Questions about this Code of Conduct? Contact us at{' '}
                    <a href="mailto:support@sentriq.io" className="text-accent hover:underline">support@sentriq.io</a>.
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

export default CodeOfConduct;