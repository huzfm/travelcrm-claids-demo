'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TemplateCardProps {
  template: any;
  onUseTemplate?: (template: any) => void;
}

const destinationImages: Record<string, string> = {
  Paris: 'from-neutral-600 to-neutral-600',
  Dubai: 'from-red-600 to-red-600',
  Bali: 'from-neutral-500 to-neutral-500',
  Tokyo: 'from-red-500 to-red-600',
  Maldives: 'from-neutral-400 to-neutral-500',
  London: 'from-neutral-600 to-neutral-700',
  'New York': 'from-neutral-500 to-neutral-600',
  Singapore: 'from-red-500 to-red-500',
  Bangkok: 'from-red-500 to-red-500',
  Switzerland: 'from-neutral-500 to-neutral-600',
  Rome: 'from-red-600 to-red-600',
  Barcelona: 'from-neutral-500 to-red-500',
  Sydney: 'from-neutral-500 to-neutral-600',
  Maui: 'from-neutral-500 to-neutral-600',
  Istanbul: 'from-red-600 to-red-600',
  Phuket: 'from-neutral-500 to-neutral-500',
  Santorini: 'from-neutral-400 to-neutral-500',
  Dubrovnik: 'from-neutral-600 to-neutral-600',
  default: 'from-neutral-600 to-neutral-600',
};

function getDestinationGradient(dest: string): string {
  const key = Object.keys(destinationImages).find(k =>
    dest?.toLowerCase().includes(k.toLowerCase())
  );
  return destinationImages[key || 'default'];
}

export function TemplateCard({ template, onUseTemplate }: TemplateCardProps) {
  const days = template.daysJson?.length || template.days?.length || 0;
  const gradient = getDestinationGradient(template.destination);

  return (
    <div className="group border rounded-xl overflow-hidden shadow-sm hover:shadow-travel-lg transition-all duration-300 hover:-translate-y-1">
      <div className={cn('relative h-28 bg-linear-to-br', gradient)}>
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" />
        <div className="absolute bottom-3 left-3">
          <h3 className="text-base font-bold text-white">{template.name || template.title}</h3>
          <div className="flex items-center gap-2 text-white/80 text-xs mt-0.5">
            <MapPin className="h-3 w-3" />
            {template.destination}
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Calendar className="h-3 w-3" />
          {days} {days === 1 ? 'day' : 'days'}
          {template.isGlobal && (
            <Badge variant="outline" className="ml-auto text-[10px]">
              Global
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mb-3">
          Use this template to quickly create a new {days}-day trip
        </p>
        <Button
          variant="outline"
          size="sm"
          className="w-full group-hover:border-primary/50"
          onClick={() => onUseTemplate?.(template)}
        >
          Use Template <ArrowRight className="ml-1 h-3 w-3" />
        </Button>
      </div>
    </div>
  );
}
