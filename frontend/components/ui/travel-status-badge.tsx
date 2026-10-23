'use client';

import { cn } from '@/lib/utils';

export interface TravelStatusBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  status: string;
}

const statusConfig: Record<string, { color: string; bg: string; dot: string }> = {
  FRESH: { color: 'text-neutral-600', bg: 'bg-neutral-50 border-neutral-200', dot: 'bg-neutral-500' },
  FOLLOWUP: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  HOT: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  WARM: { color: 'text-neutral-600', bg: 'bg-neutral-50 border-neutral-200', dot: 'bg-neutral-500' },
  WON: { color: 'text-neutral-600', bg: 'bg-neutral-50 border-neutral-200', dot: 'bg-neutral-500' },
  LOST: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-500' },
  NOT_INTERESTED: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-400' },
  JUNK: { color: 'text-neutral-600', bg: 'bg-neutral-50 border-neutral-200', dot: 'bg-neutral-400' },
  NOT_ANSWERING: {
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    dot: 'bg-red-400',
  },
  SENT_VOICEMAIL: {
    color: 'text-neutral-600',
    bg: 'bg-neutral-50 border-neutral-200',
    dot: 'bg-neutral-400',
  },
  CALL_DECLINED: { color: 'text-red-600', bg: 'bg-red-50 border-red-200', dot: 'bg-red-400' },
  CALL_BACK_SCHEDULED: {
    color: 'text-neutral-600',
    bg: 'bg-neutral-50 border-neutral-200',
    dot: 'bg-neutral-400',
  },
  CONNECTED: { color: 'text-neutral-600', bg: 'bg-neutral-50 border-neutral-200', dot: 'bg-neutral-400' },
};

const statusLabels: Record<string, string> = {
  FRESH: 'Fresh',
  FOLLOWUP: 'Follow Up',
  HOT: 'Hot Lead',
  WARM: 'Warm',
  WON: 'Booked',
  LOST: 'Lost',
  NOT_INTERESTED: 'Not Interested',
  JUNK: 'Junk',
  NOT_ANSWERING: 'No Answer',
  SENT_VOICEMAIL: 'Voicemail',
  CALL_DECLINED: 'Declined',
  CALL_BACK_SCHEDULED: 'Callback',
  CONNECTED: 'Connected',
};

export function TravelStatusBadge({ status, className, ...props }: TravelStatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.FRESH;
  const label = statusLabels[status] || status;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
        config.bg,
        config.color,
        className
      )}
      {...props}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', config.dot)} />
      {label}
    </span>
  );
}
