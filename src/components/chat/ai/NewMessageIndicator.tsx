import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';

interface Props {
  show: boolean;
  onClick: () => void;
}

export function NewMessageIndicator({ show, onClick }: Props) {
  if (!show) return null;

  return (
    <div className="absolute bottom-20 left-1/2 z-10 -translate-x-1/2 transform sm:bottom-24">
      <Button
        onClick={onClick}
        size="sm"
        className="touch-manipulation rounded-full bg-primary px-4 py-2 text-sm text-primary-foreground shadow-lg transition-all duration-200 hover:shadow-xl"
      >
        <ArrowUp className="mr-2 h-4 w-4" />
        New messages
      </Button>
    </div>
  );
}
