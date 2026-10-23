'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlusCircle, MapPin } from 'lucide-react';

interface CreateItineraryCardProps {
  leadId: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export function CreateItineraryCard({
  leadId,
  disabled = false,
  isLoading = false,
}: CreateItineraryCardProps) {
  const router = useRouter();

  return (
    <Card className="border-l-4 border-l-accent overflow-hidden">
      <CardHeader className="pb-3 px-3 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <MapPin className="h-5 w-5 shrink-0" />
          Create Itinerary
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 pb-4">
        <p className="text-sm text-muted-foreground mb-4">
          Create a travel itinerary for this lead with destinations, hotels, and activities.
        </p>
        <Button
          onClick={() => router.push(`/itineraries/new?leadId=${leadId}`)}
          disabled={disabled || isLoading}
          className="w-full sm:w-auto"
        >
          <PlusCircle className="mr-2 h-4 w-4" />
          {isLoading ? 'Creating...' : 'New Itinerary'}
        </Button>
      </CardContent>
    </Card>
  );
}
