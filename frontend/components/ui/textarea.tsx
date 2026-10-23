import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  maxLength?: number;
  showCount?: boolean;
  error?: string;
  hint?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, maxLength, showCount, error, hint, value, ...props }, ref) => {
    const charCount = typeof value === 'string' ? value.length : 0;
    const isNearLimit = maxLength ? charCount > maxLength * 0.9 : false;
    const isOverLimit = maxLength ? charCount > maxLength : false;

    return (
      <div className="space-y-1.5">
        <textarea
          className={cn(
            'flex min-h-[100px] w-full rounded-lg border bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground transition-all duration-200',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:border-accent',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'hover:border-accent/70',
            'resize-none',
            error
              ? 'border-destructive focus-visible:ring-destructive/20 border-2'
              : 'border-input',
            className
          )}
          ref={ref}
          value={value}
          maxLength={maxLength}
          {...props}
        />
        <div className="flex items-center justify-between">
          <div>
            {error && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                    clipRule="evenodd"
                  />
                </svg>
                {error}
              </p>
            )}
            {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          {showCount && maxLength && (
            <p
              className={cn(
                'text-xs tabular-nums transition-colors',
                isOverLimit
                  ? 'text-destructive font-medium'
                  : isNearLimit
                    ? 'text-warning'
                    : 'text-muted-foreground'
              )}
            >
              {charCount}/{maxLength}
            </p>
          )}
        </div>
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';

export { Textarea };
