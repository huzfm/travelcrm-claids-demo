'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/axios';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { TripIdBadge } from '@/components/ui/trip-id-badge';
import { RecordPaymentDialog } from '@/components/trips/record-payment-dialog';
import { ReceiptDownloadButton } from '@/components/trips/receipt-download-button';
import { useUpdateTripStatus } from '@/hooks/useTripFinance';
import { cn } from '@/lib/utils';
import { formatCurrencyText } from '@/lib/currency';
import type { TripDetail } from '@/types/dashboard.types';
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Hotel,
  MapPin,
  Phone,
  Plus,
  Receipt,
  User,
} from 'lucide-react';

/**
 * Everything about one trip on a single page: the customer, the day plan, cash
 * received, supplier payables and the follow-up trail.
 *
 * This is where a trip ID search lands, so it has to answer "what is the state
 * of this booking" without further clicks.
 */
export default function TripDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = String(params?.id ?? '');

  const [showPayment, setShowPayment] = useState(false);

  const { data, isLoading, error } = useQuery<TripDetail>({
    queryKey: ['trip', id],
    queryFn: async () => {
      const res = await api.get(`trips/${id}`);
      return res.data.data;
    },
    enabled: Boolean(id),
  });

  const updateStatus = useUpdateTripStatus(id);

  if (isLoading) return <TripDetailSkeleton />;

  if (error || !data) {
    return (
      <PageWrapper>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">
            This trip could not be loaded. It may have been deleted, or you may not have access.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.push('/trips')}
          >
            Back to trips
          </Button>
        </div>
      </PageWrapper>
    );
  }

  const currency = data.branch?.currency ?? 'INR';
  const finance = data.finance;

  return (
    <PageWrapper>
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <h1 className="truncate text-xl font-semibold sm:text-2xl">{data.title}</h1>
            <TripIdBadge tripId={data.tripId} />
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {data.destination && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {data.destination}
              </span>
            )}
            <LifecycleBadge status={data.status} />
            <TimingBadge status={data.tripStatus} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {data.status === 'DRAFT' && (
            <Button
              size="sm"
              variant="outline"
              className="border-success/40 text-success hover:bg-success/10"
              disabled={updateStatus.isPending}
              onClick={() =>
                updateStatus.mutate('CONFIRMED', {
                  onSuccess: () => toast.success('Trip confirmed'),
                  onError: () => toast.error('Could not confirm the trip'),
                })
              }
            >
              Confirm trip
            </Button>
          )}
          {data.status === 'CONFIRMED' && (
            <Button
              size="sm"
              variant="outline"
              className="text-destructive hover:bg-destructive/10"
              disabled={updateStatus.isPending}
              onClick={() => {
                if (!confirm('Cancel this trip? It will stop counting toward revenue.')) return;
                updateStatus.mutate('CANCELLED', {
                  onSuccess: () => toast.success('Trip cancelled'),
                  onError: () => toast.error('Could not cancel the trip'),
                });
              }}
            >
              Cancel trip
            </Button>
          )}
          <Button size="sm" onClick={() => setShowPayment(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Record payment
          </Button>
          <Link href={`/itineraries/${data.id}`}>
            <Button size="sm" variant="outline">
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Open itinerary
            </Button>
          </Link>
        </div>
      </div>

      {/* Money at a glance */}
      <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Figure label="Trip cost" value={formatCurrencyText(finance.totalCost, currency)} />
        <Figure
          label="Received"
          value={formatCurrencyText(finance.totalPaid, currency)}
          tone="success"
        />
        <Figure
          label="Balance"
          value={formatCurrencyText(finance.balance, currency)}
          tone={finance.balance > 0 ? 'danger' : 'success'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column */}
        <div className="space-y-6 lg:col-span-2">
          <Section title="Trip details" icon={Calendar}>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
              <Detail label="Start" value={formatDate(data.startDate)} />
              <Detail label="End" value={formatDate(data.endDate)} />
              <Detail
                label="Duration"
                value={data.daysCount > 0 ? `${data.daysCount - 1}N / ${data.daysCount}D` : '—'}
              />
              <Detail label="Trip type" value={data.tripType || '—'} />
              <Detail
                label="Travellers"
                value={
                  data.adults || data.children
                    ? [
                        data.adults && `${data.adults} adult`,
                        data.children && `${data.children} child`,
                      ]
                        .filter(Boolean)
                        .join(', ')
                    : data.totalTravelers
                      ? `${data.totalTravelers}`
                      : '—'
                }
              />
              <Detail label="Created by" value={data.creator?.name || '—'} />
            </dl>
            {data.notes && (
              <p className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                {data.notes}
              </p>
            )}
          </Section>

          <Section
            title={`Itinerary (${data.daysCount} ${data.daysCount === 1 ? 'day' : 'days'})`}
            icon={MapPin}
            action={
              <Link
                href={`/itineraries/${data.id}`}
                className="text-xs text-primary hover:underline"
              >
                Open full itinerary
              </Link>
            }
          >
            {data.daysJson?.length ? (
              <ol className="divide-y">
                {data.daysJson.map((day: any, index: number) => (
                  <li key={index} className="flex gap-3 py-2.5">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary">
                      {day.dayNumber ?? index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {day.location || day.destination || `Day ${index + 1}`}
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                        {day.date && <span>{formatDate(day.date)}</span>}
                        {day.hotelName && (
                          <span className="inline-flex items-center gap-1">
                            <Hotel className="h-3 w-3" />
                            {day.hotelName}
                          </span>
                        )}
                        {day.vehicleName && <span>{day.vehicleName}</span>}
                        {Array.isArray(day.activities) && day.activities.length > 0 && (
                          <span>
                            {day.activities.length}{' '}
                            {day.activities.length === 1 ? 'activity' : 'activities'}
                          </span>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <Empty>No days planned yet.</Empty>
            )}
          </Section>

          <Section title="Payments received" icon={Receipt}>
            {data.payments?.length ? (
              <ul className="divide-y">
                {data.payments.map(payment => (
                  <li key={payment.id} className="flex items-center gap-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">
                        {formatCurrencyText(payment.amount, currency)}
                      </p>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {formatDate(payment.paymentDate)} • {payment.paymentMode}
                        {payment.referenceNumber && ` • ${payment.referenceNumber}`}
                        {payment.recorder?.name && ` • by ${payment.recorder.name}`}
                      </p>
                    </div>
                    {payment.receiptUrl && (
                      <a
                        href={payment.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 text-xs text-primary hover:underline"
                      >
                        Attachment
                      </a>
                    )}
                    <ReceiptDownloadButton
                      tripId={data.id}
                      paymentId={payment.id}
                      className="h-7 shrink-0 px-2 text-xs"
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Nothing received yet.</Empty>
            )}
          </Section>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <Section title="Customer" icon={User}>
            {data.lead ? (
              <div className="space-y-2">
                <Link
                  href={`/leads/${data.lead.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  {data.lead.name}
                </Link>
                {data.lead.phone && (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {data.lead.phone}
                  </p>
                )}
                {data.lead.email && (
                  <p className="truncate text-xs text-muted-foreground">{data.lead.email}</p>
                )}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {data.lead.status && (
                    <Badge variant="outline" className="text-[10px]">
                      {data.lead.status}
                    </Badge>
                  )}
                  {data.lead.source && (
                    <Badge variant="outline" className="text-[10px]">
                      {formatSource(data.lead.source)}
                    </Badge>
                  )}
                </div>
                {data.lead.assignee && (
                  <p className="pt-1 text-[11px] text-muted-foreground">
                    Owned by {data.lead.assignee.name}
                  </p>
                )}
              </div>
            ) : (
              <Empty>No customer linked to this trip.</Empty>
            )}
          </Section>

          <Section
            title="Follow-ups"
            icon={Clock}
            action={
              data.lead ? (
                <Link
                  href={`/leads/${data.lead.id}`}
                  className="text-xs text-primary hover:underline"
                >
                  View lead
                </Link>
              ) : undefined
            }
          >
            {data.followUps?.length ? (
              <ul className="divide-y">
                {data.followUps.map(followUp => (
                  <li key={followUp.id} className="py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{followUp.type}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {followUp.status}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {formatDateTime(followUp.scheduledAt)}
                      {followUp.assignee?.name && ` • ${followUp.assignee.name}`}
                    </p>
                    {followUp.notes && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-muted-foreground">
                        {followUp.notes}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>No follow-ups logged.</Empty>
            )}
          </Section>
        </div>
      </div>

      <RecordPaymentDialog
        tripId={data.id}
        balance={finance.balance}
        currency={currency}
        open={showPayment}
        onClose={() => setShowPayment(false)}
      />
    </PageWrapper>
  );
}

// ─── Presentation helpers ────────────────────────────────────────────────────

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatSource = (source: string) =>
  source
    .toLowerCase()
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

function LifecycleBadge({ status }: { status: string }) {
  const tone =
    status === 'CONFIRMED'
      ? 'bg-success/10 text-success'
      : status === 'CANCELLED'
        ? 'bg-destructive/10 text-destructive'
        : 'bg-muted text-muted-foreground';
  return (
    <Badge variant="outline" className={cn('text-[10px]', tone)}>
      {status}
    </Badge>
  );
}

function TimingBadge({ status }: { status: string }) {
  if (status === 'NO_DATE') return null;
  const tone =
    status === 'ONGOING'
      ? 'bg-primary/10 text-primary'
      : status === 'UPCOMING'
        ? 'bg-accent/10 text-accent'
        : 'bg-muted text-muted-foreground';
  return (
    <Badge variant="outline" className={cn('text-[10px]', tone)}>
      {status}
    </Badge>
  );
}

function Figure({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: 'success' | 'danger';
}) {
  return (
    <Card className="shadow-brand">
      <CardContent className="p-3 sm:p-4">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p
          className={cn(
            'mt-0.5 text-base font-semibold tracking-tight stat-number sm:text-lg',
            tone === 'success' && 'text-success',
            tone === 'danger' && 'text-destructive'
          )}
        >
          {value}
        </p>
        {hint && <p className="mt-0.5 truncate text-[10px] text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function Section({
  title,
  icon: Icon,
  action,
  children,
}: {
  title: string;
  icon: React.ElementType;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card className="shadow-brand">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Icon className="h-4 w-4 text-muted-foreground" />
          {title}
        </CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function Detail({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-3 text-center text-xs text-muted-foreground">{children}</p>;
}

function TripDetailSkeleton() {
  return (
    <PageWrapper>
      <Skeleton className="mb-2 h-4 w-16" />
      <Skeleton className="mb-6 h-8 w-64" />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Skeleton className="h-40" />
          <Skeleton className="h-64" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-40" />
        </div>
      </div>
    </PageWrapper>
  );
}
