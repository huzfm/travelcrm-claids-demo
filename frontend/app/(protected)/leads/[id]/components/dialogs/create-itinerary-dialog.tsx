'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateItinerary, useItineraryTemplates } from '@/hooks/useItineraries';
import { Plane, MapPin, Calendar, Users, Loader2, FileText } from 'lucide-react';
import { toast } from 'sonner';
import type { Lead } from '@/types';
import type { TripType } from '@/types/itinerary.types';

// Helper to calculate days between two dates
function calculateDays(from: string, to: string): number {
  const start = new Date(from);
  const end = new Date(to);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1;
}

// Helper to format date as YYYY-MM-DD
function formatDate(dateStr: string): string {
  if (!dateStr) return '';
  return new Date(dateStr).toISOString().split('T')[0];
}

interface CreateItineraryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
}

export function CreateItineraryDialog({ open, onOpenChange, lead }: CreateItineraryDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const createItinerary = useCreateItinerary();
  const { data: templates } = useItineraryTemplates();

  const [title, setTitle] = useState('');
  const [destination, setDestination] = useState('');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [days, setDays] = useState('1');
  const [totalTravelers, setTotalTravelers] = useState('2');

  const templatesArray = Array.isArray(templates) ? templates : [];

  const selectedTemplate = templatesArray.find(t => t.id === selectedTemplateId);

  // Pre-fill all available lead data when dialog opens
  useEffect(() => {
    if (open && lead) {
      // Pre-fill destination from lead
      if (lead.destination) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- prefills the form when the dialog opens
        setDestination(lead.destination);
      }

      // Pre-fill travelers from lead's numberOfPax
      const pax = lead.numberOfPax ? parseInt(String(lead.numberOfPax)) : 2;
      setTotalTravelers(String(pax));

      // Pre-fill date range and calculate days
      if (lead.travelDateFrom && lead.travelDateTo) {
        setStartDate(formatDate(lead.travelDateFrom));
        setEndDate(formatDate(lead.travelDateTo));
        setDays(String(calculateDays(lead.travelDateFrom, lead.travelDateTo)));
      }

      // Set title with destination if available
      setTitle(`${lead.name}'s ${lead.destination || 'Trip'}`);
    }
  }, [open, lead]);

  // Pre-fill from selected template
  useEffect(() => {
    if (selectedTemplate) {
      if (selectedTemplate.destination && !destination) {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- applies template defaults on selection
        setDestination(selectedTemplate.destination);
      }
      const templateDays = selectedTemplate.daysJson?.length || selectedTemplate.days?.length || 1;
      if (!days || days === '1') {
        setDays(String(templateDays));
      }
      // Update title to use destination if template has one
      if (selectedTemplate.destination && title === `${lead?.name}'s Trip`) {
        setTitle(`${lead?.name}'s ${selectedTemplate.destination} Trip`);
      }
    }
  }, [selectedTemplate, destination, days, title, lead]);

  // Auto-update title when destination changes
  useEffect(() => {
    if (
      (destination && title === `${lead?.name}'s Trip`) ||
      title === `${lead?.name}'s ${lead?.destination || 'Trip'}`
    ) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- keeps the default title following the destination
      setTitle(`${lead?.name}'s ${destination} Trip`);
    }
  }, [destination, lead, title]);

  const handleSubmit = async () => {
    if (!title.trim() || !destination.trim()) {
      toast.error('Please fill in trip name and destination');
      return;
    }

    try {
      const numDays = parseInt(days) || 5;
      const travelers = parseInt(totalTravelers) || 2;

      // Use template days if selected, otherwise create empty days
      let daysJson;
      if (selectedTemplate?.daysJson && selectedTemplate.daysJson.length > 0) {
        // Clone template days and reset dates
        daysJson = selectedTemplate.daysJson.map((day: any, index: number) => ({
          ...day,
          dayNumber: index + 1,
          date: '',
        }));
      } else {
        // Create empty days structure
        daysJson = Array.from({ length: numDays }, (_, i) => ({
          dayNumber: i + 1,
          date: '',
          title: `Day ${i + 1}`,
          activities: [],
          meals: { breakfast: true, lunch: false, dinner: false },
        }));
      }

      const result = await createItinerary.mutateAsync({
        title: title.trim(),
        destination: destination.trim(),
        leadId: lead.id,
        daysJson,
        totalTravelers: travelers,
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
        ...(lead.tripType ? { tripType: lead.tripType as TripType } : {}),
        ...(selectedTemplate ? { templateId: selectedTemplate.id } : {}),
        included: ['Flights', 'Hotels', 'Transfers', 'Meals', 'Sightseeing'],
        excluded: ['Personal Expenses', 'Visa Fees', 'Travel Insurance'],
      });

      toast.success(
        'Itinerary created! Add activities, hotels and vehicles from the itinerary page.'
      );
      queryClient.invalidateQueries({ queryKey: ['itineraries'] });
      onOpenChange(false);
      router.push(`/itineraries/${result.id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      toast.error(e?.response?.data?.error || e?.message || 'Failed to create itinerary');
    }
  };

  const handleSelectTemplate = (templateId: string | null) => {
    setSelectedTemplateId(templateId);
  };

  const handleDestinationChange = (value: string) => {
    setDestination(value);
    if (!title || title === `${lead?.name}'s Trip`) {
      setTitle(`${lead?.name}'s ${value} Trip`);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-accent/10">
              <Plane className="h-5 w-5 text-accent" />
            </div>
            Create Itinerary
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Lead Info Preview */}
          <div className="rounded-lg border bg-muted/30 p-3 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-sm font-bold text-primary">{lead.name?.charAt(0) || '?'}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-foreground truncate">{lead.name}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-mono">{lead.phone}</span>
                {lead.email && (
                  <>
                    <span>·</span>
                    <span className="truncate">{lead.email}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Trip Name */}
          <div className="space-y-2">
            <Label htmlFor="trip-title">Trip Name *</Label>
            <Input
              id="trip-title"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., John's Dubai Adventure"
            />
          </div>

          {/* Destination */}
          <div className="space-y-2">
            <Label htmlFor="destination">Destination *</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
              </div>
              <Input
                id="destination"
                value={destination}
                onChange={e => handleDestinationChange(e.target.value)}
                placeholder="Enter destination (e.g., Dubai, Bali)"
                className="pl-9"
              />
            </div>
          </div>

          {/* Template Selection - Always visible */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Use Template
              </Label>
              {selectedTemplateId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSelectTemplate(null)}
                  className="h-7 text-xs"
                >
                  Clear
                </Button>
              )}
            </div>

            <select
              value={selectedTemplateId || ''}
              onChange={e => handleSelectTemplate(e.target.value || null)}
              className={`w-full h-10 px-3 rounded-md border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
                selectedTemplateId ? 'border-primary bg-primary/5' : 'border-input'
              }`}
            >
              <option value="">Start from scratch (empty days)</option>
              {templatesArray.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name || template.title} - {template.destination} (
                  {template.daysJson?.length || template.days?.length || 0} days)
                </option>
              ))}
            </select>

            {selectedTemplate && (
              <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <div className="p-1.5 rounded-md bg-primary text-primary-foreground">
                    <FileText className="h-3 w-3" />
                  </div>
                  <span className="font-medium text-sm">
                    {selectedTemplate.name || selectedTemplate.title}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground grid grid-cols-2 gap-1">
                  <p>
                    Destination: <span className="font-medium">{selectedTemplate.destination}</span>
                  </p>
                  <p>
                    Days:{' '}
                    <span className="font-medium">
                      {selectedTemplate.daysJson?.length || selectedTemplate.days?.length || 0}
                    </span>
                  </p>
                </div>
                <p className="text-xs text-primary mt-2 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                  Activities will be pre-filled from template
                </p>
              </div>
            )}

            {templatesArray.length === 0 && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <span className="text-red-500">*</span>
                No templates saved. Save an existing itinerary as template to use here.
              </p>
            )}
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={e => {
                  setStartDate(e.target.value);
                  if (endDate && e.target.value && startDate) {
                    const newDays = calculateDays(e.target.value, endDate);
                    if (newDays > 0) setDays(String(newDays));
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={e => {
                  setEndDate(e.target.value);
                  if (startDate && e.target.value) {
                    const newDays = calculateDays(startDate, e.target.value);
                    if (newDays > 0) setDays(String(newDays));
                  }
                }}
              />
            </div>
          </div>

          {/* Number of Days and Travelers */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="days">
                <Calendar className="h-3.5 w-3.5 inline mr-1" />
                Number of Days
              </Label>
              <Input
                id="days"
                type="number"
                min="1"
                max="30"
                value={days}
                onChange={e => setDays(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Add more days after creating</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="travelers">
                <Users className="h-3.5 w-3.5 inline mr-1" />
                Travelers *
              </Label>
              <Input
                id="travelers"
                type="number"
                min="1"
                max="20"
                value={totalTravelers}
                onChange={e => setTotalTravelers(e.target.value)}
              />
            </div>
          </div>

          {/* Preview */}
          {title && destination && (
            <div className="rounded-xl p-4 border bg-muted/30">
              <p className="text-xs text-muted-foreground mb-1">Preview</p>
              <p className="font-bold text-lg text-foreground">{title}</p>
              <p className="text-sm flex items-center gap-1 mt-1 text-muted-foreground">
                <MapPin className="h-3 w-3" /> {destination} · {days || 5} Days ·{' '}
                {totalTravelers || 2} Travelers
              </p>
              {(startDate || endDate) && (
                <p className="text-sm text-muted-foreground mt-1">
                  <Calendar className="h-3 w-3 inline mr-1" />
                  {startDate || '—'} → {endDate || '—'}
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={createItinerary.isPending || !title || !destination}
          >
            {createItinerary.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" /> Creating...
              </>
            ) : (
              <>
                <Plane className="h-4 w-4 mr-2" /> Create Itinerary
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
