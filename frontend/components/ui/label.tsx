import * as React from 'react';
import * as LabelPrimitive from '@radix-ui/react-label';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const labelVariants = cva(
  'text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1.5'
);

export interface LabelProps
  extends
    React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>,
    VariantProps<typeof labelVariants> {
  required?: boolean;
  icon?: React.ReactNode;
  hint?: string;
}

const Label = React.forwardRef<React.ElementRef<typeof LabelPrimitive.Root>, LabelProps>(
  ({ className, required, icon, hint, children, ...props }, ref) => (
    <div className="space-y-1">
      <LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props}>
        {icon && <span className="text-muted-foreground">{icon}</span>}
        {children}
        {required && <span className="text-destructive ml-0.5">*</span>}
      </LabelPrimitive.Root>
      {hint && <p className="text-xs text-muted-foreground/80 pl-0.5">{hint}</p>}
    </div>
  )
);
Label.displayName = LabelPrimitive.Root.displayName;

export { Label };
