import { Card, CardContent } from '@/components/ui/card';
import { InlineUpgradeNudge } from '@/components/ui/feature-gate';
import { ArrowUp } from 'lucide-react';

interface Props {
  sidebarCollapsed: boolean;
  userFirstName: string;
  timeOfDay: string;
  suggestedPrompts: string[];
  isDemo: boolean;
  user: any;
  showDocumentUpload: boolean;
  onToggleDocumentUpload: () => void;
  onPromptClick: (p: string) => void;
  composerRef: React.RefObject<HTMLDivElement>;
  input: string;
  children: React.ReactNode; // for composer
  documentUploadSlot?: React.ReactNode;
}

export function EmptyStateHero({
  sidebarCollapsed,
  userFirstName,
  timeOfDay,
  suggestedPrompts,
  isDemo,
  user,
  showDocumentUpload,
  onToggleDocumentUpload,
  onPromptClick,
  composerRef,
  children,
  documentUploadSlot,
}: Props) {
  return (
    <div className={`page flex h-full flex-col ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <main className="app-content flex flex-1 items-center justify-center px-4 py-8">
        <div className={`w-full max-w-2xl text-center transition-all duration-300 ${sidebarCollapsed ? 'ml-0' : 'ml-0'}`}>
          <div className="relative mb-12">
            <div className="absolute left-1/2 top-1/2 -z-10 h-32 w-32 -translate-x-1/2 -translate-y-1/2 transform rounded-full bg-gradient-to-br from-blue-500/50 to-cyan-400/50 blur-xl"></div>
            <div className="animate-pulse-scale relative z-10 mx-auto h-16 w-16">
              <img
                src="/lovable-uploads/96610ed2-0036-4aab-bad3-a8a1b238393c.png"
                alt="SentriQ Logo"
                className="h-full w-full object-contain"
                style={{ filter: 'drop-shadow(0 8px 20px rgba(59, 130, 246, 0.5))' }}
              />
            </div>
          </div>

          <h1 className="mb-4 text-3xl font-semibold text-foreground sm:text-4xl">
            {timeOfDay}, {userFirstName}
          </h1>
          <p className="mb-12 text-xl text-muted-foreground sm:text-2xl">
            How can I help you today?
          </p>

          <div className="w-full space-y-4">
            <div className="mx-auto grid max-w-4xl grid-cols-1 gap-3 md:grid-cols-2">
              {suggestedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  onClick={() => onPromptClick(prompt)}
                  className="group rounded-xl border border-border bg-card p-4 text-left transition-all duration-200 hover:bg-muted/50"
                >
                  <div className="flex items-center justify-between">
                    <span className="pr-2 text-sm text-foreground">{prompt}</span>
                    <ArrowUp className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-foreground" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </main>

      {!isDemo && user && showDocumentUpload && (
        <div className="space-y-3 px-4 pb-4">
          <Card className="mx-auto max-w-4xl border-dashed">
            <CardContent className="p-3 sm:p-4">
              {documentUploadSlot}
            </CardContent>
          </Card>
          <div className="mx-auto max-w-4xl">
            <InlineUpgradeNudge feature="document_upload" />
          </div>
        </div>
      )}

      <div className={`chat-composer transition-all duration-300 ${sidebarCollapsed ? 'ml-0' : 'ml-0'}`}>
        <div className="composer-shell" ref={composerRef}>
          <div className="inner">
            {children}
          </div>
        </div>
      </div>

      {isDemo && (
        <div className="bg-muted/20 p-3 text-center sm:p-4">
          <p className="px-4 text-sm text-muted-foreground">
            This is a demo.{' '}
            <a href="/auth" className="font-medium text-accent hover:underline">
              Get your virtual CISO
            </a>{' '}
            for full strategic guidance and compliance expertise.
          </p>
        </div>
      )}
    </div>
  );
}
