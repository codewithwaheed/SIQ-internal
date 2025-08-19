import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { UnifiedHeader } from '@/components/ui/unified-header';
import { MasterKnowledgeManager } from "@/components/admin/MasterKnowledgeManager";
import { RAGTestInterface } from "@/components/chat/RAGTestInterface";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const KnowledgeBase = () => {

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-gradient-background flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          <UnifiedHeader context="dashboard" />
          
          <main className="flex-1 overflow-hidden">
            <div className="h-full p-6">
              <div className="space-y-6 max-w-6xl mx-auto">
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
                  
                  <TabsContent value="knowledge-base" className="h-full mt-4">
                    <MasterKnowledgeManager />
                  </TabsContent>
                  
                  <TabsContent value="rag-test" className="h-full mt-4">
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