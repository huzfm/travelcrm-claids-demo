/**
 * AUTO-GENERATED — DO NOT EDIT.
 *
 * Written by backend/scripts/generate-frontend-permissions.js from
 * backend/src/config/permissions.js, which is the source of truth for the
 * permission catalog. To change a feature, edit that file and re-run:
 *
 *   cd backend && pnpm permissions:generate
 *
 * Hand-written helpers that build on this live in ./permissions.ts.
 */

export type FeatureKey =
  | 'dashboard'
  | 'dashboard.trip_sales'
  | 'dashboard.pending_followups'
  | 'dashboard.payments_due'
  | 'dashboard.trip_timings'
  | 'dashboard.due_trips'
  | 'dashboard.travel_stats'
  | 'dashboard.pipeline'
  | 'dashboard.followups'
  | 'dashboard.recent_leads'
  | 'dashboard.sources'
  | 'dashboard.top_destinations'
  | 'dashboard.ad_stats'
  | 'dashboard.quick_actions'
  | 'dashboard.search'
  | 'leads'
  | 'leads.create'
  | 'leads.edit'
  | 'leads.delete'
  | 'leads.import'
  | 'leads.export'
  | 'leads.transfer'
  | 'leads.merge'
  | 'leads.tags'
  | 'leads.activities'
  | 'followups'
  | 'followups.create'
  | 'followups.edit'
  | 'followups.delete'
  | 'booked_clients'
  | 'itineraries'
  | 'itineraries.create'
  | 'itineraries.edit'
  | 'itineraries.delete'
  | 'itineraries.share'
  | 'itineraries.pricing'
  | 'itineraries.view_all'
  | 'itinerary_templates'
  | 'itinerary_templates.create'
  | 'itinerary_templates.edit'
  | 'itinerary_templates.delete'
  | 'pdf_settings'
  | 'trips'
  | 'trips.status'
  | 'trips.payments'
  | 'trips.view_all'
  | 'hotels'
  | 'hotels.create'
  | 'hotels.edit'
  | 'hotels.delete'
  | 'vehicles'
  | 'vehicles.create'
  | 'vehicles.edit'
  | 'vehicles.delete'
  | 'destinations'
  | 'destinations.create'
  | 'destinations.edit'
  | 'destinations.delete'
  | 'whatsapp'
  | 'whatsapp.send'
  | 'whatsapp.archive'
  | 'whatsapp.connect'
  | 'whatsapp.link_leads'
  | 'whatsapp_all'
  | 'whatsapp_templates'
  | 'whatsapp_templates.create'
  | 'whatsapp_templates.edit'
  | 'whatsapp_templates.delete'
  | 'ad_campaigns'
  | 'ad_campaigns.connect'
  | 'ad_campaigns.create'
  | 'ad_campaigns.edit'
  | 'ad_campaigns.delete'
  | 'ad_campaigns.sync'
  | 'analytics'
  | 'analytics.pipeline'
  | 'analytics.sources'
  | 'analytics.conversion'
  | 'analytics.team'
  | 'analytics.revenue'
  | 'performance'
  | 'assignment_rules'
  | 'assignment_rules.create'
  | 'assignment_rules.edit'
  | 'assignment_rules.delete'
  | 'branches'
  | 'branches.create'
  | 'branches.edit'
  | 'branches.stats'
  | 'users'
  | 'users.create'
  | 'users.edit'
  | 'users.delete'
  | 'audit_logs'
  | 'audit_logs.export';

export interface FeatureChild {
  key: FeatureKey;
  label: string;
  description: string;
  /** Widens what the user can see; not ticked when the module is ticked. */
  optIn?: boolean;
}

export interface Feature {
  key: FeatureKey;
  label: string;
  group: string;
  description: string;
  children: FeatureChild[];
}

