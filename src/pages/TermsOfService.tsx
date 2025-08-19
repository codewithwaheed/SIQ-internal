import { Footer } from "@/components/ui/footer";
import { Navigation } from "@/components/ui/navigation";
const TermsOfService = () => {
  return <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Terms of Service</h1>
            <p className="text-muted-foreground text-lg">Last updated: August 1, 2025</p>
          </div>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
              <div className="space-y-4">
                <p>
                  By accessing and using SentrIQ's services, you accept and agree to be bound by the 
                  terms and provision of this agreement. If you do not agree to these terms, you may 
                  not use our services.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
              <div className="space-y-4">
                <p>
                  SentrIQ provides AI-powered cybersecurity compliance assistance, including but not 
                  limited to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Automated cybersecurity compliance guidance</li>
                  <li>Document analysis and security recommendations</li>
                  <li>Expert consultation and escalation services</li>
                  <li>Compliance framework mapping and tracking</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. User Accounts</h2>
              <div className="space-y-4">
                <p>
                  To access our services, you must create an account. You are responsible for:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Maintaining the confidentiality of your account credentials</li>
                  <li>All activities that occur under your account</li>
                  <li>Providing accurate and complete information</li>
                  <li>Notifying us immediately of any unauthorized use</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use</h2>
              <div className="space-y-4">
                <p>You agree not to use our services to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Violate any applicable laws or regulations</li>
                  <li>Infringe on intellectual property rights</li>
                  <li>Upload malicious code or harmful content</li>
                  <li>Attempt to gain unauthorized access to our systems</li>
                  <li>Interfere with the proper operation of our services</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Payment and Billing</h2>
              <div className="space-y-4">
                <p>
                  Subscription fees are billed in advance on a recurring basis. You agree to:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Pay all charges associated with your account</li>
                  <li>Provide current and accurate payment information</li>
                  <li>Notify us of any changes to your payment method</li>
                </ul>
                <p>
                  We reserve the right to suspend or terminate services for non-payment.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Intellectual Property</h2>
              <div className="space-y-4">
                <p>
                  SentrIQ retains all rights to our platform, technology, and proprietary algorithms. 
                  You retain ownership of your data and content, while granting us necessary rights 
                  to provide our services.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Disclaimers</h2>
              <div className="space-y-4">
                <p>
                  Our services are provided "as is" without warranties. While we strive for accuracy, 
                  our AI recommendations should not replace professional security assessment and legal 
                  advice. You are responsible for validating all compliance recommendations.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Limitation of Liability</h2>
              <div className="space-y-4">
                <p>
                  SentrIQ's liability is limited to the amount paid for our services. We are not liable 
                  for indirect, incidental, or consequential damages arising from use of our services.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Termination</h2>
              <div className="space-y-4">
                <p>
                  Either party may terminate this agreement at any time. Upon termination, your access 
                  to our services will cease, and we may delete your data according to our retention policy.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">10. Changes to Terms</h2>
              <div className="space-y-4">
                <p>
                  We reserve the right to modify these terms at any time. Changes will be effective 
                  upon posting. Continued use of our services constitutes acceptance of revised terms.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">11. Contact Information</h2>
              <div className="space-y-4">
                <p>For questions about these Terms of Service, contact us at: legal@sentriq.io</p>
                
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>;
};
export default TermsOfService;