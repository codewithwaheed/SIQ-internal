import { Shield, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "react-router-dom";

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToPricing = () => {
    const pricingSection = document.getElementById("pricing-section");
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: "smooth" });
    } else {
      // If not on homepage, navigate to homepage with pricing hash
      window.location.href = "/#pricing-section";
    }
  };

  const handlePricingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToPricing();
  };

  return (
    <nav className="bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link
            to="/"
            className="flex items-center"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          >
            <img
              src="/lovable-uploads/6362c9bd-c403-4a72-abae-4de6f5238518.png"
              alt="SentrIQ Labs"
              className="h-8"
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            <Link
              to="/features"
              className="text-foreground hover:text-primary transition-colors"
            >
              Features
            </Link>
            <button
              onClick={handlePricingClick}
              className="text-foreground hover:text-primary transition-colors"
            >
              Pricing
            </button>
            <Link
              to="/about"
              className="text-foreground hover:text-primary transition-colors"
            >
              About
            </Link>
            <Link
              to="/faq"
              className="text-foreground hover:text-primary transition-colors"
            >
              FAQ
            </Link>
            <Link
              to="/contact"
              className="text-foreground hover:text-primary transition-colors"
            >
              Contact
            </Link>
            <Button variant="outline" asChild>
              <Link to="/auth">Sign In</Link>
            </Button>
            <Button asChild>
              <Link to="/auth">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden py-4 space-y-4 border-t border-border">
            <Link
              to="/features"
              className="block text-foreground hover:text-primary transition-colors"
            >
              Features
            </Link>
            <button
              onClick={handlePricingClick}
              className="block text-foreground hover:text-primary transition-colors"
            >
              Pricing
            </button>
            <Link
              to="/about"
              className="block text-foreground hover:text-primary transition-colors"
            >
              About
            </Link>
            <Link
              to="/faq"
              className="block text-foreground hover:text-primary transition-colors"
            >
              FAQ
            </Link>
            <Link
              to="/contact"
              className="block text-foreground hover:text-primary transition-colors"
            >
              Contact
            </Link>
            <div className="pt-4 space-y-2">
              <Button variant="outline" className="w-full" asChild>
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button className="w-full" asChild>
                <Link to="/auth">Get Started</Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};
