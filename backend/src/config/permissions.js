/**
 * Feature permission catalog.
 *
 * Two levels. A **module** (`leads`, `dashboard`) decides whether a user can
 * open that part of the CRM at all. Its **sub-permissions** (`leads.delete`,
 * `dashboard.payments_due`) decide what they can do or see once inside.
 *
 * Sub-permission keys are always `parent.child`. Holding a child means nothing
 * without its parent, and `sanitizePermissions` drops orphans on the way in, so
 * enforcement can stay a plain membership test. ADMIN bypasses every check; for
 * everyone else an empty array grants nothing.
 *
 * Keep FEATURES in sync with frontend/lib/permissions.ts — `pnpm check:permissions`.
 */

export const FEATURES = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    group: 'Overview',
    description: 'Home dashboard with KPIs and recent activity',
    // One per widget: the dashboard renders only the cards a user holds.
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

/** Module keys only, in catalog order. */
export const PARENT_KEYS = FEATURES.map(f => f.key);

/** Every grantable key — modules and their sub-permissions — in catalog order. */
export const FEATURE_KEYS = FEATURES.flatMap(f => [f.key, ...f.children.map(c => c.key)]);

const FEATURE_KEY_SET = new Set(FEATURE_KEYS);

/** child key -> its module key */
const PARENT_OF = new Map(FEATURES.flatMap(f => f.children.map(c => [c.key, f.key])));

/** module key -> its child keys */
const CHILDREN_OF = new Map(FEATURES.map(f => [f.key, f.children.map(c => c.key)]));

export const isValidFeatureKey = key => FEATURE_KEY_SET.has(key);

export const parentOf = key => PARENT_OF.get(key) ?? null;

export const childrenOf = key => [...(CHILDREN_OF.get(key) || [])];

/**
 * Normalise a permissions payload: keeps only known keys, drops sub-permissions
 * whose module was not also granted, de-duplicates, and returns them in catalog
 * order so stored arrays are stable and comparable.
 *
 * Dropping orphans here is what lets every read path be a plain membership test.
 */
export const sanitizePermissions = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  const requested = new Set(permissions.filter(p => typeof p === 'string').map(p => p.trim()));
  return FEATURE_KEYS.filter(key => {
    if (!requested.has(key)) return false;
    const parent = PARENT_OF.get(key);
    return parent ? requested.has(parent) : true;
  });
};

/** Keys in the payload that are not part of the catalog. */
export const unknownPermissions = (permissions = []) => {
  if (!Array.isArray(permissions)) return [];
  return permissions.filter(p => typeof p !== 'string' || !FEATURE_KEY_SET.has(p.trim()));
};

/**
 * Does this granted set include `feature`? A sub-permission also requires its
 * module, so data written outside `sanitizePermissions` cannot sneak past.
 */
export const holdsFeature = (granted, feature) => {
  if (!Array.isArray(granted)) return false;
  if (!granted.includes(feature)) return false;
  const parent = PARENT_OF.get(feature);
  return parent ? granted.includes(parent) : true;
};

/**
 * Sub-permissions marked `optIn` widen who a user can see — agency-wide rather
 * than their own work or branch. They are never switched on as a side effect of
 * granting the module; an admin ticks them deliberately.
 */
export const OPT_IN_KEYS = FEATURES.flatMap(f => f.children.filter(c => c.optIn).map(c => c.key));

/** Expand modules to themselves plus all of their everyday (non opt-in) sub-permissions. */
export const withChildren = (...parents) =>
  parents.flatMap(parent => [
    parent,
    ...childrenOf(parent).filter(key => !OPT_IN_KEYS.includes(key)),
  ]);

/**
 * Suggested starting points shown in the admin UI, and the set used to backfill
 * users that predate the permission system. Not applied at runtime — only the
 * stored array is authoritative.
 *
 * Staff get day-to-day work without destructive or agency-wide actions;
 * managers get the same plus deletes, reporting and rule configuration.
 */
export const ROLE_DEFAULT_PERMISSIONS = {
  ADMIN: [...FEATURE_KEYS],

  MANAGER: [
    ...withChildren('dashboard'),
    ...withChildren('leads'),
    ...withChildren('followups'),
    ...withChildren('itineraries'),
    ...withChildren('itinerary_templates'),
    ...withChildren('trips'),
    ...withChildren('destinations'),
    'whatsapp',
    'whatsapp.send',
    'whatsapp.archive',
    'whatsapp.link_leads',
    'whatsapp.connect',
    ...withChildren('whatsapp_templates'),
    ...withChildren('analytics'),
    'performance',
    ...withChildren('assignment_rules'),
  ].filter(key => key !== 'dashboard.ad_stats'),

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

  /**
   * Central reservations desk: adds hotels and works on every booking in the
   * agency — sees all itineraries, trips and payments, records payments and
   * confirms trips — without editing or deleting other people's itineraries.
   */
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

export const defaultPermissionsForRole = role =>
  sanitizePermissions(ROLE_DEFAULT_PERMISSIONS[role] || []);
