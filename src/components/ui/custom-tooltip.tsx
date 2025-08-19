import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface TooltipProps {
  children: ReactNode;
  content: string;
  className?: string;
}

export function Tooltip({ children, content, className }: TooltipProps) {
  return (
    <div className="group relative inline-block">
      {children}
      <div
        className={cn(
          'absolute bottom-full left-1/2 mb-2 -translate-x-1/2 transform',
          'rounded bg-gray-900 px-2 py-1 text-xs text-white',
          'opacity-0 transition-opacity duration-200 group-hover:opacity-100',
          'pointer-events-none z-50 whitespace-nowrap',
          className,
        )}
      >
        {content}
        <div className="absolute left-1/2 top-full -translate-x-1/2 transform border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}
