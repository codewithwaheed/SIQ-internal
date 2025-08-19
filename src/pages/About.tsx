import { Navigation } from "@/components/ui/navigation";
import { Footer } from "@/components/ui/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Users, Award, Target } from "lucide-react";
const About = () => {
  const values = [
    {
      icon: Shield,
      title: "Security First",
      description:
        "We prioritize security in everything we do, ensuring your data and compliance journey are protected.",
    },
    {
      icon: Users,
      title: "Expert Team",
      description:
        "Our team consists of certified cybersecurity professionals with decades of compliance experience.",
    },
    {
      icon: Award,
      title: "Proven Results",
      description:
        "We've helped hundreds of businesses achieve and maintain compliance with various frameworks.",
    },
    {
      icon: Target,
      title: "Customer Focus",
      description:
        "Your success is our success. We're committed to making compliance accessible and achievable.",
    },
  ];
  const team = [
    {
      name: "Sarah Johnson",
      role: "CEO & Founder",
      bio: "Former CISO with 15+ years in cybersecurity. Led compliance initiatives at Fortune 500 companies.",
      image: "/lovable-uploads/14818f48-0cf4-445a-b10a-c8b5a3fdbc5b.png",
    },
    {
      name: "Michael Chen",
      role: "CTO",
      bio: "AI and machine learning expert. Previously at Google, specialized in natural language processing.",
      image: "/lovable-uploads/8f2c1b7a-29fd-4e55-95b0-ca958d83dc5d.png",
    },
    {
      name: "Jennifer Rodriguez",
      role: "Head of Compliance",
      bio: "CISSP certified with expertise in NIST, CMMC, and ISO frameworks. Former government compliance auditor.",
      image: "/lovable-uploads/14818f48-0cf4-445a-b10a-c8b5a3fdbc5b.png",
    },
  ];
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="text-center mb-16 animate-fade-in">
            <h1 className="text-4xl font-bold text-foreground mb-6">
              About SentrIQ
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
              SentrIQ is your cybersecurity co-pilot. We combine the power of AI
              with the guidance of real human consultants to help you understand
              compliance, close gaps, and move with confidence.
            </p>
            <div className="bg-muted rounded-lg p-8">
              <h2 className="text-2xl font-semibold mb-4">
                Built for Fast-Moving Businesses
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                SentrIQ is made for the ones who don't have time to slow down.
                Whether you're a founder trying to win government contracts, a
                CTO navigating an audit, or a consultant managing multiple
                clients, SentrIQ helps you stay ahead without getting
                overwhelmed.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                We're built for fast-moving businesses that need clarity, not
                complexity. SentrIQ was developed by cybersecurity compliance
                professionals with decades of combined experience supporting
                U.S. military branches, federal agencies, and Fortune 500s
                across frameworks like NIST, CMMC, SOC 2, and HIPAA.
              </p>
            </div>
          </div>

          {/* Values Section */}
          <div className="mb-16">
            <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {values.map((value, index) => (
                <Card key={index} className="text-center">
                  <CardContent className="pt-6">
                    <value.icon className="h-12 w-12 text-primary mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">
                      {value.title}
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      {value.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Team Section */}

          {/* Mission Section */}
          <div className="bg-primary/5 rounded-lg p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
              To empower every business with the tools, knowledge, and support
              they need to achieve and maintain cybersecurity compliance,
              protecting their operations, customers, and reputation in an
              increasingly digital world.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
export default About;
