import { useEffect } from "react";
import { UnifiedHeader } from "@/components/ui/unified-header";
import { HeroSection } from "@/components/dashboard/hero-section";
import { TrustedBySection } from "@/components/landing/TrustedBySection";
import { HomepageChat } from "@/components/chat/HomepageChat";
import { PricingSection } from "@/components/subscription/PricingSection";
import { Footer } from "@/components/ui/footer";

const Index = () => {
  // Handle URL hash on page load for direct links to pricing
  useEffect(() => {
    if (window.location.hash === '#pricing-section') {
      setTimeout(() => {
        const pricingSection = document.getElementById('pricing-section');
        if (pricingSection) {
          pricingSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
    }
  }, []);

  const scrollToChat = () => {
    const chatSection = document.getElementById('chat-section');
    if (chatSection) {
      chatSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <UnifiedHeader context="public" />
      <HeroSection onScrollToChat={scrollToChat} />
      <TrustedBySection />
      
      {/* Main Chat Section - Clean and Minimal */}
      <section id="chat-section" className="py-16 lg:py-24 bg-gradient-to-b from-background to-muted/20">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-4">
              Experience Your Virtual CISO
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get immediate answers to your cybersecurity compliance questions. No registration required for this demo.
            </p>
          </div>
          <HomepageChat />
        </div>
      </section>
      
      <div id="pricing-section">
        <PricingSection />
      </div>
      
      {/* Disclaimer */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <p className="mt-10 text-center text-xs text-muted-foreground max-w-3xl mx-auto">
          Company and agency logos represent prior professional experience of our individual cybersecurity experts.
          They do not constitute formal partnerships, direct client endorsements, or explicit affiliations.
        </p>
      </div>
      
      <Footer />
    </div>
  );
};

export default Index;
