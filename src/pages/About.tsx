import { Navigation } from '@/components/ui/navigation';
import { Footer } from '@/components/ui/footer';
import { Card, CardContent } from '@/components/ui/card';
import { Shield, Users, Award, Target } from 'lucide-react';
const About = () => {
  const values = [
    {
      icon: Shield,
      title: 'Security First',
      description:
        'We prioritize security in everything we do, ensuring your data and compliance journey are protected.',
    },
    {
      icon: Users,
      title: 'Expert Team',
      description:
        'Our team consists of certified cybersecurity professionals with decades of compliance experience.',
    },
    {
      icon: Award,
      title: 'Proven Results',
      description:
        "We've helped hundreds of businesses achieve and maintain compliance with various frameworks.",
    },
    {
      icon: Target,
      title: 'Customer Focus',
      description:
        "Your success is our success. We're committed to making compliance accessible and achievable.",
    },
  ];
  const team = [
    {
      name: 'Sarah Johnson',
      role: 'CEO & Founder',
      bio: 'Former CISO with 15+ years in cybersecurity. Led compliance initiatives at Fortune 500 companies.',
      image: '/lovable-uploads/14818f48-0cf4-445a-b10a-c8b5a3fdbc5b.png',
    },
    {
      name: 'Michael Chen',
      role: 'CTO',
      bio: 'AI and machine learning expert. Previously at Google, specialized in natural language processing.',
      image: '/lovable-uploads/8f2c1b7a-29fd-4e55-95b0-ca958d83dc5d.png',
    },
    {
      name: 'Jennifer Rodriguez',
      role: 'Head of Compliance',
      bio: 'CISSP certified with expertise in NIST, CMMC, and ISO frameworks. Former government compliance auditor.',
      image: '/lovable-uploads/14818f48-0cf4-445a-b10a-c8b5a3fdbc5b.png',
    },
  ];
  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="mb-16 animate-fade-in text-center">
            <h1 className="mb-6 text-4xl font-bold text-foreground">About SentrIQ</h1>
            <p className="mx-auto mb-8 max-w-3xl text-xl text-muted-foreground">
              SentrIQ is your cybersecurity co-pilot. We combine the power of AI with the guidance
              of real human consultants to help you understand compliance, close gaps, and move with
              confidence.
            </p>
            <div className="rounded-lg bg-muted p-8">
              <h2 className="mb-4 text-2xl font-semibold">Built for Fast-Moving Businesses</h2>
              <p className="mb-4 leading-relaxed text-muted-foreground">
                SentrIQ is made for the ones who don't have time to slow down. Whether you're a
                founder trying to win government contracts, a CTO navigating an audit, or a
                consultant managing multiple clients, SentrIQ helps you stay ahead without getting
                overwhelmed.
              </p>
              <p className="leading-relaxed text-muted-foreground">
                We're built for fast-moving businesses that need clarity, not complexity. SentrIQ
                was developed by cybersecurity compliance professionals with decades of combined
                experience supporting U.S. military branches, federal agencies, and Fortune 500s
                across frameworks like NIST, CMMC, SOC 2, and HIPAA.
              </p>
            </div>
          </div>

          {/* Values Section */}
          <div className="mb-16">
            <h2 className="mb-12 text-center text-3xl font-bold">Our Values</h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              {values.map((value, index) => (
                <Card key={index} className="text-center">
                  <CardContent className="pt-6">
                    <value.icon className="mx-auto mb-4 h-12 w-12 text-primary" />
                    <h3 className="mb-2 text-lg font-semibold">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Team Section */}

          {/* Mission Section */}
          <div className="rounded-lg bg-primary/5 p-8 text-center">
            <h2 className="mb-4 text-3xl font-bold">Our Mission</h2>
            <p className="mx-auto max-w-4xl text-lg text-muted-foreground">
              To empower every business with the tools, knowledge, and support they need to achieve
              and maintain cybersecurity compliance, protecting their operations, customers, and
              reputation in an increasingly digital world.
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
export default About;
