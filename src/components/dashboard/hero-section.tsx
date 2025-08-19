import { ArrowRight, CheckCircle, Sparkles, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TypewriterAnimation } from "@/components/ui/typewriter-animation";
interface HeroSectionProps {
  onScrollToChat?: () => void;
}
export const HeroSection = ({
  onScrollToChat
}: HeroSectionProps) => {
  const complianceFrameworks = ["SOC 2", "NIST", "HIPAA", "CMMC", "ISO 27001", "PCI DSS", "FedRAMP"];
  return <section className="relative bg-background">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16 lg:py-32">
        <div className="text-center max-w-4xl mx-auto">
          <div className="flex items-center justify-center space-x-3 mb-8">
            
            <span className="text-accent font-semibold text-sm uppercase tracking-wide">
              Your AI-Powered CISO
            </span>
          </div>
          
          <h1 className="text-5xl lg:text-7xl font-bold text-foreground mb-8 leading-tight">
            Your <em>virtual</em> CISO for{" "}
            <span className="bg-gradient-primary bg-clip-text text-transparent block mt-2">
              <TypewriterAnimation texts={complianceFrameworks} speed={100} deleteSpeed={50} pause={1500} />
            </span>
            {" "}Compliance
          </h1>
          
          <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-3xl mx-auto">
            SentrIQ was developed by cybersecurity compliance professionals with decades of combined experience supporting U.S. military branches, federal agencies, and Fortune 500s across frameworks like NIST, CMMC, SOC 2, and HIPAA.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button size="lg" onClick={onScrollToChat} className="bg-accent hover:bg-accent/90 text-white text-lg px-8 py-4 h-auto">
              See your AI CISO in Action
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-brand-blue mr-2" />
                <span className="font-semibold text-foreground">Strategic Leadership</span>
              </div>
              <p className="text-sm text-muted-foreground">Get C-level cybersecurity strategy without the C-level salary</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-brand-medium-blue mr-2" />
                <span className="font-semibold text-foreground">Compliance Expertise</span>
              </div>
              <p className="text-sm text-muted-foreground">Navigate complex frameworks with confidence and clarity</p>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-brand-cyan mr-2" />
                <span className="font-semibold text-foreground">Human Escalation</span>
              </div>
              <p className="text-sm text-muted-foreground">Access certified cybersecurity consultants when you need that human touch</p>
            </div>
          </div>
        </div>
      </div>
    </section>;
};