export const FEATURES: Feature[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    group: 'Overview',
    description: 'Home dashboard with KPIs and recent activity',
    children: [
      {
        key: 'dashboard.trip_sales',
        label: 'Trip Sales Stats',
        description: 'Revenue and booking totals',
      },
      {
        key: 'dashboard.pending_followups',
        label: 'Pending Follow-ups',
        description: 'Follow-ups awaiting action',
      },
      { key: 'dashboard.payments_due', label: 'Payments Due', description: 'Money due in and out' },
      {
        key: 'dashboard.trip_timings',
        label: 'Trip Timings',
        description: 'Trips starting and ending',
      },
      {
        key: 'dashboard.due_trips',
        label: 'Live Trips with Dues',
        description: 'Running trips that still owe money',
      },
      {
        key: 'dashboard.travel_stats',
        label: 'Travel Stats',
        description: 'Headline travel counters',
      },
      { key: 'dashboard.pipeline', label: 'Lead Pipeline', description: 'Leads by stage' },
      {
        key: 'dashboard.followups',
        label: "Today's Follow-ups",
        description: 'Follow-ups scheduled for today',
      },
      {
        key: 'dashboard.recent_leads',
        label: 'Recent Leads',
        description: 'Latest leads received',
      },
      { key: 'dashboard.sources', label: 'Lead Sources', description: 'Where leads came from' },
      {
        key: 'dashboard.top_destinations',
        label: 'Top Destinations',
        description: 'Most requested destinations',
      },
      {
        key: 'dashboard.ad_stats',
        label: 'Ad Campaign Stats',
        description: 'Spend and results from connected ad accounts',
      },
      { key: 'dashboard.quick_actions', label: 'Quick Actions', description: 'Shortcut buttons' },
      {
        key: 'dashboard.search',
        label: 'Global Search',
        description: 'Search across trips and leads',
      },
    ],
  },
  {
    key: 'leads',
    label: 'Leads',
    group: 'Sales',
    description: 'Browse, create and manage leads',
    children: [
      { key: 'leads.create', label: 'Create leads', description: 'Add a lead by hand' },
      { key: 'leads.edit', label: 'Edit leads', description: 'Change lead details and status' },
      { key: 'leads.delete', label: 'Delete leads', description: 'Remove a lead' },
      { key: 'leads.import', label: 'Bulk import', description: 'Upload leads from a spreadsheet' },
      { key: 'leads.export', label: 'Export leads', description: 'Download the lead list' },
      {
        key: 'leads.transfer',
        label: 'Transfer leads',
        description: 'Reassign a lead to someone else',
      },
      {
        key: 'leads.merge',
        label: 'Merge duplicates',
        description: 'Combine duplicate lead records',
      },
      { key: 'leads.tags', label: 'Manage tags', description: 'Create and assign lead tags' },
      {
        key: 'leads.activities',
        label: 'Log activity',
        description: 'Add notes and activity entries',
      },
    ],
  },
  {
    key: 'followups',
    label: 'Follow-ups',
    group: 'Sales',
    description: 'Schedule and log follow-up calls',
    children: [
      {
        key: 'followups.create',
        label: 'Create follow-ups',
        description: 'Schedule a new follow-up',
      },
      {
        key: 'followups.edit',
        label: 'Edit follow-ups',
        description: 'Reschedule or record an outcome',
      },
      {
        key: 'followups.delete',
        label: 'Delete follow-ups',
        description: 'Remove a scheduled follow-up',
      },
    ],
  },
  {
    key: 'booked_clients',
    label: 'Booked Clients',
    group: 'Sales',
    description: 'All booked clients across the agency',
    children: [],
  },
  {
    key: 'itineraries',
    label: 'Itineraries',
    group: 'Operations',
    description: 'Build and share trip itineraries',
    children: [
      {
        key: 'itineraries.create',
        label: 'Create itineraries',
        description: 'Build a new itinerary',
      },
      {
        key: 'itineraries.edit',
        label: 'Edit itineraries',
        description: 'Change an existing itinerary',
      },
      {
        key: 'itineraries.delete',
        label: 'Delete itineraries',
        description: 'Remove an itinerary',
      },
      {
        key: 'itineraries.share',
        label: 'Share & send',
        description: 'Send the itinerary to a client',
      },
      {
        key: 'itineraries.pricing',
        label: 'See pricing',
        description: 'View and edit cost and margin figures',
      },
      {
        key: 'itineraries.view_all',
        label: 'See all itineraries',
        description: "Every branch's itineraries, not just their own — view only",
        optIn: true,
      },
    ],
  },
  {
    key: 'itinerary_templates',
    label: 'Itinerary Templates',
    group: 'Operations',
    description: 'Reusable itinerary templates',
    children: [
      {
        key: 'itinerary_templates.create',
        label: 'Create templates',
        description: 'Save an itinerary as a template',
      },
      {
        key: 'itinerary_templates.edit',
        label: 'Edit templates',
        description: 'Change a saved template',
      },
      {
        key: 'itinerary_templates.delete',
        label: 'Delete templates',
        description: 'Remove a template',
      },
    ],
  },
  {
    key: 'pdf_settings',
    label: 'Edit PDF',
    group: 'Operations',
    description: "Cover, footers, terms and last page shared by every itinerary's PDF",
    children: [],
  },
  {
    key: 'trips',
    label: 'Trips & Payments',
    group: 'Operations',
    description: 'Trip records and customer payments',
    children: [
      { key: 'trips.status', label: 'Change trip status', description: 'Confirm or cancel a trip' },
      {
        key: 'trips.payments',
        label: 'Customer payments',
        description: 'Record and remove payments received',
      },
      {
        key: 'trips.view_all',
        label: 'See all trips & payments',
        description: "Every branch's trips and payments; can record payments on any of them",
        optIn: true,
      },
    ],
  },
  {
    key: 'hotels',
    label: 'Hotels',
    group: 'Inventory',
    description: 'Hotel master data and rates',
    children: [
      { key: 'hotels.create', label: 'Add hotels', description: 'Create a hotel record' },
      {
        key: 'hotels.edit',
        label: 'Edit hotels',
        description: 'Change hotel details, rates and images',
      },
      { key: 'hotels.delete', label: 'Delete hotels', description: 'Remove a hotel record' },
    ],
  },
  {
    key: 'vehicles',
    label: 'Vehicles',
    group: 'Inventory',
    description: 'Vehicle master data and rates',
    children: [
      { key: 'vehicles.create', label: 'Add vehicles', description: 'Create a vehicle record' },
      {
        key: 'vehicles.edit',
        label: 'Edit vehicles',
        description: 'Change vehicle details, rates and images',
      },
      { key: 'vehicles.delete', label: 'Delete vehicles', description: 'Remove a vehicle record' },
    ],
  },
  {
    key: 'destinations',
    label: 'Destinations',
    group: 'Inventory',
    description: 'Destinations, places and activities',
    children: [
      {
        key: 'destinations.create',
        label: 'Add destinations',
        description: 'Create a destination record',
      },
      {
        key: 'destinations.edit',
        label: 'Edit destinations',
        description: 'Change destination details',
      },
      {
        key: 'destinations.delete',
        label: 'Delete destinations',
        description: 'Remove a destination record',
      },
    ],
  },
  {
    key: 'whatsapp',
    label: 'WhatsApp',
    group: 'Communication',
    description: 'Own WhatsApp inbox and conversations',
    children: [
      {
        key: 'whatsapp.send',
        label: 'Send messages',
        description: 'Reply and start conversations',
      },
      {
        key: 'whatsapp.archive',
        label: 'Archive chats',
        description: 'Archive and unarchive conversations',
      },
      {
        key: 'whatsapp.connect',
        label: 'Connect branch number',
        description:
          "Link, restart or disconnect the branch's shared number — everyone with WhatsApp can link their own",
      },
      {
        key: 'whatsapp.link_leads',
        label: 'Link to leads',
        description: 'Attach a chat to a lead or create one from it',
      },
    ],
  },
  {
    key: 'whatsapp_all',
    label: 'All WhatsApp Inboxes',
    group: 'Communication',
    description: 'Every user’s WhatsApp conversations',
    children: [],
  },
  {
    key: 'whatsapp_templates',
    label: 'Message Templates',
    group: 'Communication',
    description: 'WhatsApp message templates',
    children: [
      {
        key: 'whatsapp_templates.create',
        label: 'Create templates',
        description: 'Add a message template',
      },
      {
        key: 'whatsapp_templates.edit',
        label: 'Edit templates',
        description: 'Change a message template',
      },
      {
        key: 'whatsapp_templates.delete',
        label: 'Delete templates',
        description: 'Remove a message template',
      },
    ],
  },
  {
    key: 'ad_campaigns',
    label: 'Connected Apps',
    group: 'Growth',
    description: 'Meta / Google ad campaign integrations',
    children: [
      {
        key: 'ad_campaigns.connect',
        label: 'Connect accounts',
        description: 'Run the Google/Meta OAuth flow',
      },
      {
        key: 'ad_campaigns.create',
        label: 'Add campaigns',
        description: 'Create a campaign record',
      },
      {
        key: 'ad_campaigns.edit',
        label: 'Edit campaigns',
        description: 'Change a campaign record',
      },
      {
        key: 'ad_campaigns.delete',
        label: 'Delete campaigns',
        description: 'Remove a campaign record',
      },
      {
        key: 'ad_campaigns.sync',
        label: 'Sync spend data',
        description: 'Pull spend and results from the platform',
      },
    ],
  },
  {
    key: 'analytics',
    label: 'Analytics',
    group: 'Insights',
    description: 'Reports and conversion analytics',
    children: [
      { key: 'analytics.pipeline', label: 'Pipeline report', description: 'Leads by stage' },
      { key: 'analytics.sources', label: 'Source report', description: 'Where leads came from' },
      {
        key: 'analytics.conversion',
        label: 'Conversion report',
        description: 'Conversion rates over time',
      },
      {
        key: 'analytics.team',
        label: 'Team report',
        description: 'Per-user activity and outcomes',
      },
      { key: 'analytics.revenue', label: 'Revenue report', description: 'Revenue figures' },
    ],
  },
  {
    key: 'performance',
    label: 'Performance',
    group: 'Insights',
    description: 'Staff performance leaderboards',
    children: [],
  },
  {
    key: 'assignment_rules',
    label: 'Assignment Rules',
    group: 'Administration',
    description: 'Automatic lead assignment rules',
    children: [
      {
        key: 'assignment_rules.create',
        label: 'Create rules',
        description: 'Add an assignment rule',
      },
      {
        key: 'assignment_rules.edit',
        label: 'Edit rules',
        description: 'Change an assignment rule',
      },
      {
        key: 'assignment_rules.delete',
        label: 'Delete rules',
        description: 'Remove an assignment rule',
      },
    ],
  },
  {
    key: 'branches',
    label: 'Branches',
    group: 'Administration',
    description: 'Branch settings and configuration',
    children: [
      { key: 'branches.create', label: 'Create branches', description: 'Add a branch' },
      { key: 'branches.edit', label: 'Edit branches', description: 'Change branch settings' },
      {
        key: 'branches.stats',
        label: 'Branch statistics',
        description: 'View per-branch performance figures',
      },
    ],
  },
  {
    key: 'users',
    label: 'Staff & Permissions',
    group: 'Administration',
    description: 'Create staff and grant feature access',
    children: [
      { key: 'users.create', label: 'Create staff', description: 'Add a staff account' },
      {
        key: 'users.edit',
        label: 'Edit staff',
        description: 'Change staff details and reset passwords',
      },
      { key: 'users.delete', label: 'Delete staff', description: 'Remove a staff account' },
    ],
  },
  {
    key: 'audit_logs',
    label: 'Audit Logs',
    group: 'Administration',
    description: 'System-wide activity trail',
    children: [
      { key: 'audit_logs.export', label: 'Export logs', description: 'Download the audit trail' },
    ],
  },
];

