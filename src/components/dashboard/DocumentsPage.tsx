import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
export const DocumentsPage = () => {
  return (
    <div className="page">
      <div className="page-title">
        <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
        <p className="text-muted-foreground">Manage your uploaded documents and files</p>
      </div>

      <div className="section-card text-center">
        <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
        <div>
          <h3 className="text-lg font-semibold">No documents yet</h3>
          <p className="text-muted-foreground">
            Upload your first document to get started with document-based AI conversations
          </p>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
        </Button>
      </div>
    </div>
  );
};
