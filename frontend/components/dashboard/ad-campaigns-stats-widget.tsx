'use client';

import Link from 'next/link';
import { TrendingUp, Target, Star, Megaphone, IndianRupee } from 'lucide-react';
import { SectionHeading, StatTile, TileGrid, WidgetCard } from './widget-shell';

export interface AdCampaignsStatsWidgetProps {
  adCampaignStats?: {
    activeCampaigns?: number;
    totalSpend?: number;
    totalLeads?: number;
    costPerLead?: number;
    bestCampaign?: { name?: string; leadsCount?: number };
    byPlatform?: { GOOGLE?: number; META?: number };
  };
}

export function AdCampaignsStatsWidget({ adCampaignStats }: AdCampaignsStatsWidgetProps) {
  const activeCampaigns = adCampaignStats?.activeCampaigns ?? 0;
  const byPlatform = adCampaignStats?.byPlatform;

  return (
    <section className="space-y-3">
      <SectionHeading title="Advertising" icon={Megaphone} />

      <WidgetCard
        title="Ad Campaigns Performance"
        href="/ad-campaigns"
        icon={Megaphone}
        tone="gold"
        meta={
          activeCampaigns > 0
            ? `${activeCampaigns} active ${activeCampaigns === 1 ? 'campaign' : 'campaigns'}`
            : 'No campaigns running'
        }
        footer={
          byPlatform ? (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
              <span>
                Google <span className="stat-number text-foreground">{byPlatform.GOOGLE ?? 0}</span>
              </span>
              <span>
                Meta <span className="stat-number text-foreground">{byPlatform.META ?? 0}</span>
              </span>
              <Link
                href="/ad-campaigns"
                className="ml-auto font-medium text-primary transition-opacity hover:opacity-80"
              >
                Manage campaigns →
              </Link>
            </div>
          ) : undefined
        }
      >
        <TileGrid>
          <StatTile
            label="Total Spend"
            value={`₹${(adCampaignStats?.totalSpend ?? 0).toLocaleString()}`}
            size="sm"
            tone="primary"
            icon={IndianRupee}
          />
          <StatTile
            label="Leads"
            value={adCampaignStats?.totalLeads ?? 0}
            href="/leads"
            icon={Target}
          />
          <StatTile
            label="Cost / Lead"
            value={`₹${(adCampaignStats?.costPerLead ?? 0).toLocaleString()}`}
            size="sm"
            tone="warning"
            icon={TrendingUp}
          />
          <StatTile
            label="Best Campaign"
            value={adCampaignStats?.bestCampaign?.name || 'None'}
            size="sm"
            hint={
              adCampaignStats?.bestCampaign
                ? `${adCampaignStats.bestCampaign.leadsCount ?? 0} leads`
                : undefined
            }
            tone="success"
            icon={Star}
          />
        </TileGrid>
      </WidgetCard>
    </section>
  );
}
