'use client';

import { useEffect, useRef, useState } from 'react';
import type { Lead } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { PageWrapper } from '@/components/layout/page-wrapper';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuthContext } from '@/components/providers';
import { TravelStatsWidget } from '@/components/dashboard/travel-stats-widget';
import { AdCampaignsStatsWidget } from '@/components/dashboard/ad-campaigns-stats-widget';
import { PipelineWidget } from '@/components/dashboard/pipeline-widget';
import { FollowUpsWidget } from '@/components/dashboard/followups-widget';
import { QuickActionsWidget } from '@/components/dashboard/quick-actions-widget';
import { TopDestinationsWidget } from '@/components/dashboard/top-destinations-widget';
import { RecentLeadsWidget } from '@/components/dashboard/recent-leads-widget';
import { SourcesWidget } from '@/components/dashboard/sources-widget';
import { TripSalesStatsWidget } from '@/components/dashboard/trip-sales-stats-widget';
import { PendingFollowUpsWidget } from '@/components/dashboard/pending-followups-widget';
import { TripTimingsWidget } from '@/components/dashboard/trip-timings-widget';
import { DuePaymentTripsWidget } from '@/components/dashboard/due-payment-trips-widget';
import { GlobalSearch } from '@/components/dashboard/global-search';
import { useDashboardOverview } from '@/hooks/useDashboard';
import { ArrowDown, ArrowUp, Settings, Plus, RotateCcw } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/axios';
import { cn } from '@/lib/utils';
import { hasPermission, type FeatureKey } from '@/lib/permissions';

interface Widget {
  id: string;
  type:
    | 'stats'
    | 'pipeline'
    | 'followups'
    | 'recent_leads'
    | 'quick_actions'
    | 'sources'
    | 'top_destinations'
    | 'revenue'
    | 'ad_stats'
    | 'trip_sales'
    | 'pending_followups'
    | 'trip_timings'
    | 'due_trips';
  title: string;
  enabled: boolean;
  order: number;
}

/**
 * Each widget is individually grantable, so an admin can hand someone the
 * dashboard without exposing revenue or ad spend. A widget the user does not
 * hold is dropped everywhere: the grid, the settings list and its data fetch.
 */
const WIDGET_PERMISSIONS: Record<Widget['type'], FeatureKey> = {
  trip_sales: 'dashboard.trip_sales',
  pending_followups: 'dashboard.pending_followups',
  trip_timings: 'dashboard.trip_timings',
  due_trips: 'dashboard.due_trips',
  stats: 'dashboard.travel_stats',
  ad_stats: 'dashboard.ad_stats',
  pipeline: 'dashboard.pipeline',
  followups: 'dashboard.followups',
  quick_actions: 'dashboard.quick_actions',
  top_destinations: 'dashboard.top_destinations',
  recent_leads: 'dashboard.recent_leads',
  sources: 'dashboard.sources',
  revenue: 'dashboard.trip_sales',
};

