import { Shield, Mail, Phone, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <div className="flex items-center">
              <img
                src="/lovable-uploads/a8baabc7-1f3f-4f16-8059-6040edd6a29c.png"
                alt="SentrIQ Labs"
                className="h-8"
              />
            </div>
            <p className="text-sm text-primary-foreground/80">
              AI-powered cybersecurity compliance assistance for businesses of all sizes.
            </p>
            <div className="flex space-x-2">
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4" />
                <span>hello@sentriq.io</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Consultants</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>
                <Link to="/nda" className="transition-colors hover:text-primary-foreground">
                  SentrIQ NDA
                </Link>
              </li>
              <li>
                <Link
                  to="/code-of-conduct"
                  className="transition-colors hover:text-primary-foreground"
                >
                  Code of Conduct
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Compliance</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>
                <Link
                  to="/compliance/nist-800-171"
                  className="transition-colors hover:text-primary-foreground"
                >
                  NIST 800-171
                </Link>
              </li>
              <li>
                <Link
                  to="/compliance/cmmc-2-0"
                  className="transition-colors hover:text-primary-foreground"
                >
                  CMMC 2.0
                </Link>
              </li>
              <li>
                <Link
                  to="/compliance/fedramp"
                  className="transition-colors hover:text-primary-foreground"
                >
                  FedRAMP
                </Link>
              </li>
              <li>
                <Link
                  to="/compliance/iso-27001"
                  className="transition-colors hover:text-primary-foreground"
                >
                  ISO 27001
                </Link>
              </li>
              <li>
                <Link
                  to="/compliance/hipaa"
                  className="transition-colors hover:text-primary-foreground"
                >
                  HIPAA
                </Link>
              </li>
              <li>
                <Link
                  to="/compliance/soc-2"
                  className="transition-colors hover:text-primary-foreground"
                >
                  SOC 2
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="mb-4 font-semibold">Company</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>
                <Link to="/about" className="transition-colors hover:text-primary-foreground">
                  About
                </Link>
              </li>
              <li>
                <Link to="/contact" className="transition-colors hover:text-primary-foreground">
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy-policy"
                  className="transition-colors hover:text-primary-foreground"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-of-service"
                  className="transition-colors hover:text-primary-foreground"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-primary-foreground/20 pt-8 text-center">
          <p className="text-sm text-primary-foreground/60">
            © 2024 SentrIQ. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
