'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';

interface LeadInfoFieldProps {
  icon: React.ComponentType<{ className: string }>;
  label: string;
  value?: string | React.ReactNode;
  badge?: { text: string; variant?: 'default' | 'secondary' | 'destructive' | 'outline' };
  className?: string;
}

export function LeadInfoField({
  icon: Icon,
  label,
  value,
  badge,
  className = '',
}: LeadInfoFieldProps) {
  if (!value) return null;

  return (
    <div className={`flex items-center gap-2 p-2 sm:p-3 bg-muted/50 rounded-lg ${className}`}>
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] sm:text-xs text-muted-foreground">{label}</p>
        {badge ? (
          <Badge variant={badge.variant || 'outline'} className="text-[10px] sm:text-xs">
            {badge.text}
          </Badge>
        ) : (
          <p className="font-medium text-xs sm:text-sm truncate">{value}</p>
        )}
      </div>
    </div>
  );
}
