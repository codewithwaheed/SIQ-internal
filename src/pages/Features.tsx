import { Navigation } from "@/components/ui/navigation";
import { Footer } from "@/components/ui/footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  MessageSquare, 
  Upload, 
  Brain, 
  Users, 
  Zap, 
  FileText, 
  TrendingUp, 
  Shield,
  Clock,
  CheckCircle,
  Sparkles,
  Target
} from "lucide-react";

const features = [
  {
    title: "AI Chat Assistant",
    description: "Intelligent conversational AI that understands context and provides detailed, helpful responses to your questions.",
    icon: MessageSquare,
    color: "text-blue-500",
    category: "Core AI"
  },
  {
    title: "Document Analysis",
    description: "Upload documents and get instant AI-powered analysis, insights, and recommendations.",
    icon: FileText,
    color: "text-green-500",
    category: "Document Processing"
  },
  {
    title: "Smart Insights",
    description: "Advanced AI algorithms generate actionable insights from your data and documents.",
    icon: Brain,
    color: "text-purple-500",
    category: "AI Intelligence"
  },
  {
    title: "Expert Consultations",
    description: "Connect with human experts when you need specialized knowledge and guidance.",
    icon: Users,
    color: "text-orange-500",
    category: "Human Support"
  },
  {
    title: "Fast Processing",
    description: "Lightning-fast AI responses and document processing to keep you productive.",
    icon: Zap,
    color: "text-yellow-500",
    category: "Performance"
  },
  {
    title: "Batch Upload",
    description: "Process multiple documents at once with our advanced batch processing capabilities.",
    icon: Upload,
    color: "text-indigo-500",
    category: "Document Processing"
  },
  {
    title: "Analytics Dashboard",
    description: "Track your usage, insights generated, and progress with detailed analytics.",
    icon: TrendingUp,
    color: "text-pink-500",
    category: "Analytics"
  },
  {
    title: "Secure Platform",
    description: "Enterprise-grade security with end-to-end encryption and data protection.",
    icon: Shield,
    color: "text-red-500",
    category: "Security"
  },
  {
    title: "24/7 Availability",
    description: "Access your AI assistant anytime, anywhere with our always-on platform.",
    icon: Clock,
    color: "text-teal-500",
    category: "Availability"
  },
  {
    title: "Task Generation",
    description: "Convert AI insights into actionable tasks and step-by-step workflows.",
    icon: CheckCircle,
    color: "text-emerald-500",
    category: "Productivity"
  },
  {
    title: "Advanced AI Models",
    description: "Powered by the latest AI technology for superior understanding and responses.",
    icon: Sparkles,
    color: "text-violet-500",
    category: "Core AI"
  },
  {
    title: "Custom Solutions",
    description: "Tailored AI solutions and integrations for enterprise customers.",
    icon: Target,
    color: "text-cyan-500",
    category: "Enterprise"
  }
];

const categories = [
  "All",
  "Core AI",
  "Document Processing", 
  "AI Intelligence",
  "Human Support",
  "Performance",
  "Analytics",
  "Security",
  "Availability",
  "Productivity",
  "Enterprise"
];

const Features = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      {/* Hero Section */}
      <section className="py-16 lg:py-24 bg-gradient-background animate-fade-in">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl lg:text-6xl font-bold text-foreground mb-6">
            Powerful AI Features
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto mb-8">
            Discover the comprehensive suite of AI-powered tools and capabilities designed to enhance your productivity and decision-making.
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {categories.map((category) => (
              <Badge 
                key={category} 
                variant="secondary" 
                className="text-sm py-1 px-3"
              >
                {category}
              </Badge>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="group hover:shadow-elevated transition-all duration-300 border-l-4 border-l-transparent hover:border-l-accent"
              >
                <CardHeader className="pb-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className={`p-2 rounded-lg bg-muted/50 ${feature.color}`}>
                      <feature.icon className="h-6 w-6" />
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {feature.category}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl group-hover:text-accent transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 lg:py-24 bg-gradient-background">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
            Ready to experience the power of AI?
          </h2>
          <p className="text-lg text-muted-foreground mb-8">
            Join thousands of users who are already leveraging AI to transform their workflow.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/auth" 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              Get Started Free
            </Link>
            <Link 
              to="/pricing" 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Features;