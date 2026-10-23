# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Multi-branch Travel Agency CRM backend built with Express.js, Prisma ORM, and PostgreSQL. Manages leads, follow-ups, itineraries, WhatsApp integration, and analytics across multiple branches with role-based access control.

## Common Commands

```bash
pnpm dev          # Start development server with nodemon
pnpm start            # Start production server
pnpm db:generate   # Generate Prisma client
pnpm db:push       # Push schema to database (dev)
pnpm db:migrate    # Run migrations
pnpm db:studio     # Open Prisma Studio
pnpm db:seed       # Seed database with sample data
pnpm db:backfill-permissions   # Migrate existing users' feature permissions
pnpm permissions:generate      # Regenerate the frontend permission catalog
pnpm check:permissions         # Verify catalogs and guard keys are consistent
```

## Architecture

### Multi-Branch Isolation

Every user belongs to a branch. Non-ADMIN users are restricted to their own branch's data:

- `branchGuard` middleware enforces branch access
- `applyBranchFilter` adds branchId to Prisma queries
- Routes check `req.user.branchId` unless user is ADMIN

### Authentication Flow

1. Login returns short-lived access token (1hour ) + refresh token (7d in httpOnly cookie)
2. `authenticate` middleware validates JWT and attaches user to `req.user`
3. `requireRole` middleware restricts endpoints by role
4. Refresh endpoint exchanges valid refresh token for new access token

### Role Hierarchy

