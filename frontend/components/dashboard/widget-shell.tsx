'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ArrowUpRight, Check, ChevronRight } from 'lucide-react';

/**
 * Shared shell for the dashboard widgets. Every panel used to build its own
 * header, tile and tab strip, so the same kind of number could be three
 * different sizes on one screen. These are the pieces they all draw from now.
 */

export type WidgetTone = 'primary' | 'gold' | 'success' | 'warning' | 'danger' | 'info';

/** Tinted background + foreground for an icon chip, one per tone. */
export const TONE_CHIP: Record<WidgetTone, string> = {
  primary: 'bg-primary/10 text-primary',
  gold: 'bg-accent/15 text-gold-dark',
  success: 'bg-success/10 text-success',
  warning: 'bg-warning/15 text-warning',
  danger: 'bg-destructive/10 text-destructive',
  info: 'bg-chart-4/10 text-chart-4',
};

export type TileTone = 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'muted';

const TILE_TEXT: Record<TileTone, string> = {
  default: 'text-foreground',
  primary: 'text-primary',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-destructive',
  muted: 'text-muted-foreground',
};

const TILE_SIZE = {
  /** Currency and other long strings that must not wrap the card. */
  sm: 'text-base sm:text-lg',
  md: 'text-xl sm:text-2xl',
} as const;

/** Rule-and-label heading that separates one band of widgets from the next. */
export function SectionHeading({
  title,
  icon: Icon,
  action,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {title}
      </h2>
      <span className="h-px flex-1 bg-border" aria-hidden />
      {action}
    </div>
  );
}

export function WidgetCard({
  title,
  href,
  icon: Icon,
  tone = 'primary',
  meta,
  action,
  footer,
  children,
  className,
  contentClassName,
}: {
  title: string;
  /** Where the title links to; omitted for panels with nowhere to drill into. */
  href?: string;
  icon?: LucideIcon;
  tone?: WidgetTone;
  /** Small line under the title, e.g. an outstanding total. */
  meta?: React.ReactNode;
  /** Header-right slot: a tab strip, badge or button. */
  action?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <Card
      className={cn(
        // The card is a container, not a control, so it should not lift away
        // from the cursor while someone reads it.
        'flex flex-col overflow-hidden hover:translate-y-0 hover:border-border',
        className
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 p-4 pb-0 sm:p-5 sm:pb-0">
        <div className="flex min-w-0 items-center gap-2.5">
          {Icon && (
            <span
              className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-lg', TONE_CHIP[tone])}
              aria-hidden
            >
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold tracking-tight text-foreground sm:text-[0.95rem]">
              {href ? (
                <Link
                  href={href}
                  className="group/title inline-flex max-w-full items-center gap-1 transition-colors hover:text-primary"
                >
                  <span className="truncate">{title}</span>
                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0 opacity-40 transition-all group-hover/title:translate-x-0.5 group-hover/title:opacity-100" />
                </Link>
              ) : (
                title
              )}
            </h3>
            {meta && (
              <div className="mt-0.5 truncate text-[11px] text-muted-foreground">{meta}</div>
            )}
          </div>
        </div>
        {action && <div className="shrink-0">{action}</div>}
      </CardHeader>

      <CardContent className={cn('flex-1 p-4 pt-3.5 sm:p-5 sm:pt-4', contentClassName)}>
        {children}
      </CardContent>

      {footer && (
        <div className="border-t border-border/70 bg-muted/25 px-4 py-2.5 sm:px-5">{footer}</div>
      )}
    </Card>
  );
}

/**
 * One metric inside a widget. Sitting on its own tinted panel gives the number
 * an edge to be read against, which a bare number in a grid never had.
 */
export function StatTile({
  label,
  value,
  hint,
  href,
  tone = 'default',
  size = 'md',
  cleared,
  clearedLabel = 'All clear',
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  href?: string;
  tone?: TileTone;
  size?: keyof typeof TILE_SIZE;
  /** Nothing outstanding here; shows a tick instead of a bare zero. */
  cleared?: boolean;
  clearedLabel?: string;
  icon?: LucideIcon;
}) {
  const body = (
    <>
      <p className="flex items-center gap-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {Icon && <Icon className="mr-0.5 h-3 w-3 shrink-0" />}
        <span className="truncate">{label}</span>
        {href && (
          <ChevronRight className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-70" />
        )}
      </p>

      <div className="mt-1.5 flex min-h-7 items-center">
        {cleared ? (
          <span
            className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[11px] font-semibold text-success"
            aria-label={`${label}: ${clearedLabel}`}
          >
            <Check className="h-3 w-3" />
            {clearedLabel}
          </span>
        ) : (
          <span
            title={typeof value === 'string' ? value : undefined}
            className={cn('stat-number block truncate', TILE_SIZE[size], TILE_TEXT[tone])}
          >
            {value}
          </span>
        )}
      </div>

      {hint && !cleared && (
        <p className="mt-1 truncate text-[10px] leading-4 text-muted-foreground">{hint}</p>
      )}
    </>
  );

  const base = 'block rounded-lg border border-transparent bg-muted/40 p-2.5 sm:p-3';

  if (!href) return <div className={base}>{body}</div>;

  return (
    <Link
      href={href}
      className={cn(
        base,
        'group transition-colors hover:border-border hover:bg-muted/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40'
      )}
    >
      {body}
    </Link>
  );
}

export function TileGrid({ cols = 4, children }: { cols?: 2 | 3 | 4; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        'grid gap-2.5 sm:gap-3',
        cols === 2 && 'grid-cols-2',
        cols === 3 && 'grid-cols-3',
        cols === 4 && 'grid-cols-2 sm:grid-cols-4'
      )}
    >
      {children}
    </div>
  );
}

export function TileGridSkeleton({ cols = 4 }: { cols?: 2 | 3 | 4 }) {
  return (
    <TileGrid cols={cols}>
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-[4.75rem]" />
      ))}
    </TileGrid>
  );
}

/** Pill tab strip used by the widgets that switch period or scope. */
export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={cn(
        'flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-muted/70 p-0.5',
        className
      )}
    >
      {options.map(option => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={value === option.value}
          className={cn(
            'whitespace-nowrap rounded-md px-2.5 py-1 text-[11px] font-medium transition-all sm:text-xs',
            value === option.value
              ? 'bg-background text-primary shadow-sm ring-1 ring-border'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** Centred placeholder for a widget whose list came back empty. */
export function WidgetEmpty({
  icon: Icon,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-8 text-center">
      {Icon && (
        <span className="grid h-10 w-10 place-items-center rounded-full bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
      )}
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && <p className="max-w-xs text-xs text-muted-foreground">{description}</p>}
    </div>
  );
}
