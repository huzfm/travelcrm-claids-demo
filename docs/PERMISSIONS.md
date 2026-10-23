# Feature Permissions

Written for whoever administers staff accounts, and for whoever adds a new
module to the CRM later.

An admin decides, per user, which parts of the CRM that person can use — and,
within each part, exactly what they can do. The choice is made when the account
is created, and can be changed at any time afterwards.

The staff screens are full pages, not modals — there is too much to choose from
to fit in a dialog:

| Page | Route | Needs |
|---|---|---|
| Staff list | `/users` | `users` |
| Add user | `/users/new` | `users.create` |
| Edit user | `/users/<id>/edit` | `users.edit` |

Both forms are the same component, `components/users/user-form.tsx`, so the
account fields and the permission picker cannot drift apart between them.

## The model

Two levels:

- A **module** (`leads`, `dashboard`, `trips`) decides whether the user can open
  that part of the CRM at all. Not holding it means no sidebar entry, a blocked
  route, and 403s from the API.
- Its **sub-permissions** (`leads.delete`, `dashboard.payments_due`,
  `trips.payables`) decide what they can do or see once inside.

Sub-permission keys are always `parent.child`, and **holding a child means
nothing without its parent**. `sanitizePermissions` drops orphans on the way in,
so every read path can stay a plain membership test. `ADMIN` bypasses every
check and always holds everything.

21 modules, 76 sub-permissions.

