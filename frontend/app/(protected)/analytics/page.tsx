'use client';

import { useState, useMemo } from 'react';
import { PageWrapper, PageHeader } from '@/components/layout/page-wrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { BarChart, PieChartComponent } from '@/components/charts';
import { Users, Plane, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/axios';

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

interface LeadSummary {
  total: number;
  byStatus: Record<string, number>;
  bySource: Record<string, number>;
}

export default function AnalyticsPage() {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [filterKey, setFilterKey] = useState<number>(0);

  // Counts are grouped on the server (summary mode) — the page never needs the
  // individual lead rows, only how many fall in each status and source.
  const { data: summary, isLoading } = useQuery<LeadSummary>({
    queryKey: ['analytics-lead-summary', filterKey],
    queryFn: async () => {
      const params: Record<string, string> = { analytics: 'true', summary: 'true' };
      if (dateFrom) params.from = dateFrom;
      if (dateTo) params.to = dateTo;
      const response = await api.get('/leads', { params });
      return response.data.data;
    },
    staleTime: 0,
    gcTime: 0,
  });

  const { leadStats, pipelineData, sourcesData } = useMemo(() => {
    const byStatus = summary?.byStatus || {};
    const count = (status: string) => byStatus[status] || 0;
    // Booked = won + quote sent, same as before.
    const bookedCount = count('WON') + count('QUOTE_SENT');

    const pipelineData = [
      { name: 'Fresh', value: count('FRESH') },
      { name: 'Contacted', value: count('CONTACTED') },
      { name: 'Hot', value: count('HOT') },
      { name: 'Warm', value: count('WARM') },
      { name: 'Booked', value: bookedCount },
    ].filter(item => item.value > 0);

    const sourcesData = Object.entries(summary?.bySource || {}).map(([name, value]) => ({
      name,
      value,
      label: sourceLabels[name] || name,
    }));

    return {
      leadStats: { totalLeads: summary?.total || 0, bookedTrips: bookedCount },
      pipelineData,
      sourcesData,
    };
  }, [summary]);

  const totalLeads = leadStats.totalLeads;
  const bookedLeads = leadStats.bookedTrips;

  if (isLoading) {
    return (
      <PageWrapper>
        <PageHeader title="Analytics" description="Travel CRM performance insights" />
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <Skeleton className="h-24" />
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-75" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <Skeleton className="h-75" />
              </CardContent>
            </Card>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <PageHeader
        title="Analytics"
        description="Travel CRM performance insights and metrics"
        action={
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full">
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Label className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                From
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="h-9 text-xs flex-1 min-w-0"
              />
            </div>
            <div className="flex items-center gap-2 flex-1 sm:flex-none">
              <Label className="text-xs text-muted-foreground whitespace-nowrap shrink-0">To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={e => setDateTo(e.target.value)}
                className="h-9 text-xs flex-1 min-w-0"
              />
            </div>
            <Button
              size="sm"
              onClick={() => setFilterKey(k => k + 1)}
              className="h-9 whitespace-nowrap shrink-0"
            >
              Filter
            </Button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <KPICard
          title="Total Leads"
          value={totalLeads}
          icon={<Users className="h-4 w-4 sm:h-5 sm:w-5" />}
          color="primary"
        />
        <KPICard
          title="Booked Trips"
          value={bookedLeads}
          icon={<Plane className="h-4 w-4 sm:h-5 sm:w-5" />}
          color="success"
        />
      </div>

      {/* Charts Row: Lead Pipeline & Lead Sources */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
        <Card className="shadow-brand hover:shadow-brand-lg transition-shadow">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
              <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-primary" /> Lead Pipeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart data={pipelineData} dataKey="value" xAxisKey="name" height={240} />
          </CardContent>
        </Card>

        <Card className="shadow-brand hover:shadow-brand-lg transition-shadow">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="flex items-center gap-2 text-xs sm:text-sm">
              <Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary" /> Lead Sources
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent data={sourcesData} height={240} />
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}

function KPICard({
  title,
  value,
  icon,
  color = 'primary',
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: 'primary' | 'accent' | 'success' | 'warning' | 'secondary';
}) {
  const colorMap = {
    primary: {
      bg: 'bg-primary/5',
      border: 'border-primary/10',
      icon: 'bg-primary/10 text-primary',
      text: 'text-primary',
    },
    accent: {
      bg: 'bg-accent/5',
      border: 'border-accent/10',
      icon: 'bg-accent/10 text-accent',
      text: 'text-accent',
    },
    success: {
      bg: 'bg-success/5',
      border: 'border-success/10',
      icon: 'bg-success/10 text-success',
      text: 'text-success',
    },
    warning: {
      bg: 'bg-warning/5',
      border: 'border-warning/10',
      icon: 'bg-warning/10 text-warning',
      text: 'text-warning',
    },
    secondary: {
      bg: 'bg-secondary/5',
      border: 'border-secondary/10',
      icon: 'bg-secondary/10 text-secondary',
      text: 'text-secondary',
    },
  };
  const styles = colorMap[color];

  return (
    <Card
      className={cn(
        'border shadow-brand hover:shadow-brand-lg transition-all duration-200 hover:-translate-y-0.5',
        styles.bg,
        styles.border
      )}
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {title}
            </p>
            <p className={cn('text-2xl sm:text-3xl font-bold mt-1 tracking-tight', styles.text)}>
              {value}
            </p>
          </div>
          <div className={cn('rounded-xl p-3', styles.icon)}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}
