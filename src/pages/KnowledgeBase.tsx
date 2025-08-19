import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/dashboard/AppSidebar';
import { UnifiedHeader } from '@/components/ui/unified-header';
import { MasterKnowledgeManager } from '@/components/admin/MasterKnowledgeManager';
import { RAGTestInterface } from '@/components/chat/RAGTestInterface';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const KnowledgeBase = () => {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-gradient-background">
        <AppSidebar />

        <div className="flex flex-1 flex-col">
          <UnifiedHeader context="dashboard" />

          <main className="flex-1 overflow-hidden">
            <div className="h-full p-6">
              <div className="mx-auto max-w-6xl space-y-6">
                <div>
                  <h1 className="text-3xl font-bold">Knowledge Base</h1>
                  <p className="text-muted-foreground">
                    Manage the master knowledge base and test RAG pipeline performance
                  </p>
                </div>

                <Tabs defaultValue="knowledge-base" className="h-full">
                  <TabsList>
                    <TabsTrigger value="knowledge-base">Knowledge Base Management</TabsTrigger>
                    <TabsTrigger value="rag-test">RAG Pipeline Test</TabsTrigger>
                  </TabsList>

                  <TabsContent value="knowledge-base" className="mt-4 h-full">
                    <MasterKnowledgeManager />
                  </TabsContent>

                  <TabsContent value="rag-test" className="mt-4 h-full">
                    <RAGTestInterface />
                  </TabsContent>
                </Tabs>
              </div>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default KnowledgeBase;
