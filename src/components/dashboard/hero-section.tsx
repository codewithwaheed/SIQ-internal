import { ArrowRight, CheckCircle, Sparkles, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TypewriterAnimation } from '@/components/ui/typewriter-animation';
interface HeroSectionProps {
  onScrollToChat?: () => void;
}
export const HeroSection = ({ onScrollToChat }: HeroSectionProps) => {
  const complianceFrameworks = [
    'SOC 2',
    'NIST',
    'HIPAA',
    'CMMC',
    'ISO 27001',
    'PCI DSS',
    'FedRAMP',
  ];
  return (
    <section className="relative bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-8 flex items-center justify-center space-x-3">
            <span className="text-sm font-semibold uppercase tracking-wide text-accent">
              Your AI-Powered CISO
            </span>
          </div>

          <h1 className="mb-8 text-5xl font-bold leading-tight text-foreground lg:text-7xl">
            Your <em>virtual</em> CISO for{' '}
            <span className="mt-2 block bg-gradient-primary bg-clip-text text-transparent">
              <TypewriterAnimation
                texts={complianceFrameworks}
                speed={100}
                deleteSpeed={50}
                pause={1500}
              />
            </span>{' '}
            Compliance
          </h1>

          <p className="mx-auto mb-12 max-w-3xl text-xl leading-relaxed text-muted-foreground">
            SentrIQ was developed by cybersecurity compliance professionals with decades of combined
            experience supporting U.S. military branches, federal agencies, and Fortune 500s across
            frameworks like NIST, CMMC, SOC 2, and HIPAA.
          </p>

          <div className="mb-16 flex flex-col justify-center gap-4 sm:flex-row">
            <Button
              size="lg"
              onClick={onScrollToChat}
              className="h-auto bg-accent px-8 py-4 text-lg text-white hover:bg-accent/90"
            >
              See your AI CISO in Action
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-8 text-center md:grid-cols-3">
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <CheckCircle className="mr-2 h-5 w-5 text-brand-blue" />
                <span className="font-semibold text-foreground">Strategic Leadership</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Get C-level cybersecurity strategy without the C-level salary
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <CheckCircle className="mr-2 h-5 w-5 text-brand-medium-blue" />
                <span className="font-semibold text-foreground">Compliance Expertise</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Navigate complex frameworks with confidence and clarity
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <CheckCircle className="mr-2 h-5 w-5 text-brand-cyan" />
                <span className="font-semibold text-foreground">Human Escalation</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Access certified cybersecurity consultants when you need that human touch
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
