import { Footer } from "@/components/ui/footer";
import { Navigation } from "@/components/ui/navigation";
const PrivacyPolicy = () => {
  return <div className="min-h-screen bg-background">
      <Navigation />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">Privacy Policy</h1>
            <p className="text-muted-foreground text-lg">
              Last updated: January 2, 2025
            </p>
          </div>

          <div className="prose prose-gray max-w-none space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Information We Collect</h2>
              <div className="space-y-4">
                <p>
                  We collect information you provide directly to us, such as when you create an account, 
                  use our services, or contact us for support.
                </p>
                <p><strong>Personal Information:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Name, email address, and company information</li>
                  <li>Account credentials and authentication data</li>
                  <li>Payment and billing information</li>
                  <li>Communications with our support team</li>
                </ul>
                <p><strong>Usage Data:</strong></p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Log data and usage patterns</li>
                  <li>Device information and IP addresses</li>
                  <li>Chat interactions and document uploads</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. How We Use Your Information</h2>
              <div className="space-y-4">
                <p>We use the information we collect to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Provide, maintain, and improve our services</li>
                  <li>Process transactions and send related information</li>
                  <li>Send technical notices and support messages</li>
                  <li>Respond to your comments and questions</li>
                  <li>Detect and prevent fraud and abuse</li>
                  <li>Comply with legal obligations</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Information Sharing</h2>
              <div className="space-y-4">
                <p>
                  We do not sell, trade, or otherwise transfer your personal information to third parties 
                  except as described in this policy:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li><strong>Service Providers:</strong> We may share information with trusted third-party service providers</li>
                  <li><strong>Legal Compliance:</strong> When required by law or to protect our rights</li>
                  <li><strong>Business Transfers:</strong> In connection with mergers or acquisitions</li>
                  <li><strong>Consent:</strong> With your explicit consent for other purposes</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Data Security</h2>
              <div className="space-y-4">
                <p>
                  We implement appropriate security measures to protect your personal information:
                </p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Encryption in transit and at rest</li>
                  <li>Multi-factor authentication</li>
                  <li>Regular security audits and monitoring</li>
                  <li>Access controls and employee training</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Data Retention</h2>
              <div className="space-y-4">
                <p>
                  We retain your information for as long as necessary to provide our services and comply 
                  with legal obligations. You may request deletion of your account and associated data 
                  at any time.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">6. Your Rights</h2>
              <div className="space-y-4">
                <p>You have the right to:</p>
                <ul className="list-disc pl-6 space-y-1">
                  <li>Access and update your personal information</li>
                  <li>Request deletion of your data</li>
                  <li>Opt-out of marketing communications</li>
                  <li>Data portability and correction</li>
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">7. Cookies and Tracking</h2>
              <div className="space-y-4">
                <p>
                  We use cookies and similar technologies to improve your experience, analyze usage, 
                  and provide personalized content. You can control cookie settings through your browser.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">8. Changes to This Policy</h2>
              <div className="space-y-4">
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of any changes 
                  by posting the new Privacy Policy on this page and updating the "Last updated" date.
                </p>
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">9. Contact Us</h2>
              <div className="space-y-4">
                <p>If you have any questions about this Privacy Policy, please contact us at: legal@sentriq.io</p>
                
              </div>
            </section>
          </div>
        </div>
      </div>
      <Footer />
    </div>;
};
export default PrivacyPolicy;