/** "Good morning" / "Good afternoon" / "Good evening" for the local clock. */
const greetingFor = (hour: number) => {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

export default function DashboardPage() {
  const { user } = useAuthContext();
  const canSeeWidget = (type: Widget['type']) => hasPermission(user, WIDGET_PERMISSIONS[type]);
  const canSearch = hasPermission(user, 'dashboard.search');

  const defaultWidgets: Widget[] = [
    { id: '9', type: 'trip_sales', title: 'Trip Sales Stats', enabled: true, order: 1 },
    { id: '10', type: 'pending_followups', title: 'Pending Follow-ups', enabled: true, order: 2 },
    { id: '12', type: 'trip_timings', title: 'Trip Starting and Endings', enabled: true, order: 3 },
    { id: '13', type: 'due_trips', title: 'Live Trips with Due Payments', enabled: true, order: 4 },
    { id: '1', type: 'stats', title: 'Travel Stats', enabled: false, order: 5 },
    { id: '8', type: 'ad_stats', title: 'Ad Campaigns', enabled: false, order: 6 },
    { id: '2', type: 'pipeline', title: 'Lead Pipeline', enabled: true, order: 7 },
    { id: '3', type: 'followups', title: "Today's Follow-ups", enabled: false, order: 8 },
    { id: '4', type: 'quick_actions', title: 'Quick Actions', enabled: true, order: 9 },
    { id: '5', type: 'top_destinations', title: 'Top Destinations', enabled: false, order: 10 },
    { id: '6', type: 'recent_leads', title: 'Recent Leads', enabled: false, order: 11 },
    { id: '7', type: 'sources', title: 'Lead Sources', enabled: false, order: 12 },
  ];

  const [widgets, setWidgets] = useState<Widget[]>(defaultWidgets);
  // `user` starts out null and only resolves after an async session check
  // (see AuthProvider), so a useState initializer reading
  // `dashboard-widgets-${user?.id}` on mount would always hit the wrong,
  // user-less key and silently fall back to defaults. Load the real,
  // per-user layout once the id is actually known instead. Guarded so it
  // only runs once per id and never clobbers a reorder made in the same
  // session before the id resolved.
  const loadedForUserIdRef = useRef<string | null>(null);
  const editedThisSessionRef = useRef(false);
  useEffect(() => {
    const userId = user?.id;
    if (!userId || loadedForUserIdRef.current === userId || editedThisSessionRef.current) return;
    loadedForUserIdRef.current = userId;

    const saved = localStorage.getItem(`dashboard-widgets-${userId}`);
    if (!saved) return;
    try {
      const parsed: Widget[] = JSON.parse(saved);
      // A layout saved before a widget existed would hide it forever, so
      // append any widget type the saved list does not know about.
      const seen = new Set(parsed.map(w => w.type));
      const merged = [
        ...parsed,
        ...defaultWidgets
          .filter(w => !seen.has(w.type))
          .map((w, i) => ({
            ...w,
            order: parsed.length + i + 1,
          })),
      ];
      // eslint-disable-next-line react-hooks/set-state-in-effect -- browser storage is only readable after mount
      setWidgets(merged);
    } catch {
      // Malformed saved layout — keep the defaults already in state.
    }
    // defaultWidgets is a fresh array each render but static in content, so
    // it's safe to read from inside the effect without listing it here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);
  const [showSettings, setShowSettings] = useState(false);

  const { data: pipelineData, isLoading: pipelineLoading } = useQuery({
    queryKey: ['dashboard-pipeline'],
    queryFn: async () => {
      const r = await api.get('/analytics/pipeline');
      return r.data.data;
    },
    staleTime: 60 * 1000,
  });

  const { data: followUpDashboard, isLoading: followUpsLoading } = useQuery({
    queryKey: ['dashboard-followups'],
    queryFn: async () => {
      const r = await api.get('/followups/dashboard');
      return r.data.data;
    },
    staleTime: 30 * 1000,
  });

  const { data: leadsData } = useQuery({
    queryKey: ['dashboard-leads'],
    queryFn: async () => {
      const r = await api.get('/leads', { params: { limit: 50 } });
      return r.data.data;
    },
    staleTime: 60 * 1000,
  });

  const { data: adCampaignStats } = useQuery({
    queryKey: ['dashboard-ad-stats'],
    queryFn: async () => {
      const r = await api.get('/ad-campaigns/stats');
      return r.data.data;
    },
    staleTime: 5 * 60 * 1000,
    enabled: canSeeWidget('ad_stats'),
  });

  const { data: overview, isLoading: overviewLoading } = useDashboardOverview();

  // Only the lead-derived widgets wait on these; the header and the overview
  // panels render straight away rather than blanking the whole page.
  const leadWidgetsLoading = pipelineLoading || followUpsLoading;

  const pipeline = pipelineData?.pipeline || {};
  const totalLeads = pipelineData?.total || 0;
  const newLeadsCount = pipeline.FRESH || 0;
  const bookedCount = (pipeline.WON || 0) + (pipeline.QUOTE_SENT || 0);
  const hotCount = pipeline.HOT || 0;
  const followUpCount = pipeline.FOLLOWUP || 0;

  const leads: Lead[] = leadsData?.leads || [];

  const sourceCounts: Record<string, number> = {};
  leads.forEach(lead => {
    sourceCounts[lead.source] = (sourceCounts[lead.source] || 0) + 1;
  });

  // Filter before sorting so a revoked widget never reaches the grid, and the
  // stored layout keeps its entry for if the permission is granted back.
  const sortedWidgets = [...widgets]
    .filter(w => canSeeWidget(w.type))
    .sort((a, b) => a.order - b.order);

  const enabledCount = sortedWidgets.filter(w => w.enabled).length;

  // The actual card for one widget type, with no positioning of its own —
  // where it lands on the page comes entirely from the ordering below.
  const renderWidgetContent = (type: Widget['type']): React.ReactNode => {
    switch (type) {
      case 'trip_sales':
        return <TripSalesStatsWidget initialStats={overview?.salesStats} />;
      case 'pending_followups':
        return <PendingFollowUpsWidget summary={overview?.followUps} isLoading={overviewLoading} />;
      case 'trip_timings':
        return <TripTimingsWidget timings={overview?.tripTimings} isLoading={overviewLoading} />;
      case 'due_trips':
        return <DuePaymentTripsWidget initialData={overview?.dueTrips} />;
      case 'stats':
        return leadWidgetsLoading ? (
          <WidgetBandSkeleton cols={4} />
        ) : (
          <TravelStatsWidget
            totalLeads={totalLeads}
            newLeadsCount={newLeadsCount}
            bookedCount={bookedCount}
            hotCount={hotCount}
          />
        );
      case 'ad_stats':
        return <AdCampaignsStatsWidget adCampaignStats={adCampaignStats} />;
      case 'pipeline':
        return leadWidgetsLoading ? (
          <Skeleton className="h-64 lg:col-span-2" />
        ) : (
          <PipelineWidget
            totalLeads={totalLeads}
            newLeadsCount={newLeadsCount}
            followUpCount={followUpCount}
            hotCount={hotCount}
            bookedCount={bookedCount}
          />
        );
      case 'top_destinations':
        return <TopDestinationsWidget />;
      case 'followups':
        return leadWidgetsLoading ? (
          <Skeleton className="h-64" />
        ) : (
          <FollowUpsWidget followUpDashboard={followUpDashboard} />
        );
      case 'quick_actions':
        return <QuickActionsWidget />;
      case 'recent_leads':
        return <RecentLeadsWidget leads={leads} />;
      case 'sources':
        return <SourcesWidget sourceCounts={sourceCounts} />;
      case 'revenue':
        return null;
      default:
        return null;
    }
  };

  // Two widget types share a row only when the user's own order still has
  // them next to each other — otherwise each renders full width on its own.
  const PAIR_ROWS: { types: [Widget['type'], Widget['type']]; className: string }[] = [
    { types: ['pipeline', 'top_destinations'], className: 'grid gap-4 sm:gap-5 lg:grid-cols-3' },
    { types: ['followups', 'quick_actions'], className: 'grid gap-4 sm:gap-5 lg:grid-cols-2' },
  ];

  const enabledOrderedWidgets = sortedWidgets.filter(w => w.enabled);
  const consumedIds = new Set<string>();
  const dashboardCards: React.ReactNode[] = [];

  enabledOrderedWidgets.forEach((widget, index) => {
    if (consumedIds.has(widget.id)) return;

    const next = enabledOrderedWidgets[index + 1];
    const pairRow = next
      ? PAIR_ROWS.find(
          row =>
            (row.types[0] === widget.type && row.types[1] === next.type) ||
            (row.types[1] === widget.type && row.types[0] === next.type)
        )
      : undefined;

    if (pairRow && next) {
      consumedIds.add(next.id);
      dashboardCards.push(
        <div key={widget.id} className={pairRow.className}>
          {renderWidgetContent(widget.type)}
          {renderWidgetContent(next.type)}
        </div>
      );
    } else {
      dashboardCards.push(<div key={widget.id}>{renderWidgetContent(widget.type)}</div>);
    }
  });

  const saveWidgets = (newWidgets: Widget[]) => {
    editedThisSessionRef.current = true;
    setWidgets(newWidgets);
    localStorage.setItem(`dashboard-widgets-${user?.id}`, JSON.stringify(newWidgets));
  };

  const toggleWidget = (id: string) => {
    const updated = widgets.map(w => (w.id === id ? { ...w, enabled: !w.enabled } : w));
    saveWidgets(updated);
  };

  /**
   * Swaps a widget with its neighbour *in the list the user can see*. Swapping
   * within the full list would look like a dead button whenever a widget they
   * hold no permission for sits between the two visible ones.
   */
  const moveWidget = (id: string, direction: 'up' | 'down') => {
    const index = sortedWidgets.findIndex(w => w.id === id);
    const neighbour = sortedWidgets[direction === 'up' ? index - 1 : index + 1];
    if (index === -1 || !neighbour) return;

    const current = sortedWidgets[index];
    const swapped = widgets.map(w => {
      if (w.id === current.id) return { ...w, order: neighbour.order };
      if (w.id === neighbour.id) return { ...w, order: current.order };
      return w;
    });

    // Renumber so a layout saved with gaps or duplicate orders heals itself,
    // otherwise two widgets sharing an order make the arrows look broken.
    const ranking = new Map(
      [...swapped].sort((a, b) => a.order - b.order).map((w, i) => [w.id, i + 1])
    );
    saveWidgets(swapped.map(w => ({ ...w, order: ranking.get(w.id) ?? w.order })));
  };

  const resetWidgets = () => saveWidgets(defaultWidgets);

  const now = new Date();
  const todayLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <PageWrapper>
      {/* Header */}
      <div className="rounded-xl border border-border bg-linear-to-br from-primary-light via-background to-background p-4 shadow-brand sm:p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {todayLabel}
            </p>
            <h1 className="mt-1 truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              {greetingFor(now.getHours())}, {user?.name?.split(' ')[0] || 'Traveler'}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
              Here&apos;s what&apos;s happening with your leads today.
            </p>
          </div>

          <div className="flex w-full items-center gap-2 sm:w-auto">
            {canSearch && <GlobalSearch className="hidden md:block md:w-64 lg:w-80" />}
            <Link href="/leads" className="flex-1 sm:flex-none">
              <Button size="sm" className="w-full shadow-brand sm:w-auto">
                <Plus className="h-3.5 w-3.5" />
                <span className="ml-1">New Lead</span>
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowSettings(true)}
              className="flex-1 sm:flex-none"
              aria-label="Customize dashboard"
            >
              <Settings className="h-3.5 w-3.5 sm:mr-1.5" />
              <span className="hidden sm:inline">Customize</span>
            </Button>
          </div>
        </div>

        {canSearch && <GlobalSearch className="mt-3 md:hidden" />}
      </div>

      <div className="space-y-5 sm:space-y-6">
        {dashboardCards}

        {enabledCount === 0 && (
          <div className="rounded-xl border border-dashed border-border bg-muted/20 p-10 text-center">
            <p className="text-sm font-medium text-foreground">Your dashboard is empty</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Turn widgets back on to see your leads, trips and payments.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="mt-4"
              onClick={() => setShowSettings(true)}
            >
              <Settings className="mr-1.5 h-3.5 w-3.5" />
              Customize dashboard
            </Button>
          </div>
        )}
      </div>

      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="w-[calc(100%-2rem)] max-w-md sm:w-full">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Settings className="h-4 w-4" />
              Customize Dashboard
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <p className="text-xs text-muted-foreground sm:text-sm">
              {enabledCount} of {sortedWidgets.length} widgets shown. Use the arrows to reorder.
            </p>

            <div className="max-h-[50vh] space-y-1.5 overflow-y-auto pr-1">
              {sortedWidgets.map((widget, index) => (
                <div
                  key={widget.id}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-lg border p-2 transition-colors',
                    widget.enabled
                      ? 'border-border bg-card'
                      : 'border-dashed border-border bg-muted/30'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-muted text-[11px] font-semibold text-muted-foreground">
                      {index + 1}
                    </span>
                    <span
                      className={cn(
                        'truncate text-xs font-medium sm:text-sm',
                        widget.enabled ? 'text-foreground' : 'text-muted-foreground'
                      )}
                    >
                      {widget.title}
                    </span>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={index === 0}
                      aria-label={`Move ${widget.title} up`}
                      onClick={() => moveWidget(widget.id, 'up')}
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      disabled={index === sortedWidgets.length - 1}
                      aria-label={`Move ${widget.title} down`}
                      onClick={() => moveWidget(widget.id, 'down')}
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </Button>
                    <Switch
                      checked={widget.enabled}
                      aria-label={`Show ${widget.title}`}
                      onCheckedChange={() => toggleWidget(widget.id)}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" size="sm" onClick={resetWidgets} className="w-full sm:w-auto">
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
            <Button size="sm" onClick={() => setShowSettings(false)} className="w-full sm:w-auto">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageWrapper>
  );
}

function WidgetBandSkeleton({ cols }: { cols: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className="h-28 sm:h-32" />
      ))}
    </div>
  );
}
