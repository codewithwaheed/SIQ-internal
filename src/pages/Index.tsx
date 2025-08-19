import { useEffect } from 'react';
import { UnifiedHeader } from '@/components/ui/unified-header';
import { HeroSection } from '@/components/dashboard/hero-section';
import { TrustedBySection } from '@/components/landing/TrustedBySection';
import { HomepageChat } from '@/components/chat/HomepageChat';
import { PricingSection } from '@/components/subscription/PricingSection';
import { Footer } from '@/components/ui/footer';

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
      <section
        id="chat-section"
        className="bg-gradient-to-b from-background to-muted/20 py-16 lg:py-24"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold text-foreground lg:text-4xl">
              Experience Your Virtual CISO
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Get immediate answers to your cybersecurity compliance questions. No registration
              required for this demo.
            </p>
          </div>
          <HomepageChat />
        </div>
      </section>

      <div id="pricing-section">
        <PricingSection />
      </div>

      {/* Disclaimer */}
      <div className="mx-auto max-w-6xl px-4 pb-8 sm:px-6 lg:px-8">
        <p className="mx-auto mt-10 max-w-3xl text-center text-xs text-muted-foreground">
          Company and agency logos represent prior professional experience of our individual
          cybersecurity experts. They do not constitute formal partnerships, direct client
          endorsements, or explicit affiliations.
        </p>
      </div>

      <Footer />
    </div>
  );
};

export default Index;
