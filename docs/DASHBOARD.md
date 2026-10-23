# Operations Dashboard

The dashboard surfaces the day's operational state: what sold, who needs a
follow-up, what money moves today, which trips start or end, and which running
trips still owe money.

## Deploy steps

These must run in order. Step 1 cannot be skipped: `prisma db push` would drop
the itinerary date columns rather than convert them.

```bash
cd backend

# 1. Convert itineraries.start_date / end_date from text to timestamp.
psql "$DATABASE_URL" -f scripts/migrate-trip-dashboard.sql

# 2. Create the new tables/columns (payment_schedules, supplier_payables,
#    itineraries.status) and regenerate the client.
pnpm db:push
pnpm db:generate

# 3. Give every pre-existing itinerary a tripId so it is searchable.
node scripts/backfill-trip-ids.js
```

`pnpm db:generate` fails with `EPERM` on Windows while the dev server is
running, because the running process holds the Prisma query engine DLL. Stop
the server first.

## Model changes

| Change | Why |
| --- | --- |
| `Itinerary.startDate` / `endDate`: `String?` → `DateTime?` | Date-range queries were impossible. `getAllTrips` passed `new Date()` into a `String` filter, which Prisma rejects, so trip date filtering never worked. |
| `Itinerary.status` (`TripStatus`: `DRAFT`/`CONFIRMED`/`CANCELLED`) | Every itinerary is now a trip, so a lifecycle flag is needed to keep unconfirmed quotes out of the Live and payment panels. The bulk-create path was already passing `status: 'DRAFT'` to a column that did not exist. |
| `PaymentSchedule` (new) | `TripPayment` only records cash already received. "Due Incoming" needs to know what is owed *by when*. |
| `SupplierPayable` (new) | Nothing modelled money owed **to** hotels and transport, so "Due Outgoing" had no data source. |

### Two kinds of status

`Itinerary.status` is the lifecycle a person sets. `tripStatus` in API responses
is derived from the travel dates (`UPCOMING`/`ONGOING`/`COMPLETED`/`NO_DATE`)
and is not settable. They are independent: a `CONFIRMED` trip can be `ONGOING`.

## Every itinerary is a trip

`buildBaseWhere` in `trip.controller.js` previously restricted trips to
itineraries whose lead was `WON`. It now returns every non-template itinerary
the user may see, scoped by role (STAFF: own; MANAGER: branch; ADMIN: all).

Both itinerary create paths already assign a `tripId`; `scripts/backfill-trip-ids.js`
covers rows created before that.

## Searching by phone

Phones are stored in E.164 (`+919876543210`), but people type them the way they
write them — `+91 98765 43210`, `98765-43210`, `(700) 6087880`. Both search
paths (`/search` and the `search` filter on `/trips`) therefore strip the query
to digits with `phoneDigits()` from `utils/phone.js` and match on that, rather
than comparing the raw string. Matching raw meant any formatted number returned
nothing.

The digit branch only runs when the query has 4+ digits, so a short word is not
turned into a phone lookup.

## Where a trip link goes

`/trips/[id]` is the whole booking on one page: customer, day plan, cash
received, instalments due, supplier payables and the follow-up trail, with
actions to record a payment or edit the schedule in place. A trip ID search
lands here, as do the dashboard's due-payment rows and the trips list.

It is distinct from `/itineraries/[id]`, which edits the day plan and knows
nothing about money. The trip page links across to it.

`GET /trips/:id` returns everything that page needs in one call, including a
`finance` block (cost, received, balance, scheduled vs unscheduled, payables
outstanding, and margin = cost − supplier costs). It settles instalments before
responding, so the numbers agree with the dashboard.

`/trips` is the list, and reads its filters from the URL (`search`, `tripId`,
`status`, `paymentStatus`, `startDateFrom`/`To`, `endDateFrom`/`To`), so the
dashboard widgets can deep-link into a filtered view.

## Timezones

`src/utils/dateWindows.js` resolves "today" against the branch's timezone, and
draws a distinction that is easy to get wrong:

- **`calendarDayWindow`** — for *date-only* columns (`startDate`, `endDate`,
  `dueDate`). These are written from `YYYY-MM-DD` and sit at UTC midnight with
  no meaningful time of day. The window runs UTC-midnight to UTC-midnight, but
  *which* day it covers is decided in the branch timezone. Using a true zoned
  window here would shift trips a day for branches west of UTC.
