import { Shield, Menu, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export const Navigation = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const scrollToPricing = () => {
    const pricingSection = document.getElementById('pricing-section');
    if (pricingSection) {
      pricingSection.scrollIntoView({ behavior: 'smooth' });
    } else {
      // If not on homepage, navigate to homepage with pricing hash
      window.location.href = '/#pricing-section';
    }
  };

  const handlePricingClick = (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToPricing();
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link
            to="/"
            className="flex items-center"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <img
              src="/lovable-uploads/6362c9bd-c403-4a72-abae-4de6f5238518.png"
              alt="SentrIQ Labs"
              className="h-8"
            />
          </Link>

          {/* Desktop Menu */}
          <div className="hidden items-center space-x-8 md:flex">
            <Link to="/features" className="text-foreground transition-colors hover:text-primary">
              Features
            </Link>
            <button
              onClick={handlePricingClick}
              className="text-foreground transition-colors hover:text-primary"
            >
              Pricing
            </button>
            <Link to="/about" className="text-foreground transition-colors hover:text-primary">
              About
            </Link>
            <Link to="/faq" className="text-foreground transition-colors hover:text-primary">
              FAQ
            </Link>
            <Link to="/contact" className="text-foreground transition-colors hover:text-primary">
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
            <Button variant="ghost" size="icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
              {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </Button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="space-y-4 border-t border-border py-4 md:hidden">
            <Link
              to="/features"
              className="block text-foreground transition-colors hover:text-primary"
            >
              Features
            </Link>
            <button
              onClick={handlePricingClick}
              className="block text-foreground transition-colors hover:text-primary"
            >
              Pricing
            </button>
            <Link
              to="/about"
              className="block text-foreground transition-colors hover:text-primary"
            >
              About
            </Link>
            <Link to="/faq" className="block text-foreground transition-colors hover:text-primary">
              FAQ
            </Link>
            <Link
              to="/contact"
              className="block text-foreground transition-colors hover:text-primary"
            >
              Contact
            </Link>
            <div className="space-y-2 pt-4">
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
