'use client';

import { Suspense, use, useCallback, useMemo, useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/currency';
import type { ShareItineraryData } from '@/lib/itinerary-share-format';
import { ItineraryHeader } from './components/itinerary-header';
import { TripSummaryCard } from './components/trip-summary-card';
import { DayTimeline } from './components/day-timeline';
import { FlightsCard } from './components/flights-card';
import { ActivityDialog } from './components/activity-dialog';
import { ShareDialog } from './components/share-dialog';
import { TemplateDialog } from './components/template-dialog';
import { PdfProgressOverlay } from '@/components/itineraries/pdf-progress-overlay';
import { PricingDialog } from '@/components/itinerary/pricing-dialog';
import { useAuthContext } from '@/components/providers';
import { usePdfSettings } from '@/hooks/useSettings';
import {
  groupHotelStays,
  type HotelStayGroup,
  type HotelStayInput,
  type ReservationGuest,
  type ReservationCompany,
} from '../new/utils/reservationEmail';
import { useItineraryDetail } from './hooks/use-itinerary-detail';

function DetailSkeleton() {
  return (
    <PageWrapper>
      <div className="space-y-4">
        <div className="h-8 w-48 animate-pulse rounded bg-muted" />
        <div className="h-24 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
        <div className="h-48 animate-pulse rounded-xl bg-muted" />
      </div>
    </PageWrapper>
  );
}

function ItineraryDetailContent({ id }: { id: string }) {
  const [showPricingDialog, setShowPricingDialog] = useState(false);

  const {
    itinerary,
    isLoading,
    days,
    displayDays,
    expandedDays,
    setExpandedDays,
    saveStatus,
    tripTitle,
    tripDestination,
    tripStartDate,
    tripEndDate,
    tripTravelers,
    salutation,
    quotes,
    setQuotes,
    selectedQuotes,
    setSelectedQuotes,
    options,
    setOptions,
    selectedOptions,
    setSelectedOptions,
    showActivityDialog,
    setShowActivityDialog,
    showShareDialog,
    setShowShareDialog,
    showTemplateDialog,
    setShowTemplateDialog,
    templateName,
    setTemplateName,
    editingActivityIndex,
    activityForm,
    setActivityForm,
    recipientPhone,
    setRecipientPhone,
    sendDocumentMessage,
    updateItinerary,
    saveAsTemplate,
    deleteItinerary,
    tripIncluded,
    tripExcluded,
    tripNotes,
    tripTerms,
    flights,
    handleFlightsChange,
    handleSave,
    handleAddDay,
    handleUpdateDay,
    handleSaveActivity,
    handleSendDocument,
    handleSendText,
    sendTextMessage,
    handleSaveAsTemplate,
    currency,
    pdfProgress,
    handleGeneratePdf,
    handleDelete,
    formatDate,
  } = useItineraryDetail(id);

  const shownDays = displayDays || days;

  const { user } = useAuthContext();
  const { data: pdfSettings } = usePdfSettings();

  const reservationGuest: ReservationGuest = useMemo(
    () => ({
      salutation,
      clientName: itinerary?.clientName || itinerary?.lead?.name,
      adults: itinerary?.adults,
      children: itinerary?.children,
    }),
    [salutation, itinerary]
  );

  const reservationCompany: ReservationCompany = useMemo(() => {
    const brandName = pdfSettings?.coverFooter?.companyName || user?.branch?.companyName || user?.branch?.name;
    const legalName = user?.branch?.companyName || brandName;
    return {
      brandName,
      legalName,
      address: user?.branch?.address || undefined,
      gst: pdfSettings?.coverFooter?.gst || undefined,
    };
  }, [pdfSettings, user]);

  // Keyed by the first night's dayNumber of each hotel stay — shows the
  // reservation-email copy button on that day only, matching the wizard.
  const stayByDayNumber = useMemo(() => {
    const input: HotelStayInput[] = shownDays.map(d => ({
      dayNumber: d.dayNumber,
      date: d.date || '',
      hotelId: d.hotelId,
      hotelName: d.hotel || '',
      hotelAddress: d.hotelAddress,
      hotelStars: d.hotelStars,
      roomType: d.selectedRoomType?.name || '',
      bedType: d.selectedRoomType?.bedType || '',
      roomCount: d.numberOfRooms || 1,
      basePrice: d.selectedRoomType?.basePrice || 0,
      mealPlan: d.selectedMealPlan?.label,
      mealPlanPrice: d.selectedMealPlan?.pricePerNight || 0,
      extraBedCount: d.extraBeds || 0,
      extraBedPrice: d.selectedRoomType?.extraBedPrice || d.extraBedCost || 0,
      childCount: d.childrenNoBed || 0,
      childPrice: d.selectedRoomType?.childPrice || d.childWithoutBedCost || 0,
    }));
    const map = new Map<number, HotelStayGroup>();
    for (const stay of groupHotelStays(input)) {
      map.set(stay.firstDayNumber, stay);
    }
    return map;
  }, [shownDays]);

  // Derived: tripTotalCost is read from quotes/options state — not a separate setter
  const tripTotalCost = useMemo(() => {
    if (options.length > 0) {
      const optIdx = selectedOptions[0] ?? 0;
      return options[optIdx]?.totalCost ?? 0;
    }
    const quoteIdx = selectedQuotes[0] ?? 0;
    return quotes[quoteIdx]?.totalCost ?? 0;
  }, [quotes, selectedQuotes, options, selectedOptions]);

  const openTemplateDialog = useCallback(() => {
    setTemplateName(
      `${tripDestination || itinerary?.destination || ''} - ${tripTitle || itinerary?.title || ''}`
    );
    setShowTemplateDialog(true);
  }, [tripDestination, tripTitle, itinerary, setTemplateName, setShowTemplateDialog]);

  const expandAll = useCallback(() => {
    const next: Record<number, boolean> = {};
    shownDays.forEach((_, index) => {
      next[index] = true;
    });
    setExpandedDays(next);
  }, [shownDays, setExpandedDays]);

  const collapseAll = useCallback(() => setExpandedDays({}), [setExpandedDays]);

  /** Everything the WhatsApp and email formats are built from. */
  const shareData: ShareItineraryData = useMemo(
    () => ({
      title: tripTitle || itinerary?.title || '',
      destination: tripDestination || itinerary?.destination || '',
      tripId: itinerary?.tripId,
      refId: itinerary?.id,
      clientName: itinerary?.clientName || itinerary?.lead?.name,
      startDate: tripStartDate,
      endDate: tripEndDate,
      adults: itinerary?.adults,
      children: itinerary?.children,
      travelers: tripTravelers,
      currency,
      totalCost: tripTotalCost,
      days: shownDays,
      flights,
      included: tripIncluded,
      excluded: tripExcluded,
      notes: tripNotes,
      terms: tripTerms,
      agencyName: itinerary?.branch?.name,
      agencyPhone: itinerary?.branch?.whatsappNumber,
      agencyEmail: itinerary?.branch?.email,
      agencyInstagram: itinerary?.branch?.instagram,
    }),
    [
      tripTitle,
      tripDestination,
      tripStartDate,
      tripEndDate,
      tripTravelers,
      currency,
      tripTotalCost,
      shownDays,
      flights,
      tripIncluded,
      tripExcluded,
      tripNotes,
      tripTerms,
      itinerary,
    ]
  );

  if (isLoading) return <DetailSkeleton />;

  if (!itinerary) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertCircle className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-lg font-semibold">Itinerary not found</h2>
          <Button variant="outline" onClick={() => window.history.back()} className="mt-4">
            Go Back
          </Button>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <ItineraryHeader
        title={tripTitle}
        tripId={itinerary.tripId}
        itineraryTitle={itinerary.title}
        itineraryId={itinerary.id}
        assignedTo={itinerary.lead ? (itinerary.lead.assignee?.name ?? null) : undefined}
        saveStatus={saveStatus}
        isSaving={updateItinerary.isPending}
        isGeneratingPdf={pdfProgress.active}
        isDeleting={deleteItinerary.isPending}
        onBack={() => window.history.back()}
        onSave={() => handleSave()}
        onGeneratePdf={handleGeneratePdf}
        onShare={() => setShowShareDialog(true)}
        onSaveTemplate={openTemplateDialog}
        onDelete={handleDelete}
      />

      <TripSummaryCard
        daysCount={days.length}
        travelers={tripTravelers}
        budget={tripTotalCost > 0 ? formatCurrency(tripTotalCost, currency) : ''}
        startDate={tripStartDate}
        endDate={tripEndDate}
        formatDate={formatDate}
        destination={tripDestination}
        quotes={quotes}
        selectedQuoteIndex={selectedQuotes[0] ?? undefined}
        onSelectQuote={idx => setSelectedQuotes([idx])}
        options={options as Parameters<typeof TripSummaryCard>[0]['options']}
        selectedOptionIndex={selectedOptions[0] ?? undefined}
        onSelectOption={idx => setSelectedOptions([idx])}
      />

      <FlightsCard
        flights={flights}
        onChange={handleFlightsChange}
        startDate={tripStartDate}
        endDate={tripEndDate}
        travelers={tripTravelers}
        currency={currency}
        formatDate={formatDate}
      />

      <DayTimeline
        key={`day-timeline-${selectedOptions[0] ?? 0}`}
        days={shownDays}
        expandedDays={expandedDays}
        destination={tripDestination}
        travelers={tripTravelers}
        currency={currency}
        readOnly={true}
        onToggleExpand={index => setExpandedDays(prev => ({ ...prev, [index]: !prev[index] }))}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
        onUpdateDay={handleUpdateDay}
        onAddDay={handleAddDay}
        formatDate={formatDate}
        stayByDayNumber={stayByDayNumber}
        tripId={itinerary.tripId}
        guest={reservationGuest}
        company={reservationCompany}
      />

      <PdfProgressOverlay state={pdfProgress} />

      <PricingDialog
        open={showPricingDialog}
        onOpenChange={setShowPricingDialog}
        existingQuotes={quotes as Parameters<typeof PricingDialog>[0]['existingQuotes']}
        onSaveQuotes={newQuotes => setQuotes(newQuotes as typeof quotes)}
        onSaveOptions={newOptions => setOptions(newOptions)}
        existingOptions={options as Parameters<typeof PricingDialog>[0]['existingOptions']}
      />

      <ActivityDialog
        open={showActivityDialog}
        onOpenChange={setShowActivityDialog}
        form={activityForm}
        onFormChange={setActivityForm}
        onSave={handleSaveActivity}
        isEditing={editingActivityIndex !== null}
      />

      <ShareDialog
        open={showShareDialog}
        onOpenChange={setShowShareDialog}
        data={shareData}
        recipientPhone={recipientPhone}
        leadPhone={itinerary.lead?.phone}
        leadEmail={itinerary.lead?.email}
        onPhoneChange={setRecipientPhone}
        onSendDocument={handleSendDocument}
        onSendText={handleSendText}
        onDownloadPdf={handleGeneratePdf}
        isSending={sendDocumentMessage.isPending || sendTextMessage.isPending}
      />

      <TemplateDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        name={templateName}
        onNameChange={setTemplateName}
        daysCount={days.length}
        activitiesCount={days.reduce((acc, d) => acc + (d.activities?.length || 0), 0)}
        destination={tripDestination || itinerary.destination || ''}
        onSave={handleSaveAsTemplate}
        isPending={saveAsTemplate.isPending || updateItinerary.isPending}
      />
    </PageWrapper>
  );
}

export default function ItineraryDetailPage(props: { params: Promise<{ id: string }> }) {
  const { id } = use(props.params);
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <ItineraryDetailContent id={id} />
    </Suspense>
  );
}
