import { Navigation } from '@/components/ui/navigation';
import { Footer } from '@/components/ui/footer';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { ArrowRight, Mail } from 'lucide-react';

const FAQ = () => {
  const faqs = [
    {
      question: 'What exactly is SentrIQ?',
      answer:
        "SentrIQ is your cybersecurity co-pilot. It combines the power of AI with the guidance of real human consultants to help you understand compliance, close gaps, and move with confidence. It's built for fast-moving businesses that need clarity, not complexity.",
    },
    {
      question: 'Who is this for?',
      answer:
        "SentrIQ is made for the ones who don't have time to slow down. Whether you're a founder trying to win government contracts, a CTO navigating an audit, or a consultant managing multiple clients, SentrIQ helps you stay ahead without getting overwhelmed.",
    },
    {
      question: 'How does the AI assistant actually help me?',
      answer:
        'You ask questions like "Do I need an SSP for CMMC Level 2?" or "Does this policy meet NIST 800-171?" and get real, actionable answers. The assistant understands the frameworks you care about and responds with clarity, not vague advice.',
    },
    {
      question: 'Can I upload my own documents?',
      answer:
        'Yes. You can upload your policies, assessments, or questionnaires. The AI will read and reference your files, which means the answers you get are specific to your business, not pulled from generic templates.',
    },
    {
      question: "What happens if the AI doesn't know something?",
      answer:
        "SentrIQ doesn't leave you hanging. If your question requires human expertise or legal review, you can escalate to a cybersecurity consultant directly inside the platform. The handoff is seamless, and the advisor gets your context instantly so you don't have to start from scratch.",
    },
    {
      question: 'Is my data secure?',
      answer:
        'Yes. Your data is encrypted, separated by organization, and stored with strict access controls. SentrIQ was built from day one with security in mind. You stay in control of your files, your chats, and your information.',
    },
    {
      question: "I'm not technical. Can I still use it?",
      answer:
        "Definitely. SentrIQ is designed for clarity. Whether you're technical or not, you'll be able to get answers, review policies, and take action without digging through PDFs or legalese.",
    },
    {
      question: 'What frameworks does SentrIQ support?',
      answer:
        'SentrIQ is built to support NIST 800-171 and 800-53, CMMC, SOC 2, HIPAA, FedRAMP (beta), and general cybersecurity best practices. We continuously update the system as standards change.',
    },
    {
      question: 'How is this different from ChatGPT?',
      answer:
        "SentrIQ is trained specifically for cybersecurity. It can review documents, answer compliance questions, and guide you through real regulatory frameworks. It also gives you access to expert consultants when you need them. You don't get that with generic AI.",
    },
    {
      question: 'Can SentrIQ replace a CISO?',
      answer:
        "In many cases, yes. SentrIQ combines AI-driven guidance with real-time access to experienced cybersecurity consultants. Instead of hiring full-time, you get strategic support when you need it and automation when you don't. It's a smart, scalable alternative to traditional staffing.",
    },
    {
      question: 'Can I use SentrIQ as a consultant or MSP?',
      answer:
        'Yes. If you manage clients or deliver compliance services, SentrIQ helps you move faster and deliver more value. You can streamline policy reviews, reduce repetitive tasks, and even offer AI-assisted guidance under your own brand.',
    },
    {
      question: 'How do I get started?',
      answer:
        'Sign up directly on the platform. You can begin chatting with the assistant, upload a few documents, and see how it handles your toughest compliance questions. If you need a human touch, you can connect with a consultant at any time.',
    },
    {
      question: 'How do I become a SentrIQ consultant?',
      answer:
        "We're building a trusted network of cybersecurity professionals who want to support SMBs through meaningful, flexible work. If you're experienced with frameworks like NIST, CMMC, SOC 2, or FedRAMP and want to provide on-demand guidance, you can apply to join the SentrIQ consultant network by clicking here.",
    },
  ];

  return (
    <div className="min-h-screen animate-fade-in bg-background">
      <Navigation />

      <main className="animate-fade-in py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Hero Section */}
          <div className="mb-16 animate-fade-in text-center">
            <h1 className="mb-6 text-4xl font-bold text-foreground">Frequently Asked Questions</h1>
            <p className="mx-auto max-w-3xl text-xl text-muted-foreground">
              Get answers to common questions about SentrIQ and how it can help streamline your
              cybersecurity compliance journey.
            </p>
          </div>

          {/* FAQ Accordion */}
          <div className="mb-16 animate-fade-in" style={{ animationDelay: '300ms' }}>
            <Accordion type="single" collapsible className="w-full space-y-4">
              {faqs.map((faq, index) => (
                <AccordionItem
                  key={index}
                  value={`item-${index}`}
                  className="hover-scale rounded-lg border border-border px-6 transition-all duration-200"
                >
                  <AccordionTrigger className="py-6 text-left hover:no-underline">
                    <span className="text-lg font-semibold">{faq.question}</span>
                  </AccordionTrigger>
                  <AccordionContent className="pb-6">
                    <p className="leading-relaxed text-muted-foreground">
                      {faq.question === 'How do I become a SentrIQ consultant?' ? (
                        <>
                          We're building a trusted network of cybersecurity professionals who want
                          to support SMBs through meaningful, flexible work. If you're experienced
                          with frameworks like NIST, CMMC, SOC 2, or FedRAMP and want to provide
                          on-demand guidance, you can apply to join the SentrIQ consultant network
                          by clicking{' '}
                          <Link
                            to="/consultant-signup"
                            className="font-medium text-accent hover:underline"
                          >
                            here
                          </Link>
                          .
                        </>
                      ) : (
                        faq.answer
                      )}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>

          {/* Contact Section */}
          <div
            className="animate-fade-in rounded-lg bg-gradient-background p-8 text-center"
            style={{ animationDelay: '600ms' }}
          >
            <h2 className="mb-4 text-3xl font-bold">Still have questions?</h2>
            <p className="mb-6 text-lg text-muted-foreground">
              We're here to help. Reach out to us and we'll get back to you as soon as possible.
            </p>
            <div className="flex flex-col justify-center gap-4 sm:flex-row">
              <Link to="/contact">
                <Button size="lg" className="bg-accent text-white hover:bg-accent/90">
                  <Mail className="mr-2 h-5 w-5" />
                  Contact Us
                </Button>
              </Link>
              <Link to="/auth">
                <Button variant="outline" size="lg">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Email us directly:{' '}
              <a href="mailto:hello@sentriq.io" className="text-accent hover:underline">
                hello@sentriq.io
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FAQ;
