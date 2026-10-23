import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:scale-[1.02] active:scale-[0.98]',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary-hover',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'text-foreground border-border bg-transparent hover:bg-muted/50',
        success: 'border-transparent bg-success/10 text-success hover:bg-success/20',
        warning: 'border-transparent bg-warning/10 text-warning hover:bg-warning/20',
        info: 'border-transparent bg-info/10 text-info hover:bg-info/20',
        // Lead status variants using design system
        new: 'border-transparent bg-status-new/10 text-status-new hover:bg-status-new/20',
        contacted:
          'border-transparent bg-status-contacted/10 text-status-contacted hover:bg-status-contacted/20',
        qualified:
          'border-transparent bg-status-qualified/10 text-status-qualified hover:bg-status-qualified/20',
        proposal:
          'border-transparent bg-status-proposal/10 text-status-proposal hover:bg-status-proposal/20',
        negotiation:
          'border-transparent bg-status-negotiation/10 text-status-negotiation hover:bg-status-negotiation/20',
        confirmed:
          'border-transparent bg-status-confirmed/10 text-status-confirmed hover:bg-status-confirmed/20',
        lost: 'border-transparent bg-status-lost/10 text-status-lost hover:bg-status-lost/20',
        followup:
          'border-transparent bg-status-followup/10 text-status-followup hover:bg-status-followup/20',
        // Pipeline stage variants
        fresh: 'border-transparent bg-stage-fresh/10 text-stage-fresh hover:bg-stage-fresh/20',
        hot: 'border-transparent bg-stage-hot/10 text-stage-hot hover:bg-stage-hot/20',
        warm: 'border-transparent bg-stage-warm/10 text-stage-warm hover:bg-stage-warm/20',
        won: 'border-transparent bg-stage-won/10 text-stage-won hover:bg-stage-won/20',
        // Special variants
        gold: 'border-transparent bg-gold/10 text-gold hover:bg-gold/20',
        accent: 'border-transparent bg-accent/10 text-accent hover:bg-accent/20',
        muted: 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80',
        // WhatsApp variants
        'wa-online': 'border-transparent bg-wa-green text-white hover:bg-wa-green-dark',
        'wa-offline': 'border-transparent bg-neutral-400 text-white hover:bg-neutral-500',
      },
      size: {
        default: 'px-2.5 py-0.5 text-xs',
        sm: 'px-2 py-px text-[10px]',
        lg: 'px-3 py-1 text-sm',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

export { Badge, badgeVariants };