- **ADMIN**: Full access to all branches
- **MANAGER**: Full access to own branch
- **STAFF**: Access only to leads assigned to them
- **RESERVATION_MANAGER**: Central reservations desk. Scoped exactly like STAFF —
  `authenticate` maps it through `scopeRoleOf` in `src/config/roles.js`, so
  `req.user.role` is only ever ADMIN / MANAGER / STAFF (the real role is in
  `req.user.accountRole`). Its agency-wide view comes from its default
  permissions `itineraries.view_all` (read every branch's itineraries) and
  `trips.view_all` (read every trip and payment, record payments, change status).
  Any new role must be added to `scopeRoleOf`, never left for scope checks to
  meet raw — most of them treat "not STAFF and not MANAGER" as admin.

`*.view_all` permissions are `optIn` in the catalog: ticking the module does not
tick them, and `withChildren` leaves them out of role defaults.
`itineraries.view_all` is never honoured for a STAFF account (`seesAllItineraries`
in `middleware/rbac.js`): staff only ever see the itineraries they created.

### Feature Permissions

Roles set branch scope; **feature permissions** set what a user can reach. Each
user carries a `permissions` string array that an admin ticks on the Staff page.

Two levels: a **module** (`leads`) decides whether they can open that part of
the CRM; its **sub-permissions** (`leads.delete`, `dashboard.payments_due`)
decide what they can do inside. Keys are always `parent.child`, and a child
means nothing without its parent — `sanitizePermissions` drops orphans on the
way in, so every read path is a plain membership test. 21 modules, 76
sub-permissions.

- Catalog: `src/config/permissions.js` — the **single source of truth**
- The frontend copy is generated: `pnpm permissions:generate` writes
  `frontend/lib/permissions.generated.ts`. Never edit that file by hand.
- Enforcement: `requirePermission(...)` in `middleware/rbac.js`
- Deny-by-default — an empty array grants nothing. ADMIN bypasses every check.
- Guards read the database (30s cache in `services/permission.service.js`), not
  the JWT, so a revoked feature stops working without waiting for a token refresh.

Run `pnpm check:permissions` after touching the catalog or any guard. After a
schema change run `pnpm db:backfill-permissions` so pre-existing users keep
their access. Full write-up: `docs/PERMISSIONS.md`.

### API Structure

All routes are under `/api/v1/`:

- `/auth` - login, logout, refresh
- `/branches` - branch management
- `/users` - user management, `/users/permissions/catalog` - feature catalog
- `/leads` - lead CRUD, bulk import, duplicate check
- `/followups` - follow-up scheduling
- `/itineraries` - itinerary CRUD, PDF generation
- `/whatsapp` - messaging and webhook processing
- `/analytics` - reporting
- `/destinations` - destination CRUD, `/destinations/tree` - masters with the ones inside them

### Key Patterns

**Lead Assignment**: Incoming leads (ads webhooks, website, WhatsApp) and leads an ADMIN adds or imports without picking an assignee are auto-assigned via `AssignmentRule` based on lead source, falling back to oldest active STAFF, then oldest MANAGER. A lead STAFF add or import is always assigned to them (any `assignedTo` they send is ignored); a MANAGER's is theirs unless they pick someone. Rules never run for either.

**Duplicate Detection**: Before creating a lead, call `checkDuplicate(branchId, phone, email)` from `utils/duplicateCheck.js`. Matches phone/email within the same branch.

**Soft Deletes**: Leads use `deletedAt` instead of hard delete. Filter with `where: { deletedAt: null }`.

**Cron Jobs** (UTC timezone):

- Every 5 minutes: Mark overdue follow-ups
- 8:00 AM daily: Generate follow-up digest
- Midnight daily: Clean up old media references

### Data Model (Prisma Schema)

Core entities: `Branch` -> `User` -> `Lead` -> `FollowUp`, `Itinerary`, `LeadActivity`
WhatsApp: `WhatsappMessage` linked to Branch and Lead
Itineraries: `ItineraryTemplate` (reusable) -> `Itinerary` (per-client)

**Destination tree**: `Destination` is self-referencing and two levels deep. A
master destination ("Kashmir") has `parentId === null`; the destinations inside it
("Gulmarg", "Sonmarg", "Pahalgam") point back at it. No extra column marks the
rung — having no parent is what makes something a master.

- The two rungs hold different fields. A master is a grouping, so it carries only
  `name`, `country` and `placeType`. Everything else — address, descriptions,
  highlights, amenities, best time, language, images, altNames — describes an
  actual place and belongs to the destinations inside a master, which inherit the
  country. Both columns are nullable so one table holds both rungs;
  `buildDestinationData` enforces the split on every write rather than trusting
  the client, and promoting a place to a master drops the detail it can no longer
  show (including its Cloudinary images).
- Nesting a third level is rejected by the API, not the schema: `validateParent`
  in `services/destinationTree.service.js` refuses a parent that already has one,
  and `updateDestination` refuses to move a destination that holds others.
- `Hotel.destinationId` files a hotel under either rung — "hotel in Kashmir" and
  "hotel in Gulmarg" are both valid. `Hotel.location` stays as the plain display
  label ("Gulmarg, Kashmir") so itinerary PDFs and search keep working; when a
  destination is set the label is re-derived on every write and never hand-edited.
  A rename or move re-syncs it for the destination and everything inside it.
- The UI drills down rather than showing one flat list: `/destinations` lists the
  master destinations and only creates masters; `/destinations/[id]` lists what is
  inside one and only creates destinations inside it. The form takes `lockParent`
  so neither page can create the wrong rung, and landing on a child id redirects
  to its master.
- Filtering hotels by a destination includes the ones inside it —
  `destinationScopeIds`.
- Deleting a destination is refused while destinations or hotels still sit inside.
- File legacy hotels into the tree with `pnpm db:backfill-hotel-destinations`
  (`--dry-run` to preview, `--master "Kashmir"` to put bare labels under one master).

## Environment Variables

```
DATABASE_URL          # PostgreSQL connection string
JWT_SECRET            # Access token signing secret
JWT_REFRESH_SECRET    # Refresh token signing secret
PORT                  # Server port (default 5000)
WHATSAPP_TOKEN        # Meta Graph API token
WHATSAPP_VERIFY_TOKEN # Webhook verification token
```

## Default Seed Data

After running `pnpm db:seed`:

- Branch: Main Office (UAE)
- Admin: admin@travelcrm.com / admin123
- Manager: manager@travelcrm.com / manager123
- Staff: staff@travelcrm.com / staff123
- Destinations: Kashmir and Delhi as masters (country India), with Srinagar,
  Gulmarg, Sonmarg, Pahalgam and Dal Lake inside Kashmir
