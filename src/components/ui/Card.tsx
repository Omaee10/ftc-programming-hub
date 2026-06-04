import React from 'react';
import { cn } from '@/lib/utils';

type CardAccent = 'none' | 'success' | 'warning' | 'danger';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  accent?: CardAccent;
  hover?: boolean;
  children: React.ReactNode;
}

const accentClasses: Record<CardAccent, string> = {
  none: 'bg-slate-800/40 border-slate-700/50',
  success: 'bg-emerald-950/30 border-emerald-700/30',
  warning: 'bg-amber-950/30 border-amber-700/30',
  danger: 'bg-red-950/30 border-red-700/30',
};

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, accent = 'none', hover = false, children, ...props }, ref) => (
    <div
      className={cn(
        'rounded-lg border transition-all duration-200',
        accentClasses[accent],
        hover && 'hover:shadow-lg hover:border-slate-600/70 hover:translate-y-[-4px] cursor-pointer',
        className
      )}
      ref={ref}
      {...props}
    >
      {children}
    </div>
  )
);

Card.displayName = 'Card';

export { Card };
export type { CardProps };