/** Suggested starting sets offered as presets when creating a user. */
export const ROLE_DEFAULT_PERMISSIONS: Record<
  'ADMIN' | 'MANAGER' | 'STAFF' | 'RESERVATION_MANAGER',
  FeatureKey[]
> = {
  ADMIN: [
    'dashboard',
    'dashboard.trip_sales',
    'dashboard.pending_followups',
    'dashboard.payments_due',
    'dashboard.trip_timings',
    'dashboard.due_trips',
    'dashboard.travel_stats',
    'dashboard.pipeline',
    'dashboard.followups',
    'dashboard.recent_leads',
    'dashboard.sources',
    'dashboard.top_destinations',
    'dashboard.ad_stats',
    'dashboard.quick_actions',
    'dashboard.search',
    'leads',
    'leads.create',
    'leads.edit',
    'leads.delete',
    'leads.import',
    'leads.export',
    'leads.transfer',
    'leads.merge',
    'leads.tags',
    'leads.activities',
    'followups',
    'followups.create',
    'followups.edit',
    'followups.delete',
    'booked_clients',
    'itineraries',
    'itineraries.create',
    'itineraries.edit',
    'itineraries.delete',
    'itineraries.share',
    'itineraries.pricing',
    'itineraries.view_all',
    'itinerary_templates',
    'itinerary_templates.create',
    'itinerary_templates.edit',
    'itinerary_templates.delete',
    'pdf_settings',
    'trips',
    'trips.status',
    'trips.payments',
    'trips.view_all',
    'hotels',
    'hotels.create',
    'hotels.edit',
    'hotels.delete',
    'vehicles',
    'vehicles.create',
    'vehicles.edit',
    'vehicles.delete',
    'destinations',
    'destinations.create',
    'destinations.edit',
    'destinations.delete',
    'whatsapp',
    'whatsapp.send',
    'whatsapp.archive',
    'whatsapp.connect',
    'whatsapp.link_leads',
    'whatsapp_all',
    'whatsapp_templates',
    'whatsapp_templates.create',
    'whatsapp_templates.edit',
    'whatsapp_templates.delete',
    'ad_campaigns',
    'ad_campaigns.connect',
    'ad_campaigns.create',
    'ad_campaigns.edit',
    'ad_campaigns.delete',
    'ad_campaigns.sync',
    'analytics',
    'analytics.pipeline',
    'analytics.sources',
    'analytics.conversion',
    'analytics.team',
    'analytics.revenue',
    'performance',
    'assignment_rules',
    'assignment_rules.create',
    'assignment_rules.edit',
    'assignment_rules.delete',
    'branches',
    'branches.create',
    'branches.edit',
    'branches.stats',
    'users',
    'users.create',
    'users.edit',
    'users.delete',
    'audit_logs',
    'audit_logs.export',
  ],
  MANAGER: [
    'dashboard',
    'dashboard.trip_sales',
    'dashboard.pending_followups',
    'dashboard.payments_due',
    'dashboard.trip_timings',
    'dashboard.due_trips',
    'dashboard.travel_stats',
    'dashboard.pipeline',
    'dashboard.followups',
    'dashboard.recent_leads',
    'dashboard.sources',
    'dashboard.top_destinations',
    'dashboard.quick_actions',
    'dashboard.search',
    'leads',
    'leads.create',
    'leads.edit',
    'leads.delete',
    'leads.import',
    'leads.export',
    'leads.transfer',
    'leads.merge',
    'leads.tags',
    'leads.activities',
    'followups',
    'followups.create',
    'followups.edit',
    'followups.delete',
    'itineraries',
    'itineraries.create',
    'itineraries.edit',
    'itineraries.delete',
    'itineraries.share',
    'itineraries.pricing',
    'itinerary_templates',
    'itinerary_templates.create',
    'itinerary_templates.edit',
    'itinerary_templates.delete',
    'trips',
    'trips.status',
    'trips.payments',
    'destinations',
    'destinations.create',
    'destinations.edit',
    'destinations.delete',
    'whatsapp',
    'whatsapp.send',
    'whatsapp.archive',
    'whatsapp.link_leads',
    'whatsapp.connect',
    'whatsapp_templates',
    'whatsapp_templates.create',
    'whatsapp_templates.edit',
    'whatsapp_templates.delete',
    'analytics',
    'analytics.pipeline',
    'analytics.sources',
    'analytics.conversion',
    'analytics.team',
    'analytics.revenue',
    'performance',
    'assignment_rules',
    'assignment_rules.create',
    'assignment_rules.edit',
    'assignment_rules.delete',
  ],
  STAFF: [
    'dashboard',
    'dashboard.trip_sales',
    'dashboard.pending_followups',
    'dashboard.trip_timings',
    'dashboard.pipeline',
    'dashboard.followups',
    'dashboard.recent_leads',
    'dashboard.quick_actions',
    'dashboard.search',
    'leads',
    'leads.create',
    'leads.edit',
    'leads.transfer',
    'leads.tags',
    'leads.activities',
    'followups',
    'followups.create',
    'followups.edit',
    'itineraries',
    'itineraries.create',
    'itineraries.edit',
    'itineraries.share',
    'itineraries.pricing',
    'itinerary_templates',
    'trips',
    'trips.payments',
    'whatsapp',
    'whatsapp.send',
    'whatsapp.archive',
    'whatsapp.link_leads',
  ],
  RESERVATION_MANAGER: [
    'dashboard',
    'dashboard.trip_timings',
    'dashboard.due_trips',
    'dashboard.search',
    'booked_clients',
    'itineraries',
    'itineraries.pricing',
    'itineraries.view_all',
    'trips',
    'trips.status',
    'trips.payments',
    'trips.view_all',
    'hotels',
    'hotels.create',
    'hotels.edit',
    'destinations',
  ],
};
