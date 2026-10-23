'use client';

import { cn } from '@/lib/utils';

export interface LeadSourceBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  source: string;
}

const sourceConfig: Record<string, { icon: string; color: string; bg: string }> = {
  WEBSITE: {
    icon: 'M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.66 0 3-4.03 3-9s-1.34-9-3-9m0 18c-1.66 0-3-4.03-3-9s1.34-9 3-9m-9 9a9 9 0 019-9',
    color: 'text-neutral-500',
    bg: 'bg-neutral-50 border-neutral-200',
  },
  WHATSAPP: {
    icon: 'M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z',
    color: 'text-neutral-500',
    bg: 'bg-neutral-50 border-neutral-200',
  },
  WALKIN: {
    icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 7a4 4 0 110 8 4 4 0 010-8z',
    color: 'text-neutral-500',
    bg: 'bg-neutral-50 border-neutral-200',
  },
  SOCIAL: {
    icon: 'M18 2h-3a5 5 0 00-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 011-1h3z',
    color: 'text-red-500',
    bg: 'bg-red-50 border-red-200',
  },
  BULK_IMPORT: {
    icon: 'M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12',
    color: 'text-red-500',
    bg: 'bg-red-50 border-red-200',
  },
  META_ADS: {
    icon: 'M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 11-5.8-1.6',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
  },
  GOOGLE_ADS: {
    icon: 'M3 11l18-5v12L3 14v-3zM11.6 16.8a3 3 0 11-5.8-1.6',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
  },
  AD_CAMPAIGN: {
    icon: 'M11 5.82a2.38 2.38 0 00-.35 4.77v.11a2.36 2.36 0 01-.88 1.83 2.36 2.36 0 01-1.56.6 2.34 2.34 0 01-1.56-.61 2.37 2.37 0 01-.88-1.82v-.1a2.36 2.36 0 00-.36-4.77 2.36 2.36 0 00-.8-1.47 2.35 2.35 0 00-2.7 0 2.36 2.36 0 00-.8 1.47 2.35 2.35 0 00-.36 4.76v.12A2.35 2.35 0 000 13.5a2.36 2.36 0 00.88 1.82 2.35 2.35 0 001.56.6 2.35 2.35 0 001.56-.6 2.36 2.36 0 00.88-1.82v-.11a2.36 2.36 0 00.35-4.78v-.11A2.35 2.35 0 007 5.82a2.35 2.35 0 000-2.33 2.35 2.35 0 00-.88-1.47 2.35 2.35 0 00-1.56-.6 2.35 2.35 0 00-1.56.6 2.36 2.36 0 00-.88 1.47 2.35 2.35 0 000 2.33 2.36 2.36 0 00.88 1.82v.11A2.35 2.35 0 004.35 9.5a2.36 2.36 0 00.88-1.82V7.47a2.36 2.36 0 00.35-4.78v-.11A2.35 2.35 0 007 0a2.35 2.35 0 000 2.33 2.36 2.36 0 00.88 1.82v.11a2.36 2.36 0 00.35 4.78v.11A2.35 2.35 0 0010.43 12a2.36 2.36 0 00.88-1.82v-.11a2.36 2.36 0 00.35-4.77V7.47a2.35 2.35 0 00-.88-1.82A2.35 2.35 0 0010.43 5.5a2.35 2.35 0 00-.35 1.33v.33a2.35 2.35 0 00.35 1.33v.66z',
    color: 'text-red-500',
    bg: 'bg-red-50 border-red-200',
  },
};

const sourceLabels: Record<string, string> = {
  WEBSITE: 'Website',
  WHATSAPP: 'WhatsApp',
  WALKIN: 'Walk-in',
  SOCIAL: 'Social Media',
  BULK_IMPORT: 'Bulk Import',
  META_ADS: 'Meta Ads',
  GOOGLE_ADS: 'Google Ads',
  AD_CAMPAIGN: 'Ads (platform unknown)',
};

export function LeadSourceBadge({ source, className, ...props }: LeadSourceBadgeProps) {
  const config = sourceConfig[source] || sourceConfig.BULK_IMPORT;
  const label = sourceLabels[source] || source;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors',
        config.bg,
        config.color,
        className
      )}
      {...props}
    >
      <svg
        className="h-3 w-3 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={config.icon} />
      </svg>
      {label}
    </span>
  );
}
