import React from 'react';
import { CVELookupInterface } from '@/components/chat/CVELookupInterface';
import { LatestCVEsDashboard } from '@/components/admin/LatestCVEsDashboard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export const CVESecurityPage = () => {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">CVE Security Intelligence</h1>
        <p className="text-muted-foreground">
          Real-time vulnerability monitoring and analysis using the National Vulnerability Database
        </p>
      </div>

      <Tabs defaultValue="lookup" className="space-y-6">
        <TabsList>
          <TabsTrigger value="lookup">CVE Lookup</TabsTrigger>
          <TabsTrigger value="latest">Latest Vulnerabilities</TabsTrigger>
        </TabsList>

        <TabsContent value="lookup">
          <CVELookupInterface />
        </TabsContent>

        <TabsContent value="latest">
          <LatestCVEsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
};