**Permissions are deny-by-default.** A user with an empty list can sign in and
edit their own profile; nothing else. Existing accounts must therefore be
backfilled — see [Deploy steps](#deploy-steps).

### What the levels look like in practice

| Module | Sub-permissions |
|---|---|
| `dashboard` | one per widget — `trip_sales`, `payments_due`, `pipeline`, `ad_stats`, `search`, … (14) |
| `leads` | `create`, `edit`, `delete`, `import`, `export`, `transfer`, `merge`, `tags`, `activities` |
| `followups` | `create`, `edit`, `delete` |
| `itineraries` | `create`, `edit`, `delete`, `share`, `pricing` |
| `itinerary_templates` | `create`, `edit`, `delete` |
| `trips` | `status`, `payments`, `schedules`, `payables` |
| `hotels` | `create`, `edit`, `delete`, `import` |
| `vehicles` / `destinations` | `create`, `edit`, `delete` |
| `whatsapp` | `send`, `archive`, `delete`, `connect`, `link_leads` |
| `whatsapp_templates` | `create`, `edit`, `delete` |
| `ad_campaigns` | `connect`, `create`, `edit`, `delete`, `sync` |
| `analytics` | `pipeline`, `sources`, `conversion`, `team`, `revenue` |
| `assignment_rules` | `create`, `edit`, `delete` |
| `branches` | `create`, `edit`, `stats` |
| `users` | `create`, `edit`, `delete` |
| `audit_logs` | `export` |
| `my_clients`, `booked_clients`, `pdf_settings`, `whatsapp_all`, `performance` | none — the module is the whole thing |

So an admin can, for example, let a staffer work leads but not delete or export
them, see the dashboard without the revenue widget, run trips without touching
supplier payables, or build itineraries without ever seeing cost and margin.

## Where the catalog lives

`backend/src/config/permissions.js` is the **single source of truth**.

The frontend needs the same catalog to draw the sidebar and the picker, so it is
**generated**, not hand-maintained:

```bash
cd backend && pnpm permissions:generate   # writes frontend/lib/permissions.generated.ts
```

That generated file is committed. `frontend/lib/permissions.ts` holds the
hand-written helpers (route map, `hasPermission`, …) and imports from it.
`GET /api/v1/users/permissions/catalog` serves the backend copy at runtime.

Never edit `permissions.generated.ts` — edit the backend catalog and re-run the
generator. `pnpm check:permissions` fails if the two have drifted.

## How it is enforced

Three layers, and only the last one actually protects anything:

1. **Sidebar** — renders only the modules the user holds.
2. **Route guard** — `ProtectedLayout` checks `canAccessRoute()` and shows an
   explanation instead of a page full of failed requests.
3. **API** — `requirePermission(...)` in `backend/src/middleware/rbac.js`. This
   is the real boundary. The first two are convenience.

`requirePermission` reads permissions **from the database**, not from the JWT.
Access tokens live 24 hours, so a token issued before an admin revoked something
would still carry the old list. The lookup is cached for 30 seconds per user
(`backend/src/services/permission.service.js`), and editing a user busts that
user's entry immediately, so a revocation takes effect on the next request.

The JWT and `/auth/me` still carry a `permissions` array. That copy is
**advisory** — the frontend uses it to decide what to draw, and nothing else.

### Shared endpoints

Some data backs more than one module, so a guard may accept several keys — the
user needs at least one of them:

- Lead **reads** accept `leads`, `my_clients`, `booked_clients`, `dashboard`,
  `performance`, `analytics`, `itineraries`, `whatsapp`; each lead **write** is
  gated by its own sub-permission (`leads.create`, `leads.delete`, …).
- `/analytics/pipeline` accepts the dashboard keys too, because the dashboard's
  pipeline widget reads it.
- Hotels, vehicles and destinations accept `itineraries` for reads, because the
  itinerary builder picks from them.
- `GET /branches` is open to any signed-in user — it is reference data (branch
  name, currency, letterhead) that most screens need.

### Two enforcement styles

Most sub-permissions gate a route. `itineraries.pricing` cannot, because cost
figures are fields on the itinerary record rather than a separate endpoint —
so `applyPricingVisibility` in `itinerary.controller.js` strips `totalCost`,
`quotes` and `options` from the response instead. Both role presets include it,
so this only bites a user an admin has deliberately restricted.

### Why WhatsApp is guarded per route

Three routers share the `/api/v1/whatsapp` mount: `whatsapp.routes.js`,
`whatsappTemplate.routes.js` (at `/templates`) and `user-whatsapp.routes.js` (at
`/my/*`). A `router.use()` guard on the first would reject the other two's
traffic before it ever reached them, so those files attach guards per route
instead. Keep it that way when adding endpoints there.

## Delegating staff administration

The `users` module can itself be granted. A non-admin holding `users.create` can
add staff, but the controller constrains them so delegation can never escalate
privileges:

- `STAFF` only — they cannot create managers.
- Their own branch only.
- They can only grant permissions **they hold themselves**; the picker greys out
  the rest, and `createUser` rejects a request that forges past the UI.
- They can never change permissions on an existing user. That check
  (`updateUser`) is `ADMIN`-only, so nobody can widen their own access by
  PATCHing their own record.

## Deploy steps

```bash
cd backend
pnpm db:generate                  # regenerate the client for User.permissions
pnpm db:push                      # adds users.permissions text[] default '{}'
pnpm db:backfill-permissions      # NOT optional
```

The backfill handles both migrations, and is idempotent:

- **Empty permissions** (accounts predating the system) get their role's
  defaults, matching the access they had before.
- **Module keys with no sub-permissions** (accounts granted permissions before
  sub-permissions existed) have each module expanded to include all of its
  sub-permissions — back then holding a module meant full use of it, so anything
  less would silently take abilities away.

The legacy test is per user, not per module: a set that mentions any
sub-permission was written by the current picker and is left untouched, so a
deliberately view-only module is never mistaken for a legacy row.

Useful flags: `--dry-run` reports without writing, `--force` resets everyone to
their role's defaults and discards custom sets.

## Checks

```bash
cd backend && pnpm check:permissions
```

Verifies that the generated frontend catalog is current, that sub-permissions
are namespaced under their module, that there are no duplicate keys, and that
every key named by a `requirePermission()` call, a `userHasPermission()` call,
the sidebar, the route map or the dashboard widget map actually exists — a typo
in a guard denies access silently, which is the failure mode worth a script.

It also warns about a key nothing enforces, since a toggle that does nothing is
worse than no toggle.

## Adding a new feature

1. Add the module (or a `children` entry) to `FEATURES` in
   `backend/src/config/permissions.js`, and add it to
   `ROLE_DEFAULT_PERMISSIONS` for the roles that should get it by default.
2. Run `cd backend && pnpm permissions:generate` and commit the generated file.
3. Guard the routes with `requirePermission('your_key')`.
4. For a new module, add the sidebar entry and the `ROUTE_PERMISSIONS` prefix in
   `frontend/lib/permissions.ts` — or a `ROUTE_PATTERNS` entry if the route has
   a dynamic segment, as `/users/<id>/edit` does. For a new dashboard widget,
   add it to `WIDGET_PERMISSIONS` in the dashboard page.
5. Run `pnpm check:permissions`.
6. Grant it to the people who need it — it is deny-by-default, so nobody gets it
   automatically, including on accounts that already exist.