- **`zonedDayWindow`** — for real instants (`followUp.scheduledAt`,
  `tripPayment.paymentDate`). The window is the true start and end of that day
  in the branch timezone.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/dashboard/overview` | All five panels in one call (used on first load). A panel that fails returns `null` instead of failing the response. |
| GET | `/dashboard/sales-stats?period=today\|week\|month` | Revenue, leads, quotes, conversions |
| GET | `/dashboard/followups` | Open follow-ups: due now, today, yesterday, next 7 days, overdue |
| GET | `/dashboard/payments` | Due in / due out for today, yesterday, overdue |
| GET | `/dashboard/trip-timings` | Trips starting and ending around now |
| GET | `/dashboard/due-trips?scope=live\|ended_yesterday\|starts_in_7_days` | Trips with an outstanding balance |
| GET | `/search?q=` | Trips and leads by tripId, title, destination, client name, phone or email. A query that *is* a whole trip ID sorts that row first and sets `exactMatch`, which the search box uses to jump straight to the trip on Enter. |
| PATCH | `/trips/:id/status` | Set `DRAFT`/`CONFIRMED`/`CANCELLED` |
| GET POST | `/trips/:id/schedules` | Customer instalments |
| POST | `/trips/:id/schedules/generate` | Advance + balance plan from the trip cost |
| PATCH DELETE | `/trips/:id/schedules/:scheduleId` | Edit or remove an instalment |
| GET POST | `/trips/:id/payables` | Supplier payables |
| POST | `/trips/:id/payables/generate` | Roll up hotels, transport and activities from `daysJson` |
| PATCH DELETE | `/trips/:id/payables/:payableId` | Edit or remove a payable |

## Which follow-ups count as open

`markOverdueFollowUps` in `cron.service.js` runs every 5 minutes and flips any
`PENDING` follow-up past its scheduled time to `OVERDUE`. So a query filtering
on `status: 'PENDING'` alone reports zero for every past bucket within minutes
of a follow-up falling due.

The dashboard therefore treats `PENDING`, `OVERDUE` and `RESCHEDULED` as open,
and only `DONE` and `CANCELLED` as closed. The buckets are:

- **Due Now** — open and the scheduled moment has passed. This is the worklist.
- **Today** — open and scheduled anywhere in today, with `remaining` counting
  those still ahead of the clock.
- **Yesterday** / **Next 7 Days** — open in that window.
- **overdue** — open and carried over from before today; a subset of Due Now,
  shown as the hint under it.

The Today and Due Now buckets overlap on purpose: a follow-up scheduled for
09:00 today is in both at noon. Today answers "what is on today", Due Now
answers "what should already have happened".

## How payments settle instalments

Instalments are not linked to individual payments. Instead, every time payments
change, `syncSchedulesForTrip` re-spreads the total cash received over the
instalments oldest-due-first. Because that is idempotent, adding and deleting a
payment both leave the schedule correct. `WAIVED` instalments are skipped, so
cash flows past them to the next one.

The headline balance on a trip stays `totalCost - cash received`. Instalments
say *when* money is due, not what the trip costs — which is why the instalments
tab warns when the scheduled total is short of the trip cost.

Auto-generated payables are marked `autoGenerated`. Regenerating replaces only
those rows, and editing one clears the flag so a later regenerate will not
discard the edit.

## Frontend

The dashboard widgets are toggleable like the existing ones. A layout saved in
`localStorage` before these widgets existed would have hidden them permanently,
so the page merges any unknown widget type in from the defaults on load.

- `components/dashboard/trip-sales-stats-widget.tsx`
- `components/dashboard/pending-followups-widget.tsx`
- `components/dashboard/payments-due-widget.tsx`
- `components/dashboard/trip-timings-widget.tsx`
- `components/dashboard/due-payment-trips-widget.tsx`
- `components/dashboard/global-search.tsx`
- `components/trips/trip-finance-dialog.tsx` — instalment and payable entry,
  opened from the wallet action on the Trips page

Instalments and payables are entered per trip from the Trips page. Until a trip
has instalments, its balance shows in **Live Trips with Due Payments** but
contributes nothing to **Due Incoming**, which is by design: Due Incoming
answers "what is owed today", which needs a due date.
