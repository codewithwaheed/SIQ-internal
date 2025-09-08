import { Card, CardContent } from '@/components/ui/card';
import { DocumentUpload } from '@/components/chat/DocumentUpload';

interface Props {
  show: boolean;
  user: any;
  isDemo: boolean;
  onDocumentUploaded: (doc: any) => void;
  onUploadAndAsk?: (message: string, documentIds: string[], documentNames: string[]) => void;
}

export function DocumentUploadTray({
  show,
  user,
  isDemo,
  onDocumentUploaded,
  onUploadAndAsk,
}: Props) {
  if (!(show && !isDemo && user)) return null;
  return (
    <div className="z-35 fixed bottom-20 left-0 right-0 md:left-64 lg:left-64">
      <div className="mx-auto max-w-4xl p-3 sm:p-4">
        <Card className="border-dashed border-accent/50 bg-background/95 shadow-lg backdrop-blur-sm">
          <CardContent className="p-3 sm:p-4">
            <DocumentUpload
              onDocumentUploaded={onDocumentUploaded}
              onSubmitWithMessage={onUploadAndAsk}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
