import { Shield, Mail, Phone, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
export const Footer = () => {
  return (
    <footer className="bg-primary text-primary-foreground">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center">
              <img
                src="/lovable-uploads/a8baabc7-1f3f-4f16-8059-6040edd6a29c.png"
                alt="SentrIQ Labs"
                className="h-8"
              />
            </div>
            <p className="text-primary-foreground/80 text-sm">
              AI-powered cybersecurity compliance assistance for businesses of
              all sizes.
            </p>
            <div className="flex space-x-2">
              <div className="flex items-center space-x-2 text-sm">
                <Mail className="h-4 w-4" />
                <span>hello@sentriq.io</span>
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Consultants</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>
                <Link
                  to="/nda"
                  className="hover:text-primary-foreground transition-colors"
                >
                  SentrIQ NDA
                </Link>
              </li>
              <li>
                <Link
                  to="/code-of-conduct"
                  className="hover:text-primary-foreground transition-colors"
                >
                  Code of Conduct
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Compliance</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>
                <Link
                  to="/compliance/nist-800-171"
                  className="hover:text-primary-foreground transition-colors"
                >
                  NIST 800-171
                </Link>
              </li>
              <li>
                <Link
                  to="/compliance/cmmc-2-0"
                  className="hover:text-primary-foreground transition-colors"
                >
                  CMMC 2.0
                </Link>
              </li>
              <li>
                <Link
                  to="/compliance/fedramp"
                  className="hover:text-primary-foreground transition-colors"
                >
                  FedRAMP
                </Link>
              </li>
              <li>
                <Link
                  to="/compliance/iso-27001"
                  className="hover:text-primary-foreground transition-colors"
                >
                  ISO 27001
                </Link>
              </li>
              <li>
                <Link
                  to="/compliance/hipaa"
                  className="hover:text-primary-foreground transition-colors"
                >
                  HIPAA
                </Link>
              </li>
              <li>
                <Link
                  to="/compliance/soc-2"
                  className="hover:text-primary-foreground transition-colors"
                >
                  SOC 2
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/80">
              <li>
                <Link
                  to="/about"
                  className="hover:text-primary-foreground transition-colors"
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  to="/contact"
                  className="hover:text-primary-foreground transition-colors"
                >
                  Contact
                </Link>
              </li>
              <li>
                <Link
                  to="/privacy-policy"
                  className="hover:text-primary-foreground transition-colors"
                >
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link
                  to="/terms-of-service"
                  className="hover:text-primary-foreground transition-colors"
                >
                  Terms of Service
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-primary-foreground/20 mt-8 pt-8 text-center">
          <p className="text-primary-foreground/60 text-sm">
            © 2024 SentrIQ. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
};
