'use client';

import { GitBranch, Route, Check, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface Step2ModeSelectionProps {
  destination: string;
  onSelect: (mode: 'single' | 'multi') => void;
  templateName?: string;
  templateDaysCount?: number;
}

export function Step2ModeSelection({
  destination,
  onSelect,
  templateName,
  templateDaysCount,
}: Step2ModeSelectionProps) {
  return (
    <div className="space-y-6 max-w-2xl mx-auto px-2 sm:px-0">
      {/* Template Banner */}
      {templateName && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-3 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 shrink-0">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-muted-foreground">Using template</p>
              <p className="font-semibold text-sm truncate">{templateName}</p>
            </div>
            {templateDaysCount != null && templateDaysCount > 0 && (
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/30 shrink-0"
              >
                {templateDaysCount} days
              </Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Header */}
      <div className="text-center space-y-2 px-2">
        <div className="inline-flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 mb-3">
          <Route className="h-6 w-6 sm:h-7 sm:w-7 text-primary" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold">Choose Your Itinerary Style</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          For your trip to{' '}
          <span className="font-semibold text-foreground">{destination || 'this destination'}</span>
          , how would you like to present options to your client?
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 px-2 sm:px-0">
        {/* Single Option Card */}
        <Card
          className={cn(
            'group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-primary/50',
            'border-2 hover:border-primary'
          )}
          onClick={() => onSelect('single')}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-neutral-100">
                <Route className="h-6 w-6 text-neutral-600" />
              </div>
              <Badge variant="outline" className="bg-neutral-50 text-neutral-700 border-neutral-200">
                Recommended
              </Badge>
            </div>
            <CardTitle className="text-xl mt-3">Single Package</CardTitle>
            <CardDescription>
              One complete itinerary with one hotel, one vehicle, and planned activities per day.
              Perfect for straightforward trips.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[
                { label: 'One fixed price', icon: '✓' },
                { label: 'Single hotel per day', icon: '✓' },
                { label: 'One transport option', icon: '✓' },
                { label: 'Ready to send to client', icon: '✓' },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-neutral-100 flex items-center justify-center">
                    <Check className="h-3 w-3 text-neutral-600" />
                  </div>
                  <span className="text-muted-foreground">{item.label}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Multi Option Card */}
        <Card
          className={cn(
            'group cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-red-500/50',
            'border-2 hover:border-red-500'
          )}
          onClick={() => onSelect('multi')}
        >
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="p-3 rounded-xl bg-red-100">
                <GitBranch className="h-6 w-6 text-red-600" />
              </div>
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                Pro
              </Badge>
            </div>
            <CardTitle className="text-xl mt-3">Multiple Options</CardTitle>
            <CardDescription>
              Create 3 packages (Basic, Standard, Premium) with different hotels and vehicles. Great
              for giving clients choices.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[
                { label: 'Different pricing tiers', icon: '✓' },
                { label: 'Different hotel options', icon: '✓' },
                { label: 'Multiple vehicle choices', icon: '✓' },
                { label: 'Client picks their preference', icon: '✓' },
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-sm">
                  <div className="h-5 w-5 rounded-full bg-neutral-100 flex items-center justify-center">
                    <Check className="h-3 w-3 text-neutral-600" />
                  </div>
                  <span className="text-muted-foreground">{item.label}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Helper text */}
      <p className="text-center text-xs sm:text-sm text-muted-foreground px-4">
        You can always edit these settings later before finalizing the itinerary.
      </p>
    </div>
  );
}
