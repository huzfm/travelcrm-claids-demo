/**
 * Backfill script: run AFTER `pnpm db:push`.
 *
 * Ad leads used to share one generic AD_CAMPAIGN source. They are now split into
 * META_ADS and GOOGLE_ADS. This moves old leads onto the right one, using:
 *   1. the platform of the campaign the lead is linked to, else
 *   2. the "Lead created via Meta Ads / Google Ads webhook" activity entry.
 * Leads where neither tells us the platform are left alone and listed.
 *
 * Old AD_CAMPAIGN assignment rules can't know their platform, so they are only
 * reported - recreate them under Meta Ads / Google Ads and delete the old ones.
 *
 * Usage: node scripts/backfill-ad-lead-sources.js [--dry-run]
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const dryRun = process.argv.includes('--dry-run');

const sourceFor = lead => {
  const platforms = new Set(lead.adCampaignLeads.map(c => c.campaign.platform));
  if (platforms.size === 1) return platforms.has('GOOGLE') ? 'GOOGLE_ADS' : 'META_ADS';

  const created = lead.activities.map(a => a.description || '').join(' ');
  if (created.includes('via Google Ads')) return 'GOOGLE_ADS';
  if (created.includes('via Meta Ads')) return 'META_ADS';
  return null;
};

const run = async () => {
  const leads = await prisma.lead.findMany({
    where: { source: 'AD_CAMPAIGN' },
    select: {
      id: true,
      name: true,
      phone: true,
      adCampaignLeads: { select: { campaign: { select: { platform: true } } } },
      activities: {
        where: { description: { contains: 'webhook' } },
        select: { description: true },
      },
    },
  });

  console.log(`[backfill] ${leads.length} leads with source AD_CAMPAIGN`);

  const bySource = { META_ADS: [], GOOGLE_ADS: [] };
  const unknown = [];
  for (const lead of leads) {
    const source = sourceFor(lead);
    if (source) bySource[source].push(lead.id);
    else unknown.push(lead);
  }

  for (const [source, ids] of Object.entries(bySource)) {
    console.log(`[backfill] ${ids.length} -> ${source}`);
    if (!dryRun && ids.length > 0) {
      await prisma.lead.updateMany({ where: { id: { in: ids } }, data: { source } });
    }
  }

  if (unknown.length > 0) {
    console.log(`[backfill] ${unknown.length} leads with no platform info (left as AD_CAMPAIGN):`);
    unknown.forEach(l => console.log(`  - ${l.id}  ${l.name}  ${l.phone}`));
  }

  const oldRules = await prisma.assignmentRule.findMany({
    where: { source: 'AD_CAMPAIGN' },
    include: { user: { select: { name: true } }, branch: { select: { name: true } } },
  });
  if (oldRules.length > 0) {
    console.log(
      `[backfill] ${oldRules.length} AD_CAMPAIGN assignment rules - recreate them as Meta Ads / Google Ads:`
    );
    oldRules.forEach(r => console.log(`  - ${r.branch.name}: ${r.user.name} (#${r.priority})`));
  }

  if (dryRun) console.log('[backfill] dry run - nothing written');
};

run()
  .catch(err => {
    console.error('[backfill] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
