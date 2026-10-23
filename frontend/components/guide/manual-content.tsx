import {
  AlertTriangle,
  BadgeCheck,
  BarChart3,
  BookOpen,
  Building,
  Building2,
  Car,
  Compass,
  FileText,
  HelpCircle,
  Image as ImageIcon,
  Inbox,
  KeyRound,
  Keyboard,
  Layers,
  LayoutDashboard,
  ListChecks,
  LogIn,
  MapPin,
  Megaphone,
  MessageCircle,
  MessageSquare,
  Phone,
  Plane,
  Route,
  Shield,
  ShieldCheck,
  Tag,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
} from 'lucide-react';
import { HowItWorks } from './how-it-works';
import { RoleMatrix } from './role-matrix';
import { FeatureReference } from './feature-reference';
import { Troubleshooting } from './troubleshooting';
import { YourAccessCard } from './your-access-card';
import type { GuideCategory } from './manual-types';

/**
 * The whole CRM manual, grouped the same way the sidebar is, so a topic lives
 * where a user would expect to go looking for it. Content here is written to
 * match what the app actually does — update it alongside real feature changes
 * rather than letting it drift into aspirational documentation.
 */
export const GUIDE_CATEGORIES: GuideCategory[] = [
  {
    id: 'getting-started',
    label: 'Getting Started',
    icon: BookOpen,
    blurb: 'Orientation for a brand-new account.',
    articles: [
      {
        id: 'welcome',
        title: 'Welcome to the CRM',
        icon: Compass,
        summary:
          'What this system is for, and how the pieces — leads, itineraries, messaging, reporting — fit together.',
        keyPoints: [
          'This is a multi-branch travel agency CRM: it takes a prospect from first enquiry (a Lead) through follow-ups and a quoted itinerary to a booked trip.',
          'Every user belongs to one branch. Non-admins only ever see their own branch\'s data — that is enforced by the server, not just hidden in the UI.',
          'The sidebar only shows the areas you have been granted. If something you expect is missing, see "Roles & Permissions" in this guide.',
          'The Guide (this page) is open to every signed-in user on purpose — it is not gated by a permission, because the person most likely to need it is the one who just found a page missing.',
        ],
        workflows: [
          {
            title: 'Find your way around',
            steps: [
              'Use the sidebar to move between modules — it is organized in the same order as this guide\'s categories.',
              'Your name, role and branch are shown at the bottom of the sidebar; click it to reach your Profile or to log out.',
              'Collapse the sidebar with the icon at its top-right to get more screen space; it re-expands the same way.',
              'On a phone or narrow window, use the menu icon at the top-left to open the sidebar as a slide-over.',
            ],
          },
        ],
        tips: [
          'A typical day-to-day flow: a Lead comes in → it gets auto-assigned → the owner works it through Follow-ups → once it is ready, an Itinerary is built and sent as a PDF → when the client agrees, the lead is moved to WON and shows up under Booked Clients.',
        ],
        keywords: ['overview', 'introduction', 'orientation', 'start here'],
      },
      {
        id: 'roles-branches-101',
        title: 'Roles, branches & what you can see',
        icon: KeyRound,
        summary:
          'The short version of access control — read "Roles & Permissions" below for the full picture.',
        keyPoints: [
          'Three roles: ADMIN (every branch, everything), MANAGER (their own branch, full access), STAFF (only leads assigned to them, nothing destructive by default).',
          'On top of role, an admin ticks individual feature permissions per person — a role is a starting point, not a hard rule.',
          'Branch scoping and feature permissions are independent: a permission decides *what* you can reach, your branch decides *whose data* you see while reaching it.',
        ],
        workflows: [],
        tips: [
          'If a page or button is missing, it is almost always a permission that has not been granted — ask an Admin, or open the "Roles & Permissions" category for the exact fix.',
        ],
        keywords: ['admin', 'manager', 'staff', 'access', 'branch scoping'],
      },
      {
        id: 'signing-in-and-profile',
        title: 'Signing in & your profile',
        icon: LogIn,
        route: '/profile',
        summary: 'Logging in, resetting a forgotten password, and editing your own name, email, phone and password.',
        keyPoints: [
          'Login can require a 6-digit OTP as a second step if that is enabled for your account/branch — a 5-minute countdown is shown with a Resend option.',
          'After signing in you land on the first page your permissions actually allow, not always Dashboard.',
          'Forgot Password uses your phone number, not your email — it sends an OTP over WhatsApp.',
          'Your Profile page lets you edit name, email, phone and avatar, plus change your password. Role and Branch are shown there but are read-only — only an Admin/Manager with the Users permission can change those.',
        ],
        workflows: [
          {
            title: 'Sign in',
            steps: [
              'Enter your email and password on the login screen and press "Sign in".',
              'If prompted, enter the 6-digit OTP sent to you and press "Verify & Sign in".',
              'If you were signed out automatically, a brief message explains why (session expired or revoked) before you log back in.',
            ],
          },
          {
            title: 'Reset a forgotten password',
            steps: [
              'On the login screen, click "Forgot Password?".',
              'Enter your phone number and press "Send Reset Code".',
              'Enter the OTP you receive, then set a new password.',
            ],
          },
          {
            title: 'Update your profile or change your password',
            steps: [
              'Click your name/avatar at the bottom of the sidebar → "My Profile".',
              'Press "Edit Profile" to change your name, email, phone or photo, then "Save Changes".',
              'To change your password, fill in Current Password, New Password (6+ characters) and Confirm New Password, then "Change Password" — this signs you out so you can log back in with the new one.',
            ],
          },
        ],
        tips: [
          'A deactivated account gets a specific "Your account has been deactivated. Contact your manager." message instead of a generic login error.',
          'Sessions renew themselves quietly in the background for up to 7 days; you are only sent back to the login page once that window (or an explicit revoke) runs out.',
        ],
        keywords: ['login', 'logout', 'password', 'otp', 'forgot password', 'profile', 'account'],
      },
    ],
  },
  {
    id: 'leads-pipeline',
    label: 'Leads & Pipeline',
    icon: Users,
    blurb: 'The sales pipeline: leads, follow-ups, clients, and how leads get routed.',
    articles: [
      {
        id: 'leads',
        title: 'Leads',
        icon: Users,
        route: '/leads',
        summary: 'The central pipeline for every prospective traveler, from first contact to booking or loss.',
        keyPoints: [
          'Statuses: Fresh, Follow Up, Quote Sent, Hot Lead, Warm, Not Answering, Won, Not Interested, Junk, Sent Voicemail, Call Declined, Call Back Scheduled, Connected, Closed. The Kanban board only shows six of these as columns (Fresh, Follow Up, Quote Sent, Hot Lead, Warm, and Booked = Won) — the rest are table/filter-only.',
          'Sources: Website, WhatsApp, Walk-in, Social Media, Meta Ads, Google Ads, Bulk Import.',
          'Two views: Pipeline (Kanban — drag a card between the six stages) and Table (all leads, sortable and paginated at 50 per page).',
          'Each lead has a 0–100 score that drives a priority badge on its Kanban card: 80+ is high, 50+ medium, 20+ low.',
          'Branch, Source and Assignee columns/filters are only visible to ADMIN/MANAGER — Staff only ever sees their own branch\'s leads and does not see the source/branch columns.',
          'Filters, search, the page number and the Pipeline/Table choice stay in the URL (so the view can be shared or bookmarked) and are also remembered when you open a lead and come back to the list.',
        ],
        workflows: [
          {
            title: 'Create a lead',
            steps: [
              'Go to Leads → "Add Lead".',
              'Fill in the required fields: Name, Phone, Destination, Pax.',
              'Optionally expand "Additional Details" for email, budget, trip type, hotel category, pickup point, children, notes.',
              'Admin/Manager can expand "Assignment & Priority" to pick a branch (admin only), assign a specific staff member (or leave it on Auto-assign), and set a priority.',
              'Press "Create Lead".',
            ],
          },
          {
            title: 'Bulk import leads',
            steps: [
              'Go to Leads → "Bulk Import (Excel)".',
              'Click "Download Template" first, so your columns line up with what the importer expects.',
              'Fill in the template and save it as .csv, .xls or .xlsx.',
              'Choose the file and press Import.',
              'Duplicates (same phone or email already in your branch) are skipped automatically and reported in the result toast, rather than created twice.',
            ],
          },
          {
            title: 'Move a lead through the pipeline',
            steps: [
              'Open Pipeline view and drag a lead\'s card into a new column to change its status, or',
              'Open the lead\'s detail page and change its status field directly — useful for statuses that have no Kanban column.',
            ],
          },
          {
            title: 'Reassign or delete a lead',
            steps: [
              'To transfer a lead you own: open it → "Transfer Lead" → pick another active staff member in your branch (you cannot transfer to yourself, the current owner, or an Admin) → add an optional reason → Transfer.',
              'To delete a lead (Admin only): open it → "Delete" → confirm. This is a soft delete — the lead disappears from lists but is not destroyed, so its phone/email can legitimately be re-entered later without tripping duplicate detection.',
            ],
          },
        ],
        tips: [
          'Duplicate detection matches on phone OR email (case-insensitive for email), scoped to the same branch only — the same contact in a different branch will not be flagged.',
          '"Auto-assign" (the default when creating a lead) tries the branch\'s Assignment Rules first; if nothing matches it falls back to the oldest active Staff member in the branch, then the oldest active Manager. If nothing matches at all, the lead is created unassigned.',
          'Only Admin/Manager can set the Lead Source and see the "Assignment & Priority" section when creating a lead.',
          'Edit shows for Admin, Manager, or the lead\'s own owner. Delete is Admin-only. Transfer is only offered to Staff on leads they personally own.',
        ],
        keywords: ['pipeline', 'kanban', 'duplicate', 'import', 'excel', 'won', 'lost', 'score'],
      },
      {
        id: 'followups',
        title: 'Follow-ups',
        icon: Phone,
        route: '/followups',
        summary: 'The task list for scheduled touchpoints on a lead, so nothing falls through.',
        keyPoints: [
          'Types: Call, Meeting, Visit, Email, WhatsApp, Video Call, Other — each with its own icon and color.',
          'Three tabs: Today, Overdue (past its scheduled time and not Done), and Upcoming (next 7 days, excluding today).',
          'Statuses: Pending / Rescheduled / Overdue are all actionable; Done is shown greyed out with a "Completed" badge.',
          'A background job marks follow-ups overdue automatically every 5 minutes, and a daily 8 AM digest summarizes them.',
        ],
        workflows: [
          {
            title: 'Schedule a follow-up',
            steps: [
              'Open a lead\'s detail page → the Follow-ups tab → "Schedule Follow-up".',
              'If you are allowed to assign, optionally reassign it to someone else (otherwise it defaults to you).',
              'Pick a type, set a date and time, add optional notes.',
              'Press Schedule.',
            ],
          },
          {
            title: 'Clear your queue',
            steps: [
              'Open the Follow-ups page and check the Overdue tab first — its badge pulses red when it is non-zero.',
              'For each item, either press "Done", or "Reschedule" to pick a new date in the calendar dialog (the same dialog also lets you mark Done or Delete from there).',
            ],
          },
        ],
        tips: [
          'Deleting a follow-up asks for confirmation and is permanent — unlike leads, follow-ups are not soft-deleted.',
          'The assignee dropdown only appears if you are allowed to assign to others; staff scheduling their own follow-up will not see it.',
        ],
        keywords: ['tasks', 'reminders', 'overdue', 'today', 'upcoming', 'reschedule'],
      },
      {
        id: 'booked-clients',
        title: 'Booked Clients',
        icon: BadgeCheck,
        route: '/booked-clients',
        summary:
          'A branch-wide, read-only gallery of every client who has at least one itinerary — a quick way to browse or search bookings.',
        keyPoints: [
          'Stat tiles at the top: total clients (current page), total itineraries, total travelers.',
          'Each card shows the client\'s latest itinerary — destination, trip ID, dates, and share status — and lists every itinerary if there is more than one.',
          'Non-admins see the itinerary\'s total cost on the card; Admin does not, on this page.',
          'Paginated at 20 per page.',
        ],
        workflows: [
          {
            title: 'Find a booked client',
            steps: [
              'Type into the search box — it matches name, phone, or email.',
              'Optionally set a From/To date range; results update live. "Clear" resets the date filter.',
              'From a card, click "Lead" to open the underlying lead, or "Itinerary" to open the latest itinerary — or click any row under "All Itineraries" to open a specific one.',
            ],
          },
        ],
        tips: [
          'This shows clients across the whole branch (or every branch, for Admin) — it is not limited to leads you personally own.',
        ],
        keywords: ['bookings', 'clients', 'search clients'],
      },
      {
        id: 'assignment-rules',
        title: 'Assignment Rules',
        icon: Route,
        route: '/settings/assignment-rules',
        summary: 'Configure automatic lead routing so new leads land on the right person without manual triage.',
        keyPoints: [
          'A rule = Branch (locked to their own branch for a Manager) + Lead Source + assigned User + Priority (lower number wins) + Active toggle.',
          'Rules are grouped and shown by branch, sorted by priority within each branch.',
          'The "Assign To" list when creating a rule only offers active users already in the target branch.',
        ],
        workflows: [
          {
            title: 'Create or manage a rule',
            steps: [
              'Press "Add Rule" → (Admin) pick a branch → pick a Lead Source (Website, WhatsApp, Walk-in, Social Media, Meta Ads, Google Ads, Bulk Import) → add one or more users, each with a priority (+ Add user for more) → Create Rule.',
              'To edit: press the pencil icon on a rule and adjust source/user/priority/active inline, then Save.',
              'To pause a rule without losing it: flip its Active switch off — auto-assignment skips inactive rules.',
              'To remove a rule for good: press the trash icon and confirm (this cannot be undone).',
            ],
          },
        ],
        tips: [
          'Priority: lower number = higher priority. Users sharing the top priority for a source take turns (round-robin); users with a bigger number are backups that only get leads when nobody above them is active.',
          'Matching order for a new lead: (1) the active rules in that branch for the lead\'s exact source, (2) if none, the active rules in that branch regardless of source, (3) the active rules for that source in any branch (only used in some admin-created-lead cases), (4) the oldest active Staff member in the branch, (5) the oldest active Manager in the branch. If nothing matches at all, the lead is created unassigned.',
          'A rule whose assigned user has been deactivated is skipped and the next user in line gets the lead — if leads stop routing to someone, check whether their account was deactivated before touching the rule.',
          'Meta Ads (Facebook / Instagram lead forms) and Google Ads leads have their own sources, so each can be routed to a different team.',
        ],
        keywords: ['auto-assign', 'routing', 'lead source', 'fallback'],
      },
    ],
  },
  {
    id: 'itineraries-trip-planning',
    label: 'Itineraries & Trip Planning',
    icon: FileText,
    blurb: 'Build itineraries, reuse templates, brand your PDFs, and track bookings through to payment.',
    articles: [
      {
        id: 'itineraries',
        title: 'Itineraries',
        icon: FileText,
        route: '/itineraries',
        summary:
          'Build a client-facing itinerary — day-by-day hotels, transport, activities, flights and pricing — that becomes a shareable PDF and, once saved, a Trip.',
        keyPoints: [
          '"Single Package" is one hotel/vehicle/price per day, ready to send. "Multiple Options" builds three parallel packages (Basic/Standard/Premium), each with its own hotels, vehicles and pricing, for the client to compare.',
          'A trip\'s destination must be picked from the master destination list (e.g. "Kashmir") rather than typed freely, so the day planner can link to real hotels and activities.',
          'You enter a start date and a number of nights — the end date and total day count are derived automatically.',
          'Each day is either "activity" (a planned day with hotel/vehicle/activities) or "leisure" (a rest day; it can still carry a hotel, but never a vehicle transfer).',
          'Pricing builds up in order: hotel cost (room price + meal plan + extra bed + child charges × room count) + vehicle cost + activity costs + additional charges, then margin %, then GST %, then discount %, then round-off. A "Grand Total (Editable)" field can override the computed total — once you type into it, it always wins over the live calculation.',
          'The wizard autosaves a draft per lead/template combination, so one client\'s half-finished itinerary never bleeds into another\'s; returning to it offers "Picked up where you left off" or "Start fresh".',
        ],
        workflows: [
          {
            title: 'Create an itinerary from scratch',
            steps: [
              'Itineraries → "Create" (or start from a Lead\'s page) and pick the client/lead.',
              'Step 1: client name, optional trip name, start date + nights, master destination, trip type, adults/children (with each child\'s age), currency.',
              'Step 2: choose Single Package or Multiple Options.',
              'Steps 3–4: choose hotel(s), then transport, for every day (or per package, in multi mode).',
              'Steps 5–7: set each day\'s destination/activities, then review hotels, then review transport.',
              'Step 8: add trip-level flights (manual entry or flight-number lookup).',
              'Step 9: set Included/Excluded lists and Terms & Conditions.',
              'Step 10: review/adjust pricing (margin, GST, discount, round-off, additional charges) and Save.',
            ],
          },
          {
            title: 'Build from a template instead',
            steps: [
              'Open Templates and press "Use Template" on a card, or accept a template suggested on Step 3 of a new itinerary.',
              'Pick the client if you haven\'t already.',
              'The template\'s days are copied in and reshaped to the new trip length: extra days are trimmed from the end, missing days are appended as leisure days, and everything is redated from the new start date — all of it stays editable afterward.',
            ],
          },
          {
            title: 'Generate and share the client-facing PDF',
            steps: [
              'Open the itinerary\'s detail page and press "Generate PDF".',
              'Use "Share" to send it via WhatsApp (as a document or formatted text), by email, or to copy a link — the Share dialog controls what gets included in the summary.',
            ],
          },
          {
            title: 'Save an itinerary as a reusable template',
            steps: [
              'From the itinerary\'s detail page, press "Save as Template" and give it a name.',
              'Every day, activity and detail is preserved for reuse from the Templates page.',
            ],
          },
        ],
        tips: [
          'Vehicle cost is skipped on leisure days (no transfer), but a hotel on a leisure day is still priced if one is selected.',
          'Room prices are per room, not per person — the total scales with room/extra-bed/child counts, not simply with headcount.',
          '"Edit PDF" only customizes the branding wrapper (cover/footer) — itinerary content, pricing and terms are edited on the itinerary itself.',
        ],
        keywords: ['quote', 'wizard', 'multi-option', 'pricing', 'gst', 'margin', 'pdf', 'flights'],
      },
      {
        id: 'itinerary-templates',
        title: 'Itinerary Templates',
        icon: Layers,
        route: '/itineraries/templates',
        summary: 'A library of reusable itinerary blueprints to speed up building similar trips.',
        keyPoints: [
          'A "Global" badge marks templates visible/usable across the branch, as opposed to personal ones.',
          'Each card shows destination, day count, traveler count, trip type, and when it was last updated.',
        ],
        workflows: [
          {
            title: 'Use or inspect a template',
            steps: [
              'Press "Use Template" on a card to start a new itinerary pre-filled from it.',
              'Press "View Details" to open it like a normal itinerary.',
            ],
          },
          {
            title: 'Bulk-create for many clients at once',
            steps: [
              'On a template card, press the people icon → "Bulk Create for Clients".',
              'Tick the leads to generate for, optionally add a title prefix, and create — one itinerary is created per selected client.',
            ],
          },
        ],
        tips: [
          'Only Admin/Manager see the delete action on a template; everyone with itinerary access can use, view, or bulk-create from one.',
        ],
        keywords: ['blueprint', 'reuse', 'bulk create'],
      },
      {
        id: 'pdf-settings',
        title: 'Edit PDF (PDF Settings)',
        icon: ImageIcon,
        route: '/itineraries/pdf-settings',
        summary: 'Configure the branding, cover page and footer that wrap every generated itinerary PDF.',
        keyPoints: [
          'Cover footer fields: company name, tagline, CIN No., GST No., customer-care phone — shown on the PDF\'s cover page, with pickable banner and details-bar colors.',
          'Footer fields: a repeatable free-form list of contact lines (phone/email/website/etc.) shown in the PDF\'s running footer, with pickable bar and text colors.',
          'The cover image is set only here — it is shared by every itinerary and cannot be changed from an itinerary.',
          'An optional custom Thank You page (the last page): a large image, one text box, and Facebook / Instagram / Website buttons.',
        ],
        workflows: [
          {
            title: 'Set up your PDF branding',
            steps: [
              'Fill in company name, tagline, CIN, GST, and customer-care phone for the cover.',
              'Add, edit or remove footer contact lines as needed.',
              'Pick colors for the cover footer and the other pages\' footer (or reset to the defaults).',
              'Upload a cover image.',
              'Optionally turn on the custom Thank You page and set its image, text and links.',
              'Save — this applies to every itinerary PDF generated from then on.',
            ],
          },
        ],
        tips: [
          'This page only changes the wrapper around a PDF (cover/footer/last page) — it does not touch any single itinerary\'s content, pricing or terms.',
          'Access is its own "Edit PDF" permission, granted or revoked per user on the Users page — itinerary access alone does not include it.',
        ],
        keywords: ['branding', 'cover page', 'footer', 'footer color', 'thank you page', 'logo', 'gst', 'cin'],
      },
      {
        id: 'trips',
        title: 'Trips',
        icon: Plane,
        route: '/trips',
        summary:
          'Track a booked trip end-to-end after its itinerary is created — payments, balances, supplier payables, and trip status.',
        keyPoints: [
          'Trip status: Upcoming, Ongoing, Completed, or No Date (no travel dates set yet).',
          'Payment status: Fully Paid, Partially Paid, Pending, or No Cost (no total set yet).',
          'A Trip ID (e.g. TRIP-XSEX6N) is searchable and deep-linkable from dashboard widgets.',
          'Balance = total cost − total paid.',
          'The Finance dialog tracks two separate money flows per trip: instalments the client owes (a payment schedule, can be auto-generated) and supplier payables the agency owes (Hotel/Transport/Activity/Flight/Guide/Other), each with due dates and a status.',
          'Every itinerary you build becomes a Trip — there is no separate "create a trip" step.',
        ],
        workflows: [
          {
            title: 'Record a client payment',
            steps: [
              'On a trip\'s card/row, press "Record Payment".',
              'Enter an amount (or use "Pay full [balance]"), pick a payment mode (Cash/Bank Transfer/Card/UPI/Cheque/Other), set the date, and optionally add a reference number and notes.',
              'Save — the balance updates immediately, and a "Payment Complete" state appears once fully paid.',
            ],
          },
          {
            title: 'Manage instalments and supplier payables',
            steps: [
              'Open the overflow menu (or wallet icon) → "Instalments & payables".',
              'Generate a payment schedule automatically, or add instalments manually.',
              'Add supplier payables by type with a due date and status — overdue ones are flagged.',
            ],
          },
          {
            title: 'Find and review trips',
            steps: [
              'Search by trip ID, client, phone or destination; filter by payment status and a start-date range.',
              'Switch between Grid and Table views; use the status tabs (All/Upcoming/Ongoing/Completed) to quick-filter.',
              'From a trip\'s overflow menu, jump to its itinerary, its lead, or generate/download its PDF.',
            ],
          },
        ],
        tips: [
          'Recording a payment is blocked if no total cost has been set on the trip yet.',
          'Payment history (overflow menu) shows a running paid-progress bar and lets you delete an individual payment if one was entered in error.',
          'Table view can be sorted by clicking the destination, total cost, or start date column headers.',
        ],
        keywords: ['booking', 'payment', 'balance', 'instalment', 'payable', 'supplier'],
      },
    ],
  },
  {
    id: 'travel-inventory',
    label: 'Travel Inventory',
    icon: MapPin,
    blurb: 'The shared hotel, vehicle and destination data that itineraries are built from.',
    articles: [
      {
        id: 'hotels',
        title: 'Hotels',
        icon: Building,
        route: '/hotels',
        summary: 'A shared hotel database used to fill itinerary days, instead of typing hotel details by hand each time.',
        keyPoints: [
          'Category: Budget, Standard, Premium, Luxury. Star rating: 3, 4, or 5 — both filterable.',
          'A hotel can be filed under a master destination or under a place inside one ("hotel in Kashmir" and "hotel in Gulmarg" are both valid); its card shows the full breadcrumb when linked.',
          'Only Admin can add, edit, or delete hotels — everyone with the Hotels permission can browse and select them while building an itinerary.',
        ],
        workflows: [
          {
            title: 'Add or import hotels',
            steps: [
              'Press "Add Hotel" and fill in name, category, stars, destination, room types, meal plans, pricing and images.',
              'Or press "Bulk Import" and upload a file with a "destination" column — you can write "Kashmir > Gulmarg" or just "Kashmir"; missing destinations are created automatically.',
            ],
          },
          {
            title: 'Find hotels for a destination',
            steps: [
              'Use the Destination filter (this also includes hotels filed under anything inside that destination), plus the category/star filters or the search box.',
            ],
          },
        ],
        tips: [
          'Filtering by a master destination returns hotels filed under it AND under every place inside it — not just an exact match.',
          'Manager/Staff can view and select hotels when building itineraries but cannot manage the hotel database itself.',
        ],
        keywords: ['accommodation', 'rooms', 'meal plan', 'star rating'],
      },
      {
        id: 'vehicles',
        title: 'Vehicles',
        icon: Car,
        route: '/vehicles',
        summary: 'A shared vehicle/transport database (cars, drivers, rates) used to fill an itinerary\'s transport days.',
        keyPoints: [
          'Category: Economy, Standard, Premium, Luxury. Type: Sedan, SUV, MUV, Mini Bus, Bus, Tempo Traveller, Car, Van, Jeep, Limousine, Other.',
          'Rate can be per day or per km; seating capacity, AC, registration number, driver name/phone and base location are tracked.',
          'Only Admin can add, edit or delete vehicles — others can browse and select them in the itinerary wizard.',
        ],
        workflows: [
          {
            title: 'Add and find vehicles',
            steps: [
              'Press "Add Vehicle" and fill in name, type, category, seating, AC, registration, rate and driver info.',
              'Search by name/registration, or filter by category/type.',
            ],
          },
        ],
        tips: [
          'A vehicle\'s "driver included" flag and driver details flow straight into itinerary transport steps and PDFs — keep them current for vehicles still in active use.',
        ],
        keywords: ['transport', 'driver', 'car', 'rate per day', 'rate per km'],
      },
      {
        id: 'destinations',
        title: 'Destinations',
        icon: MapPin,
        route: '/destinations',
        summary:
          'The two-level place hierarchy — master destinations and the places inside them — that hotels, vehicles and itinerary days are all filed under.',
        keyPoints: [
          'A master (e.g. "Kashmir") has no parent and only carries name, country and place type — it is a grouping, not a place with its own detail.',
          'A destination inside a master (e.g. "Gulmarg") carries the full detail — address, descriptions, highlights, amenities, best time to visit, language, images, alternate names — and inherits its master\'s country.',
          'You cannot nest a third level: a destination cannot be placed inside another destination, only inside a master.',
          'Place type: Mountain, Beach, City, Desert, Forest, Historical, Adventure, Religious, Other.',
          'Only Admin/Manager can add, edit or delete destinations — everyone can browse them, e.g. when picking a trip\'s destination or filtering hotels.',
        ],
        workflows: [
          {
            title: 'Create a master destination',
            steps: [
              'Destinations page → "Add Master Destination" → name, country, place type → Save.',
            ],
          },
          {
            title: 'Add a place inside a master',
            steps: [
              'Open the master (click its card) → "Add Destination".',
              'Fill in the full detail: address, highlights, amenities, best time to visit, language, images, etc.',
              'It is automatically parented to that master and inherits its country.',
            ],
          },
          {
            title: 'Edit, browse or delete',
            steps: [
              'Use "Edit Master" on a master\'s own page to change master-level fields only; edit a card inside it to change that place\'s full detail.',
              'Search and a place-type filter are available inside a master\'s page for browsing what\'s in it.',
              'Deleting is blocked while a master or destination still holds places or hotels inside it.',
            ],
          },
        ],
        tips: [
          'Searching the Destinations list matches a master\'s name or country, or any place inside it — searching "Gulmarg" surfaces the "Kashmir" master.',
          'Following a link to a place that turns out to be a child destination redirects you to its master\'s page automatically.',
          'Promoting a place to a master (removing its parent) drops all of its place-level detail, including uploaded images — there is no way back except re-entering that detail.',
          'When picking a trip\'s destination in the itinerary wizard, only masters are selectable — the day-by-day planner is where you pick the specific place inside it.',
        ],
        keywords: ['master destination', 'place', 'region', 'hierarchy'],
      },
    ],
  },
  {
    id: 'messaging-marketing',
    label: 'Messaging & Marketing',
    icon: MessageCircle,
    blurb: 'WhatsApp conversations, canned message templates, and connecting ad platforms.',
    articles: [
      {
        id: 'whatsapp',
        title: 'WhatsApp',
        icon: MessageCircle,
        route: '/whatsapp',
        summary:
          'A WhatsApp-Web-style inbox for your own personal WhatsApp, linked by scanning a QR code, so replies flow straight into the CRM.',
        keyPoints: [
          'The status indicator at the top of the conversation list shows Connected (green) or Not Connected (grey); click it to open the "My WhatsApp" connection dialog.',
          'A conversation can be linked to an existing CRM lead, or used to create a brand-new one.',
          'A branch filter scopes the inbox to "All branches" or one branch (Admin/Manager only).',
          'Outbound messages show ticks: single (sent), double grey (delivered), double blue (read).',
          'Attachments: Photo & Video, or Document (.pdf, .doc/.docx, .xls/.xlsx, .ppt/.pptx, .txt) — drag-and-drop onto the chat also works.',
        ],
        workflows: [
          {
            title: 'Connect your WhatsApp',
            steps: [
              'Click the status indicator (or the "Connect your WhatsApp" banner) → "Generate QR Code".',
              'On your phone: WhatsApp → Settings → Linked Devices → Link a Device → scan the code.',
              'The dialog auto-detects the connection within a couple of seconds; the code itself expires after 60 seconds ("Get New QR" if it does).',
            ],
          },
          {
            title: 'Reply, or start a new chat',
            steps: [
              'Select a conversation → type your message → Enter to send (Shift+Enter for a new line). The thread refreshes automatically every 5 seconds and right after you send.',
              'To message someone new: press the new-chat icon → enter a phone number with country code → Next → type the first message → Send.',
            ],
          },
          {
            title: 'Send an attachment',
            steps: [
              'Click the paperclip → choose Photo & Video or Document → pick a file → optionally add a caption → Send.',
            ],
          },
          {
            title: 'Link a conversation to a lead',
            steps: [
              'Open the chat → "Link to Existing Lead" → search by name/phone → select → Link.',
              'Or press "Create Lead from Contact" to create a brand-new lead pre-filled from the chat.',
            ],
          },
        ],
        tips: [
          'This links your own personal WhatsApp number — it is not a shared business line, so each staff member connects independently.',
          'Sending is blocked whenever your WhatsApp shows Not Connected — reconnect via the QR flow first.',
          'Disconnecting only logs out the linked device — past conversations and messages are kept.',
          'Search in the conversation list matches contact name, phone number, or a linked lead\'s name.',
        ],
        keywords: ['qr code', 'chat', 'inbox', 'link device', 'attachment'],
      },
      {
        id: 'all-whatsapp',
        title: 'All WhatsApp (Admin Inbox)',
        icon: Inbox,
        route: '/admin/all-whatsapp',
        summary:
          'Admin-only cross-staff view of every connected WhatsApp account, to audit or open any staff member\'s conversations without needing their device.',
        keyPoints: [
          'The first screen lists every staff member with a connected WhatsApp: avatar, name, email, branch, unread count, conversation count, last activity.',
          'Clicking a staff member opens their conversation list, same layout as the personal WhatsApp inbox.',
          'The selected staff member, conversation, branch filter and search are all reflected in the URL, so a link reproduces the exact view for another admin.',
        ],
        workflows: [
          {
            title: 'Browse and review conversations',
            steps: [
              'Optionally filter by branch or search by staff name/email/branch/last message.',
              'Click a staff row to see their conversations, then click a conversation to read it.',
              'Use the back arrow to return to that staff member\'s conversation list, and again to return to the staff list.',
            ],
          },
        ],
        tips: [
          'If nobody has connected their WhatsApp yet, the staff list is simply empty — that is not an error, it means no one has scanned a QR code from their own WhatsApp page.',
          'This is a monitoring/oversight view — to actually send a message, use the relevant staff member\'s own WhatsApp page (or your own, if you also use it directly).',
          'Non-admins are redirected straight to their personal WhatsApp page even if they try to open this URL directly.',
        ],
        keywords: ['admin inbox', 'monitor', 'oversight', 'audit conversations'],
      },
      {
        id: 'message-templates',
        title: 'Message Templates',
        icon: MessageSquare,
        route: '/settings/whatsapp-templates',
        summary: 'Reusable canned WhatsApp messages with placeholder variables, for fast, consistent replies.',
        keyPoints: [
          'Category: Greeting, Follow-up, Quote, Confirmation, Itinerary, or General.',
          'Content supports {{variable}} placeholders, e.g. {{name}}, {{agent_name}}, {{destination}}, {{date}} — any {{word}} you type is picked up as a variable.',
          'An Active/Inactive toggle dims a template when off; a usage count tracks how often each template has been used.',
        ],
        workflows: [
          {
            title: 'Create, edit or manage a template (Admin/Manager)',
            steps: [
              'Press "Create" → enter a Name, choose a Category, write Content using {{variable}} placeholders → Create Template.',
              'To edit: pencil icon on a card → adjust Name/Category/Content → Save Changes.',
              'To enable/disable: flip the switch on the card — this applies immediately.',
              'To delete: trash icon → confirm (this is permanent).',
            ],
          },
          {
            title: 'Use a template (everyone)',
            steps: [
              'Click a template\'s content box to preview it with variables highlighted.',
              'Press the copy icon to copy the raw content (with its {{variable}} placeholders) for pasting into a chat.',
              'Use the category tabs above the grid to filter by category.',
            ],
          },
        ],
        tips: [
          'Staff (non-admin/manager) can only view, preview and copy templates — create/edit/delete/toggle controls are hidden for them.',
          'Placeholders are plain text substitution with no validation, so a typo inside {{ }} just becomes an unfilled variable.',
        ],
        keywords: ['canned message', 'placeholder', 'variable', 'greeting'],
      },
      {
        id: 'ad-campaigns',
        title: 'Connected Apps (Ad Campaigns)',
        icon: Megaphone,
        route: '/ad-campaigns',
        summary:
          'Connects the CRM to Google Ads and Meta (Facebook) Ads via OAuth so lead-form submissions can auto-import as CRM leads.',
        keyPoints: [
          'Admin-only page — anyone else is redirected to the Dashboard.',
          'Each platform card shows Connected / not-connected and the number of linked campaigns.',
          'Every connected campaign gets both a platform-level webhook URL and a per-campaign webhook URL (with campaignId and branchId in the query string) for external lead forms to POST to.',
        ],
        workflows: [
          {
            title: 'Connect an ad platform',
            steps: [
              'Press "Connect" on the Google Ads or Meta Ads card.',
              'Approve access in the popup that opens.',
              'On success the popup confirms and closes itself, and the card flips to "Connected".',
            ],
          },
          {
            title: 'Wire up a lead form to send leads here',
            steps: [
              'For Google Ads: Google Ads → Assets → Lead Form Extensions → your form → "Post-submit URL" → paste the copied webhook URL, appending ?campaignId=YOUR_CAMPAIGN_ID&branchId=YOUR_BRANCH_ID.',
              'For Meta Lead Forms: create a Zap (or similar) with trigger "Meta Lead Ads → New Lead" and action "Webhook → Custom Request" (POST) → paste the Meta webhook URL with the same query params → map name/phone/email into the webhook body.',
              'Use the copy icon next to any webhook URL field to grab it exactly.',
            ],
          },
        ],
        tips: [
          'Webhook URLs point at the backend API, not the frontend app — pasting the site address you browse into a lead form will not work.',
          'Without campaignId and branchId on the webhook URL, an imported lead cannot be attributed to the right campaign or branch — always use the per-campaign copy button rather than a generic platform URL when one is available.',
          'If the OAuth popup says access was declined, nothing was partially connected — just retry "Connect".',
        ],
        keywords: ['google ads', 'meta ads', 'facebook', 'webhook', 'lead form', 'oauth'],
      },
    ],
  },
  {
    id: 'insights-reporting',
    label: 'Insights & Reporting',
    icon: BarChart3,
    blurb: 'Your home screen, company/branch funnel numbers, and team performance.',
    articles: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        icon: LayoutDashboard,
        route: '/dashboard',
        summary: 'Your personalized home screen, made up of configurable widgets for daily lead, follow-up, payment and trip activity.',
        keyPoints: [
          '13 widget types: Trip Sales Stats, Pending Follow-ups, Payments Due, Trip Starting/Endings, Live Trips with Due Payments, Travel Stats, Ad Campaigns, Lead Pipeline, Today\'s Follow-ups, Quick Actions, Top Destinations, Recent Leads, Lead Sources.',
          'Each widget is gated by its own permission (e.g. "dashboard.payments_due"), so an admin can grant the dashboard without exposing revenue or ad spend to everyone.',
          'Your widget layout — which are on, and in what order — is saved per-browser, not synced across devices.',
        ],
        workflows: [
          {
            title: 'Customize your dashboard',
            steps: [
              'Press "Customize" (gear icon).',
              'Toggle any widget on/off with its switch, and use the up/down arrows to reorder.',
              'Press "Done" to save, or "Reset" to restore the default layout.',
            ],
          },
        ],
        tips: [
          'If every visible widget is turned off, an empty-state card appears with a shortcut back into Customize.',
          'A newly-added widget type is auto-appended to everyone\'s saved layout so it is never permanently hidden by an old preference.',
          'Revoking a widget\'s permission removes it from the grid immediately without needing to log out; it stays remembered in your layout in case access is restored later.',
        ],
        keywords: ['home screen', 'widgets', 'customize'],
      },
      {
        id: 'analytics',
        title: 'Analytics',
        icon: BarChart3,
        route: '/analytics',
        summary: 'Company-wide (or branch-wide) lead funnel and source breakdown for a chosen date range.',
        keyPoints: [
          'Two headline numbers: Total Leads and Booked Trips (Won + Quote Sent statuses).',
          'A Lead Pipeline bar chart (Fresh, Contacted, Hot, Warm, Booked) and a Lead Sources pie chart (Website, WhatsApp, Walk-in, Social Media, Bulk Import).',
        ],
        workflows: [
          {
            title: 'View or filter the numbers',
            steps: [
              'Open Analytics — with no date filter it shows all-time data.',
              'Pick From/To dates and press "Filter" to re-run the numbers for that range.',
            ],
          },
        ],
        tips: [
          'Branch scoping still applies here: only Admin sees company-wide numbers, Manager/Staff automatically see their own branch (or their own leads) only.',
        ],
        keywords: ['funnel', 'lead sources', 'pipeline chart', 'reporting'],
      },
      {
        id: 'performance',
        title: 'Performance',
        icon: TrendingUp,
        route: '/performance',
        summary: 'A team leaderboard and per-staff drill-down comparing lead volume, wins, and follow-up completion.',
        keyPoints: [
          'Filters: Branch (Admin only), Staff member, and a custom date range.',
          'Per-user stats: Total Leads, Fresh, Hot, Won, Conversion % (Won / Total), Pending/Completed/Overdue Follow-ups, and Follow-up Completion %.',
          'Three tabs: Overview (bar charts), Rankings (leaderboard sorted by Won then Total Leads, medals for the top 3), and Details (full stat table).',
        ],
        workflows: [
          {
            title: 'Check the team or one person',
            steps: [
              'Open the Rankings tab for the leaderboard.',
              'Pick a name from the Staff dropdown to see a highlighted stat card for just that person.',
              '(Admin) Pick a Branch first to narrow to one branch, then optionally a staff member within it.',
              'Use the Date Range button to narrow to a period, or Clear to reset it.',
            ],
          },
        ],
        tips: [
          'Non-admins never see the Branch selector — they only ever see their own branch\'s staff.',
          'The leaderboard only ranks Staff and Manager accounts — Admin accounts are not ranked.',
        ],
        keywords: ['leaderboard', 'ranking', 'conversion rate', 'team'],
      },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: ShieldCheck,
    blurb: 'Branches, staff accounts, feature permissions, and the audit trail.',
    articles: [
      {
        id: 'branches',
        title: 'Branches',
        icon: Building2,
        route: '/branches',
        summary: 'Manage the branches that every user and lead belongs to — the foundation of the CRM\'s multi-branch data isolation.',
        keyPoints: [
          'Branch fields: Name, Email, Country, Timezone (required), plus optional WhatsApp Number, Address, and Currency (defaults to INR).',
        ],
        workflows: [
          {
            title: 'Create, edit or remove a branch',
            steps: [
              'Press "Add Branch" and fill in Name, Email, Country and Timezone (required), plus any optional fields → Create Branch.',
              'To edit: pencil icon on a branch → adjust fields → Update Branch.',
              'To delete: trash icon → confirm. Treat this as high-risk — check the branch has no users or leads left in it first.',
            ],
          },
        ],
        tips: [
          'Every lead, user and much of the rest of the CRM is scoped to a branch — a wrong timezone or currency affects reporting and WhatsApp routing for everyone in it.',
        ],
        keywords: ['multi-branch', 'timezone', 'currency'],
      },
      {
        id: 'users',
        title: 'Users & Staff',
        icon: UserCog,
        route: '/users',
        summary: 'Create staff and manager accounts, and control exactly which features (and actions within them) each person can use.',
        keyPoints: [
          'Feature permissions are separate from role: 21 modules (e.g. leads, dashboard, itineraries), each with its own sub-permissions (e.g. leads.delete, dashboard.payments_due) — 76 sub-permissions in total.',
          'A sub-permission does nothing without its parent module also being granted.',
          'The "Access" column on the Users table shows a short summary, with a hover tooltip listing every granted module.',
        ],
        workflows: [
          {
            title: 'Create a staff account',
            steps: [
              'Users → "Add User" → fill in Name, Email, Phone, Password, Role, Branch.',
              'For non-Admin roles, the permission picker appears — tick the modules and sub-permissions to grant.',
              'Save.',
            ],
          },
          {
            title: 'Change access, or deactivate someone',
            steps: [
              'Pencil icon on their row → adjust role, branch, or permissions → Save.',
              'To cut someone off entirely: press "Deactivate" and confirm — a deactivated user cannot log in. "Reactivate" restores them.',
            ],
          },
        ],
        tips: [
          'You cannot deactivate or edit your own account from this list.',
          'Permission checks are cached for about 30 seconds server-side, so a just-revoked feature can take up to that long to actually disappear from that user\'s next request even though the UI updates immediately for you.',
          'A Manager granting permissions can only grant features they themselves hold — they can never create a more-privileged account than their own.',
          'For the full breakdown of every module and what each role gets by default, see the "How permissions work", "Compare roles" and "All features" articles below.',
        ],
        keywords: ['staff account', 'permission picker', 'deactivate', 'grant access'],
      },
      {
        id: 'permissions-how-it-works',
        title: 'How permissions work',
        icon: KeyRound,
        summary: 'The rules behind roles, feature permissions, and branch scoping — read this first if access seems confusing.',
        tips: [],
        keyPoints: [],
        workflows: [],
        keywords: ['permission model', 'module', 'sub-permission', 'branch scope'],
        render: () => (
          <div className="space-y-4">
            <YourAccessCard />
            <HowItWorks />
          </div>
        ),
      },
      {
        id: 'permissions-compare-roles',
        title: 'Compare roles',
        icon: Users,
        summary: 'What Admin, Manager and Staff are each given by default, side by side with your own current access.',
        tips: [],
        keyPoints: [],
        workflows: [],
        keywords: ['admin vs manager vs staff', 'role defaults'],
        render: () => (
          <div className="space-y-4">
            <YourAccessCard />
            <RoleMatrix />
          </div>
        ),
      },
      {
        id: 'permissions-all-features',
        title: 'All features',
        icon: ListChecks,
        summary: 'Every grantable feature in the CRM, its plain-English description, and which roles get it by default.',
        tips: [],
        keyPoints: [],
        workflows: [],
        keywords: ['feature catalog', 'permission list'],
        render: () => (
          <div className="space-y-4">
            <YourAccessCard />
            <FeatureReference />
          </div>
        ),
      },
      {
        id: 'permissions-troubleshooting',
        title: 'Something looks wrong',
        icon: AlertTriangle,
        summary: 'Fixes for the most common "I can\'t see/do X" problems, and the exact steps to grant access.',
        tips: [],
        keyPoints: [],
        workflows: [],
        keywords: ['missing page', 'missing button', 'no permission', 'access denied'],
        render: () => (
          <div className="space-y-4">
            <YourAccessCard />
            <Troubleshooting />
          </div>
        ),
      },
      {
        id: 'audit-logs',
        title: 'Audit Logs',
        icon: Shield,
        route: '/audit',
        summary: 'A chronological record of who did what across the CRM, for accountability and troubleshooting.',
        keyPoints: [
          'Logged actions: Create, Update, Delete, Login, Logout, Export, Import, Merge.',
          'Logged entities: Lead, Follow-up, User, Branch, Itinerary, WhatsApp.',
          'Each entry shows a timestamp, the acting user, the action, the entity, a description, and the IP address it came from.',
        ],
        workflows: [
          {
            title: 'Browse and filter activity',
            steps: [
              'Open Audit Logs — most recent first, 50 per page.',
              'Press "Show Filters" to narrow by Action, Entity, and/or a start/end date.',
              'Use Prev/Next to page through history, and "Clear Filters" to reset.',
            ],
          },
        ],
        tips: [
          'There is no free-text search — only the structured Action/Entity/date filters.',
          'Visibility is branch-scoped like everything else: non-admins only see their own branch\'s activity.',
          'Every permission change made on the Users page is written here with the full before-and-after, which is the fastest way to answer "who changed my access, and to what."',
        ],
        keywords: ['activity log', 'who changed', 'history', 'accountability'],
      },
    ],
  },
  {
    id: 'glossary-reference',
    label: 'Glossary & Reference',
    icon: HelpCircle,
    blurb: 'Every status, term and cross-module shortcut, defined in one place.',
    articles: [
      {
        id: 'lead-status-glossary',
        title: 'Lead statuses & sources',
        icon: Tag,
        summary: 'What every lead status and source actually means, so a status change on a card isn\'t a guessing game.',
        keyPoints: [
          'Fresh — just created, not yet worked by anyone.',
          'Follow Up — a follow-up has been scheduled or is in progress for this lead.',
          'Quote Sent — an itinerary has been generated and sent to the client.',
          'Hot Lead / Warm — the owner has manually flagged high vs. medium interest; these do not change automatically.',
          'Not Answering / Sent Voicemail / Call Declined — contact was attempted but did not connect.',
          'Connected / Call Back Scheduled — mid-conversation states between first contact and a quote.',
          'Won — the lead is booked; this is the status that makes it appear under Booked Clients and count as a "Booked Trip" in Analytics.',
          'Not Interested / Junk / Closed — dead ends. Junk is typically used for bad data (wrong number, spam, test entries) rather than a real prospect who said no.',
          'Sources — Website, WhatsApp, Walk-in, Social Media, Meta Ads, Google Ads, Bulk Import: where the lead entered the pipeline, and what Assignment Rules match against to route it.',
        ],
        workflows: [],
        tips: [
          'Only six statuses have a Kanban column (Fresh, Follow Up, Quote Sent, Hot Lead, Warm, Won-as-"Booked"). Every other status is set from the lead\'s own detail page or the Table view — it will not show as a draggable card.',
          'Moving a lead to Won is a one-way trigger for a lot of the rest of the CRM: Booked Clients and the "Booked Trips" figure on Analytics are both derived from it.',
        ],
        keywords: ['status', 'source', 'fresh', 'hot', 'warm', 'won', 'junk', 'not interested'],
      },
      {
        id: 'trip-payment-glossary',
        title: 'Trip & payment statuses',
        icon: Wallet,
        summary: 'The three separate status vocabularies used on Trips: the trip itself, the client\'s payments, and supplier payables.',
        keyPoints: [
          'Trip status — Upcoming (dates set, not started), Ongoing (travel dates span today), Completed (end date has passed), No Date (no travel dates set yet).',
          'Payment status (what the client owes) — Fully Paid, Partially Paid, Pending (nothing paid yet), No Cost (no total set on the trip yet).',
          'Payable status (what the agency owes a supplier) — Pending, Partial, Paid, Waived, Cancelled; an unpaid payable past its due date is flagged as overdue.',
          'Balance is always total cost minus total paid — it is not stored directly, so correcting the total cost or a payment amount updates it immediately.',
        ],
        workflows: [],
        tips: [
          'A trip only exists because an itinerary was created for it — there is no separate "new trip" form, so trip status and payment status only start meaning something once that itinerary is saved.',
          'Trip status is about dates; payment status is about money — a trip can be "Ongoing" and "Pending" at the same time if the client hasn\'t paid yet.',
        ],
        keywords: ['balance', 'overdue', 'fully paid', 'partially paid', 'upcoming', 'ongoing', 'completed'],
      },
      {
        id: 'permission-terms-glossary',
        title: 'Permission & role terms',
        icon: KeyRound,
        summary: 'Quick definitions for the vocabulary used across the permission system — see "Roles & Permissions" above for the full detail.',
        keyPoints: [
          'Module — one whole area of the CRM (e.g. "Leads", "Itineraries"); granting it puts the page in the sidebar.',
          'Sub-permission — one action inside a module (e.g. "leads.delete"); it does nothing unless the parent module is also granted.',
          'Role defaults — the starting sub-permission set a role is given when its account is first created; changing role does not retroactively change an existing account\'s list.',
          'Branch scoping — a separate axis from permissions entirely: it decides whose records you see (your branch only, unless you are Admin), not which pages you can reach.',
          'ADMIN — every branch, every feature, bypasses all permission checks; there can only be one.',
          'MANAGER — full access within their own branch; still subject to feature permissions like anyone else.',
          'STAFF — the most restricted role; typically limited to leads/records assigned to them, with nothing destructive granted by default.',
        ],
        workflows: [],
        tips: [
          'For the mechanics of how these interact day-to-day, see "How permissions work", "Compare roles" and "All features" in the Roles & Permissions part of Administration.',
        ],
        keywords: ['module', 'sub-permission', 'role default', 'admin', 'manager', 'staff', 'branch scope'],
      },
      {
        id: 'shortcuts-glossary',
        title: 'Handy shortcuts across the CRM',
        icon: Keyboard,
        summary: 'Small interaction patterns that show up in more than one module, once you know to look for them.',
        keyPoints: [
          'Enter sends a message in WhatsApp; Shift+Enter adds a line break instead.',
          'Drag-and-drop works in two unrelated places: moving a lead card between Kanban columns on Leads, and dropping a file straight onto a WhatsApp chat to attach it.',
          'Clicking a column header (destination, total cost, start date) sorts the Trips table by that column.',
          'Many list pages support deep-linking through URL query parameters — e.g. Trips (?search=…), Follow-ups (?range=overdue|today|upcoming), and the All WhatsApp admin inbox (userId, contactId, branchId, search) — so a link can reproduce someone else\'s exact filtered view.',
          'Copy icons appear next to anything meant to be pasted elsewhere verbatim: a Message Template\'s content, a webhook URL on Connected Apps, or a template\'s raw data on Itinerary Templates.',
        ],
        workflows: [],
        tips: [
          'If a page\'s URL has query parameters in it, it is usually safe to bookmark or share — most list views restore filters from the URL on load rather than only from in-memory state.',
        ],
        keywords: ['tips', 'productivity', 'drag and drop', 'deep link', 'copy'],
      },
    ],
  },
];
