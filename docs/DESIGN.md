# Design system — Claidsphere CRM

Pass 1. Plan only. No code has been written.

---

## 0. What this document is designing

The original brief described an e-commerce storefront: catalog, cart, product detail, checkout.
**This application has none of those things.** It is a travel-agency CRM. The Prisma schema is
`Lead`, `Itinerary`, `FollowUp`, `Hotel`, `Vehicle`, `Destination`, `WhatsAppMessage`,
`AdCampaign`, `TripPayment`, `AuditLog`. Every route except `/login` and `/forgot-password`
sits behind authentication. There is no public surface at all.

So the brief's design *principles* carry over in full — restraint, a true neutral ramp, semantic
surface tokens, type-driven hierarchy, motion only in response to the user, a real dark mode.
Its *screens* do not. The section of the brief headed "Admin — the admin panel is a tool, not a
showcase" is the part that governs this entire application, not one seventh of it.

The four pages this document wireframes are the four that matter here:

| Brief | This app |
|---|---|
| Home | Dashboard |
| Listing | Leads (table + kanban) |
| Product detail | Lead detail |
| Checkout | Itinerary builder |

### What exists today

A purple-and-gold theme (`#7C236A` / `#BA9C62`) with brand-tinted shadows, five gradient
utilities, `hover-lift` on every card, a ten-child stagger animation, and no dark mode
(one `dark:` class in the entire codebase, in the WhatsApp panel). 598 lines of `globals.css`
containing roughly forty colour tokens, of which the neutral ramp is four slate values borrowed
from Tailwind's default palette.

---

## 1. Colour

### 1.1 The neutral ramp

```css
--color-n-0:   #ffffff;
--color-n-25:  #fcfcfc;
--color-n-50:  #f7f7f7;
--color-n-100: #efefef;
--color-n-200: #e3e3e3;   /* hairline border */
--color-n-300: #cfcfcf;   /* strong border, disabled text */
--color-n-400: #a8a8a8;
--color-n-500: #7c7c7c;   /* tertiary text */
--color-n-600: #5c5c5c;   /* secondary text */
--color-n-700: #404040;
--color-n-800: #262626;
--color-n-900: #171717;   /* primary text, primary button */
--color-n-950: #0a0a0a;
```

**Rationale.** The current neutrals are Tailwind slate — `rgb(30 41 59)` for body text, which is
a blue. Against a purple chrome that blue cast reads as muddy rather than neutral, and it makes
every grey in the interface argue quietly with every other grey. A true neutral ramp has no
opinion, which is the point: in an application where the user stares at dense tabular data for
eight hours, the substrate should be silent so that the two or three things that *are* coloured
land with full force. Thirteen steps is more than looks necessary, but a CRM needs closely
spaced greys — the difference between a zebra stripe, a hover state and a selected row is three
adjacent values, and with a five-step ramp you end up reaching for opacity hacks instead.

### 1.2 Semantic surfaces

Components reference these names. They never reference `n-200` directly. This is the whole
mechanism by which dark mode is a token swap rather than a rewrite.

| Token | Light | Dark |
|---|---|---|
| `surface` | `n-0` | `#141414` |
| `surface-raised` | `n-0` | `#1c1c1c` |
| `surface-sunken` | `n-50` | `#0e0e0e` |
| `surface-inverse` | `n-900` | `n-50` |
| `text-primary` | `n-900` | `#f5f5f5` |
| `text-secondary` | `n-600` | `#a3a3a3` |
| `text-tertiary` | `n-500` | `#7c7c7c` |
| `border-subtle` | `n-200` | `#2a2a2a` |
| `border-strong` | `n-300` | `#3d3d3d` |

**Rationale.** In light mode elevation is expressed by a border; in dark mode a border almost
disappears and elevation has to be expressed by getting *lighter*. That is why `surface-raised`
equals `surface` in light but is two steps lighter in dark. Encoding that inversion in the token
rather than in each component is the difference between building dark mode once and auditing
ninety components twice.

⚠️ **Name collision to fix in Pass 2.** `globals.css` already defines a `.border-subtle`
utility class that sets `opacity: 0.6`. The new semantic token of the same name will collide.
The old utility is used nowhere I could find, and gets deleted.

### 1.3 Brand — demoted from chrome to identity

```css
--color-brand: #7c236a;   /* Claidsphere purple — retained, but confined */
```

Used in exactly two places: the wordmark, and the 2px active-item rule in the sidebar.
Nowhere else. Primary buttons become `n-900`. The sidebar stops being a purple slab.

**Rationale.** This is the single largest visual change in the project and the one most likely
to draw an objection, so it should be stated plainly rather than discovered in a screenshot.
Right now purple is the *chrome*: the sidebar, the primary button, the focus ring, the scrollbar
thumb, the text selection, the avatar fill, the table header tint and the shadow colour. When a
brand hue is everywhere it stops being a signal and becomes a wash — and worse, it leaves
nothing to distinguish the one button on the page that actually matters. Confining purple to
identity and handing the primary action to near-black means a user's eye goes to the action, not
to the furniture. Keeping it as a single token means if the owner wants more brand presence back,
that is one value to change, not a hunt through ninety files.

### 1.4 Semantic colour

```css
--color-success: #0a7c4a;
--color-warning: #a35b00;
--color-danger:  #b42318;
--color-focus:   #2563eb;
```

**Rationale on focus specifically.** A blue focus ring is a third hue in an interface that has a
purple brand, which looks like an inconsistency until you consider what a focus ring is *for*.
It is not content and it is not brand — it is the system telling a keyboard user where they are.
Users read a blue ring as an operating-system affordance. Matching it to brand purple would make
it read as decoration, which is exactly when people stop noticing it.

### 1.5 Lead status — the decision this app actually turns on

`LeadStatus` has **fifteen** values: `NEW`, `FRESH`, `FOLLOWUP`, `HOT`, `WARM`, `NOT_ANSWERING`,
`WON`, `NOT_INTERESTED`, `JUNK`, `SENT_VOICEMAIL`, `CALL_DECLINED`, `CALL_BACK_SCHEDULED`,
`CONNECTED`, `CLOSED`, `QUOTE_SENT`.

The current design gives eight of them a saturated hue apiece — blue, gold, orange, violet, cyan,
green, red, amber — and silently drops the other seven onto a grey fallback.

Fifteen hues is not a palette, it is a rainbow, and it is precisely the "everything is the same
saturated hue" tell the brief warns about, inverted. **The fix is to recognise that these fifteen
statuses are not fifteen peer things.** They collapse into five pipeline stages:

| Stage | Statuses | Treatment |
|---|---|---|
| **Open** | `NEW`, `FRESH`, `CONNECTED` | neutral badge |
| **Working** | `FOLLOWUP`, `CALL_BACK_SCHEDULED`, `SENT_VOICEMAIL`, `NOT_ANSWERING`, `CALL_DECLINED`, `WARM` | neutral badge |
| **Quoted** | `QUOTE_SENT` | neutral badge, `border-strong` outline |
| **Hot** | `HOT` | warning tint — genuinely urgent, deserves the only warm colour on the page |
| **Won** | `WON` | success tint |
| **Dead** | `LOST`, `NOT_INTERESTED`, `JUNK`, `CLOSED` | `text-tertiary`, no tint |

Each badge carries a 6px stage dot. Five dot hues, not fifteen. The *word* carries the specific
status; the dot carries the stage; colour is spent only where a decision hangs on it.

**Rationale.** A staff member scanning a list of leads is asking one of two questions: "which of
these needs me today" and "which of these is finished." A hot lead and a won lead answer those.
The difference between `SENT_VOICEMAIL` and `CALL_DECLINED` is real information but it is not
*urgent* information, and rendering it in cyan versus violet does not help anyone — it just
guarantees that nothing on the page stands out. This is the brief's "colour appears only where
it carries meaning," applied to a fifteen-member enum instead of a sale price.

### 1.6 WhatsApp surfaces — a deliberate exception

The WhatsApp inbox keeps its authentic chat colours (`#ECE5DD` canvas, `#DCF8C6` outbound
bubble). These are not decoration and not brand — they are a faithful reproduction of a surface
the user recognises instantly from the app on their phone. Neutralising them would cost
recognition and buy nothing. They are tokenised (`--color-wa-*`) and confined to the chat
transcript; the surrounding page chrome is neutral like everywhere else. In dark mode they map
to WhatsApp's own dark palette rather than being algorithmically darkened.

### 1.7 Charts

Six categorical hues, drawn from a single desaturated family rather than six unrelated primaries,
verified for 3:1 against both `surface` values. Revenue lines are single-series and therefore
get `text-primary` with no legend and **no gradient fill underneath**, per the brief.

---

## 2. Typography

### 2.1 Instrument Serif is dropped entirely — and here is why

The brief specifies Instrument Serif for editorial headlines, and then says in the same breath:
*"Nowhere in the admin panel, never below 24px."* **This entire application is an admin panel.**
There is no homepage hero, no marketing surface, no editorial content — the largest piece of type
anywhere is a page title sitting above a data table. A serif display face here would have exactly
one place to live and would look like it had wandered in from a different product.

So: one family, Geist Sans, set tighter at the top of the scale to do the work the serif would
have done. The brief anticipated this case and asked to be told before it happened. This is that.

Geist Sans replaces Poppins (headings) and Inter (body). Two families becomes one.
Inter is dropped for the reason the brief gives — it is the default everyone reaches for.

### 2.2 Scale

Tracking is baked into each token, because large type needs negative tracking and small type
needs positive, and leaving that to call sites guarantees it gets forgotten.

| Token | Size/leading | Weight | Tracking | Used for |
|---|---|---|---|---|
| `h1` | 28/34 | 600 | −0.015em | page titles |
| `h2` | 20/26 | 600 | −0.01em | section headings, card titles |
| `h3` | 16/22 | 600 | −0.005em | sub-sections, dialog titles |
| `body-lg` | 15/24 | 400 | 0 | lead paragraphs, empty-state copy |
| `body` | 14/20 | 400 | 0 | forms, default |
| `body-sm` | 13/18 | 400 | 0.005em | **tables and dense data — the workhorse** |
| `caption` | 12/16 | 500 | 0.01em | labels, timestamps, helper text |

**Rationale.** The brief's storefront scale tops out at a 48px serif display and sets body at 15.
Both are wrong here. `h1` comes down from 32 to 28 because a CRM page title is a wayfinding label
sitting directly above dense content, not a statement — at 32 it starts to compete with the data
it is introducing. `body-sm` at 13 is the size most of this application is actually set in, which
matches the brief's own admin guidance ("13px body, more data per screen"). Seven steps, no more:
every additional step in a type scale is another opportunity for two things that should match to
almost match.

### 2.3 Rules

- **Tabular figures on every number.** Prices, phone numbers, pax counts, dates, percentages,
  KPI values. `font-variant-numeric: tabular-nums`. In a six-currency application with money in
  columns, misaligned digits are the small wrongness people feel without being able to name.
- **No monospace anywhere.** The current lead table sets phone numbers in `font-mono`. That is on
  the brief's anti-pattern list and it goes; tabular sans gives the same alignment without the
  "this is code" connotation.
- **Sentence case everywhere.** The current table headers are `uppercase tracking-wider`. That is
  the tracked-out all-caps tell. Headers become `caption` weight 500, sentence case.
- Body copy never exceeds 68 characters. Applies to empty-state copy, dialog body text, audit-log
  entries and activity notes — all currently full-bleed.
- One `h1` per page, correct heading order, enforced by the page header primitive.

### 2.4 Money

Six currencies (`INR MUR MYR USD EUR THB`). One `<Money>` primitive, used everywhere:
currency-aware formatting via `Intl.NumberFormat`, tabular figures, the symbol at
`text-tertiary` and the amount at `text-primary`, right-aligned in table columns. Never three
different money treatments across three pages.

---

## 3. Spacing

A 4px base scale.

| Context | Value |
|---|---|
| Inside a component | 8 / 12 / 16 |
| Between related elements | 12 / 16 |
| Between components | 20 / 24 |
| Between page sections | 24 mobile, 32 desktop |
| Page gutter | 16 mobile, 24 tablet, 32 desktop |
| Max content width | 1440 (fluid), forms capped at 720 |
| Prose | 68 characters |

**Rationale.** These are roughly half the brief's figures and that is deliberate. The brief's
64/96 section rhythm and 20/32/48 gutters are tuned for a storefront, where whitespace signals
confidence and the visitor is browsing. This is a tool someone uses all day to get through a
queue of leads, and every 96px band of nothing is a row of data they have to scroll to reach.
The brief's own admin section says exactly this — denser than the storefront, more data per
screen. What carries over unchanged is the *discipline*: one rhythm, held everywhere. Sections
that each invent their own padding is how a thing stops feeling designed, and that is true at 24
just as much as at 96.

Controls are 32px in admin-dense contexts (tables, filter bars, toolbars) and 40px in forms and
dialogs where the user is deliberately entering data. Tap targets remain 44px minimum on touch,
achieved with padding around the 32px visual control rather than by growing it.

---

## 4. Elevation

```css
--shadow-xs: 0 1px 2px rgb(0 0 0 / 0.04);
--shadow-sm: 0 1px 3px rgb(0 0 0 / 0.06), 0 1px 2px rgb(0 0 0 / 0.04);
--shadow-md: 0 4px 12px rgb(0 0 0 / 0.06), 0 2px 4px rgb(0 0 0 / 0.04);
--shadow-lg: 0 16px 40px rgb(0 0 0 / 0.10), 0 4px 12px rgb(0 0 0 / 0.06);
```

Shadow appears **only** on things that genuinely float: popovers, dropdowns, dialogs, the mobile
drawer, the sticky save bar, toasts. Cards get a hairline border and no shadow. Tables get a
border and row dividers.

**Rationale.** The current `Card` primitive ships `shadow-brand` plus `hover:shadow-brand-lg`
plus `hover:-translate-y-0.5`, so every card on every page floats and lifts on hover. When
everything is elevated, elevation has stopped encoding anything — it flattens hierarchy rather
than creating it, and the constant lifting makes a dense dashboard feel like it is twitching.
The purple-tinted shadows also go: a coloured shadow is a decorative effect wearing the costume
of a physical one.

### Radii

```css
--radius-sm: 4px;    /* badges, dots, small inputs */
--radius-md: 8px;    /* buttons, inputs, cards */
--radius-lg: 14px;   /* dialogs, drawers */
--radius-full: 9999px;
```

Three values, assigned by element size. The current system has six (`sm md lg xl` plus a bare
`--radius` plus `full`) and components mix `rounded-xl` cards with `rounded-lg` inputs and
`rounded-md` buttons with no rule behind it.

---

## 5. Motion

```css
--ease-out:   cubic-bezier(0.16, 1, 0.3, 1);
--ease-inout: cubic-bezier(0.65, 0, 0.35, 1);
--dur-fast:   120ms;
--dur-base:   180ms;
--dur-slow:   280ms;
```

| Interaction | Treatment |
|---|---|
| Hover / focus | `dur-fast`, opacity + background only |
| Button press | `scale(0.98)`, `dur-fast` |
| Dropdown / popover | `dur-base`, fade + 4px translate |
| Dialog | `dur-base`, fade + scale from 0.98 |
| Drawer / mobile sidebar | `dur-slow`, transform only |
| Toast | `dur-base`, slide from edge |
| Accordion | `dur-base` on height |
| Skeleton | 1.6s shimmer |
| Kanban card drag | transform only, no duration (follows the pointer) |
| Page transitions | none |
| Scroll-triggered reveals | none |

`transform` and `opacity` only. Everything wrapped in
`@media (prefers-reduced-motion: reduce)` reducing duration to `0.01ms`.

**Deleted:** `.stagger-children` (a ten-child cascade that delays the tenth dashboard widget by
450ms — the user is waiting on their data, not watching a reveal), `.hover-lift`,
`.hover-scale`, `.animate-count`, `.animate-progress`, and `hover:scale-[1.02]` on `Badge`
(a badge is not interactive; scaling it on hover suggests it is).

The existing `.animate-shimmer` also needs rebuilding — its highlight stop is
`--color-muted-foreground`, a mid-grey, so the sweep reads as a dark bar crossing the skeleton
rather than a sheen. New shimmer moves between `n-100` and `n-200`.

---

## 6. Primitives

Built in Pass 2, before any page work.

**Button** — `primary` (n-900), `secondary` (surface + border-strong), `ghost`, `danger`, `link`.
Sizes sm/md/lg at 32/40/48. Every variant gets hover, active `scale(0.98)`, focus-visible ring
2px at 2px offset, disabled, and a **loading state that preserves width** — spinner replaces the
label in place, button stays disabled. Icon-only buttons are square and require `aria-label`.
Deletes the `brand-gradient` and `gold` variants.

**Input / Textarea / Select** — 40px (32px dense). Label above, never a placeholder-as-label.
Hairline border, `border-strong` on hover, focus ring on focus. Error state: danger border plus
a message below with an icon, **in reserved space** so validation does not push the form down.
The current `Input` renders its error conditionally, which shifts every field below it.

**Card** — surface background, hairline border, `radius-md`, **no shadow, no hover transform**.

**Badge** — tinted background at low opacity with matching text, optional stage dot, `radius-sm`,
sentence case. Mapped to the five pipeline stages plus neutral/success/warning/danger.
Replaces twenty-four current variants with nine.

**Dialog / Drawer / Sheet** — backdrop 40% black with 4px blur, focus trapped, `Escape` closes,
background scroll locked, focus returned to trigger. On mobile, dialogs become bottom sheets with
a drag handle.

**Toast** — bottom-right desktop, top mobile, auto-dismiss 5s, pause on hover, max 3 stacked.
Copy comes from mapping the API error `code` to human text. The app currently does
`error.response.data.message || 'Failed to load leads'` in ~30 places, rendering raw server
strings; that gets centralised.

**Skeleton** — one per real component, matching actual dimensions. The current `LoadingSkeleton`
renders five identical 48px bars regardless of what is loading, so every page jumps when data
lands.

**Empty state** — line-art icon, one-line explanation, single primary action, written as an
invitation. The current ones use a dashed 2px border and a ringed tinted icon box; both go.
Copy loses its exclamation marks ("All caught up!" → "No follow-ups due").

**Table** — sticky header, 44px rows, hairline dividers, zebra only past 10 rows, numeric columns
right-aligned with tabular figures, per-column sort affordance, row hover, checkbox column that
turns the header into a bulk-action bar on selection.

**StatusBadge** — the five-stage mapping from §1.5, as one component, so all fifteen enum values
are handled in one place instead of a `Record<string, string>` duplicated across four files.

**Money** — §2.4.

**StatusStepper** — horizontal, with completed / current / upcoming visually distinct. Used by
the itinerary wizard and the follow-up timeline.

---

## 7. Navigation — 19 flat items is the real problem

The sidebar renders nineteen items in one undifferentiated list, each with its own icon, three of
which (`Shield`) are reused for different things. Collapsing it to an icon rail does not help —
it makes nineteen ambiguous icons out of nineteen ambiguous labels.

Grouped into six labelled sections, ordered by frequency of use:

```
Work        Dashboard · Leads · Follow-ups · Booked clients / My clients
Build       Itineraries · Templates
Inventory   Hotels · Vehicles · Destinations
Messages    WhatsApp · All WhatsApp · Message templates
Insight     Analytics · Performance · Connected apps
Settings    Branches · Users · Assignment rules · Audit logs
```

Group labels are `caption` at `text-tertiary`. Role filtering already exists and is unchanged —
a `STAFF` user sees roughly nine items across four groups, which no longer needs grouping to be
legible but stays consistent. Collapsed rail shows group separators as hairlines and relies on
tooltips.

---

## 8. Wireframes

### 8.1 Dashboard — 1440

```
┌────────────┬──────────────────────────────────────────────────────────────────┐
│ Claidsphere│                                                                  │
│            │  Welcome back, Huzaif                              [Customise]   │
│ WORK       │  Here's what's happening with your leads today      [+ New lead] │
│ ▸ Dashboard│                                                                  │
│   Leads    │  ┌──────────────┬──────────────┬──────────────┬──────────────┐  │
│   Follow-up│  │ Total leads  │ New this week│ Hot          │ Booked       │  │
│   Clients  │  │              │              │              │              │  │
│            │  │ 1,284        │ 96           │ 23           │ 41           │  │
│ BUILD      │  │ ▲ 12% vs prev│ ▲ 4% vs prev │ ▼ 8% vs prev │ ▲ 22% vs prev│  │
│   Itinerar.│  └──────────────┴──────────────┴──────────────┴──────────────┘  │
│   Templates│      ↑ value 28px tabular · label 12px tertiary · delta 12px     │
│            │        with direction glyph — green up / red down, nothing else  │
│ INVENTORY  │                                                                  │
│   Hotels   │  ┌───────────────────────────────┬──────────────────────────┐   │
│   Vehicles │  │ Pipeline                      │ Today's follow-ups   (6) │   │
│   Destinat.│  │                               │                          │   │
│            │  │ Fresh        ████████░░  412  │ ○ Anjali R.    10:30  →  │   │
│ MESSAGES   │  │ Follow-up    ██████░░░░  298  │ ○ Marcus T.    11:15  →  │   │
│   WhatsApp │  │ Quote sent   ████░░░░░░  186  │ ○ Priya S.     14:00  →  │   │
│   All WA   │  │ Hot          ██░░░░░░░░   23  │ ○ Dev N.       15:30  →  │   │
│   Templates│  │ Booked       ███░░░░░░░   41  │ ○ Sara K.      16:45  →  │   │
│            │  │                               │ ○ Tom A.       17:00  →  │   │
│ INSIGHT    │  │ horizontal bars, one neutral  │                          │   │
│   Analytics│  │ fill, count right tabular.    │ View all follow-ups      │   │
│   Performa.│  │ No donut, no legend.          │                          │   │
│   Connected│  └───────────────────────────────┴──────────────────────────┘   │
│            │                                                                  │
│ SETTINGS   │  ┌──────────────────────────────────────────────────────────┐   │
│   Branches │  │ Leads over time                            [30 days ▾]   │   │
│   Users    │  │                                                          │   │
│   Rules    │  │      ╱╲      ╱╲                                          │   │
│   Audit    │  │   ╱╲╱  ╲╱╲╱╲╱  ╲╱╲                                       │   │
│            │  │ ╱                  ╲╱╲___                                 │   │
│ ─────────  │  │ single line, text-primary, no fill, no legend, no dots   │   │
│ ⬤ HM       │  └──────────────────────────────────────────────────────────┘   │
│   Huzaif M.│                                                                  │
│   Admin    │                                                                  │
└────────────┴──────────────────────────────────────────────────────────────────┘
  264px          gutter 32                                            gutter 32
```

**390** — sidebar becomes a drawer behind a hamburger in a 56px top bar. KPIs go 2×2. Pipeline
and follow-ups stack full width. Chart keeps its aspect ratio, no horizontal scroll.

The dashboard is currently eight user-toggleable widgets in a `localStorage`-persisted order,
with a customise dialog. That mechanism is kept as-is — it is a real feature and the brief is a
design task. Only the widgets' visual treatment changes.

---

### 8.2 Leads — 1440, table view

```
│  Leads                                            [Import]  [+ New lead]      │
│  1,284 leads · showing 1–50                                                   │
│                                                                               │
│  ┌──────────────────────────────────────────────────────────────────────┐    │
│  │ [⌕ Search name, phone, email    ] [Status ▾][Source ▾][Owner ▾]  ⊞ ☰ │    │
│  └──────────────────────────────────────────────────────────────────────┘    │
│   Status: Hot ✕   Owner: Me ✕   Clear all                                     │
│    ↑ applied filters as removable chips, only when filters are on             │
│                                                                               │
│  ┌──┬────────────────┬──────────────┬──────────┬───────────┬────────┬─────┐  │
│  │☐ │ Name        ⇅  │ Phone        │ Status ⇅ │ Owner     │ Value ⇅│ Age ⇅│ │
│  ├──┼────────────────┼──────────────┼──────────┼───────────┼────────┼─────┤  │
│  │☐ │ ⬤ Anjali Rao  │ +91 98··· 12 │ ● Hot    │ ⬤ Dev N.  │ ₹84,000│  2d │  │
│  │☐ │ ⬤ Marcus Tan  │ +60 12··· 88 │ ● Quoted │ ⬤ Sara K. │ MYR 3,2│  5d │  │
│  │☐ │ ⬤ Priya Shah  │ +91 99··· 40 │ ○ Fresh  │ Unassigned│      — │  1d │  │
│  │☐ │ ⬤ Tom Abadi   │ +230 57··· 3 │ ○ Won    │ ⬤ Dev N.  │ MUR 45k│ 12d │  │
│  └──┴────────────────┴──────────────┴──────────┴───────────┴────────┴─────┘  │
│      44px rows · hairline dividers · header sticky, sentence case, 12px       │
│      Value + Age right-aligned, tabular. Dot = stage, word = status.          │
│                                                                               │
│  ← Previous          Page 1 of 26                            Next →           │
└───────────────────────────────────────────────────────────────────────────────┘

On selection the header becomes a bulk bar:
  ┌──────────────────────────────────────────────────────────────────────┐
  │ ☑ 3 selected      Assign to ▾   Change status ▾   Export      Delete │
  └──────────────────────────────────────────────────────────────────────┘
```

Kanban view (the `⊞` toggle) keeps its six columns; cards lose the shadow and hover-lift, gain
the stage dot, and drag with transform only.

**390** — table becomes a stacked card list (this already exists and is the right call; a
seven-column table does not survive 390px). Filters move into a bottom sheet behind a
`Filters (2)` button carrying the applied count. Card is: name + stage dot, phone,
status badge, owner, age — five lines, no avatar gradient, 16px padding.

---

### 8.3 Lead detail — 1440

```
│  ← Leads                                                                      │
│                                                                               │
│  ⬤   Anjali Rao                                    [Transfer] [Edit]  [⋯]    │
│  HM  +91 98765 4321 · anjali@example.com                                      │
│      ● Hot   ·   Owner Dev N.   ·   Bangalore   ·   Created 12 Sep            │
│      ────────────────────────────────────────────────────────────────         │
│      Details    WhatsApp (14)    Itineraries (2)    Activity                  │
│      ▔▔▔▔▔▔▔                                                                  │
│                                                                               │
│  ┌──────────────────────────────────────────┬─────────────────────────────┐  │
│  │ Trip requirements                        │ Follow-ups           [+ Add]│  │
│  │                                          │                             │  │
│  │ Destination      Mauritius               │ ┌─────────────────────────┐ │  │
│  │ Travel dates     12–19 Nov 2026          │ │ ● Due today  ·  15:30   │ │  │
│  │ Pax              2 adults, 1 child       │ │ Call — confirm budget   │ │  │
│  │ Budget           ₹ 180,000               │ │ Dev N.      [Mark done] │ │  │
│  │ Hotel category   4 star                  │ └─────────────────────────┘ │  │
│  │ Trip type        Honeymoon               │ ┌─────────────────────────┐ │  │
│  │ Pickup           Bangalore               │ │ ○ Done · 10 Sep         │ │  │
│  │                                          │ │ WhatsApp — sent quote   │ │  │
│  │  ↑ label column text-secondary 13px,     │ │ Outcome: Interested     │ │  │
│  │    value text-primary 14px, hairline     │ └─────────────────────────┘ │  │
│  │    between rows, no boxes                │                             │  │
│  ├──────────────────────────────────────────┤ ┌─────────────────────────┐ │  │
│  │ Activity                          [+ Add]│ │ Create itinerary        │ │  │
│  │                                          │ │ Build a quote for this  │ │  │
│  │ │ 14 Sep 11:20  Dev N.                   │ │ lead.                   │ │  │
│  │ │ Called — discussed Mauritius package   │ │ [Start →]               │ │  │
│  │ │                                        │ └─────────────────────────┘ │  │
│  │ │ 12 Sep 09:05  System                   │                             │  │
│  │ │ Lead assigned to Dev N.                │                             │  │
│  │ │                                        │                             │  │
│  │   ↑ 1px rail, no cards, no avatars       │                             │  │
│  └──────────────────────────────────────────┴─────────────────────────────┘  │
│           2fr                                          1fr                    │
```

The header keeps the tab bar that already exists. The four tabs stay; what changes is that the
meta line under the name uses hairline-separated segments rather than the current badge pile,
and the status becomes an inline editable control rather than a static badge plus a separate
dropdown elsewhere on the page.

**390** — single column, tabs scroll horizontally, the follow-up/itinerary rail moves below
details. Action buttons collapse into the `⋯` menu except the primary one.

---

### 8.4 Itinerary builder — 1440

This is the checkout-equivalent: the highest-stakes, longest, most abandonable flow in the app.
It is currently a 1,323-line six-step wizard with `localStorage` draft persistence.

```
│  ← Itineraries                          Draft saved 14:32                     │
│                                                                               │
│  ✓ ───── ✓ ───── ● ───── ○ ───── ○                                           │
│  Trip    Mode    Build   Pricing  Terms                                       │
│  details                                                                      │
│   ↑ completed = filled n-900 + check · current = n-900 ring · upcoming =      │
│     border-strong outline, text-tertiary. Line: n-900 behind done, n-200 ahead│
│                                                                               │
│  ┌────────────────────────────────────────────┬──────────────────────────┐   │
│  │  Build itinerary                           │ Summary            (2fr) │   │
│  │  Mauritius · 7 days · 2 adults, 1 child    │ ──────────────────────── │   │
│  │                                            │ Anjali Rao               │   │
│  │  ┌ Day 1 ──────────────────── Port Louis ┐ │ Mauritius                │   │
│  │  │ Hotel     Le Meridien · 4★ · DBL      │ │ 12–19 Nov 2026           │   │
│  │  │ Vehicle   Sedan · Airport pickup      │ │ 2 adults · 1 child       │   │
│  │  │ Meals     ○ B  ● L  ● D               │ │                          │   │
│  │  │ Activity  Caudan Waterfront walk    ✕ │ │ Days        7            │   │
│  │  │           [+ Add activity]            │ │ Hotels      6            │   │
│  │  └───────────────────────────────────────┘ │ Activities  11           │   │
│  │  ┌ Day 2 ──────────────────── Le Morne  ┐ │ ──────────────────────── │   │
│  │  │ ...                          collapsed│ │ Cost        ₹ 142,000    │   │
│  │  └───────────────────────────────────────┘ │ Margin      ₹  38,000    │   │
│  │  ┌ Day 3 ─────────────────────  ⚠ no hotel│ │ ──────────────────────── │   │
│  │  └───────────────────────────────────────┘ │ Total       ₹ 180,000    │   │
│  │   ↑ incomplete days flagged inline on the  │             ▔▔▔▔▔▔▔▔▔▔▔  │   │
│  │     affected day, not as a banner on top   │  ↑ sticky, tabular,      │   │
│  │                                            │    animates on change    │   │
│  └────────────────────────────────────────────┴──────────────────────────┘   │
│                                                                               │
│  ┌───────────────────────────────────────────────────────────────────────┐   │
│  │ ← Back                                    Save draft    Continue →    │   │
│  └───────────────────────────────────────────────────────────────────────┘   │
│    sticky footer, always visible, never scrolls out of reach                  │
```

Day cards are accordions — one open at a time, others collapsed to a one-line summary. At seven
to fourteen days the current all-expanded layout is thousands of pixels of scroll.

**390** — summary collapses to a sticky bottom bar showing total + `Continue`, expandable upward
to the full breakdown by tapping. Stepper compresses to `Step 3 of 5 · Build` with a progress
rule. Day accordions full width.

---

## 9. Self-review — what I changed after asking the honest question

The brief asked me to review my own plan and ask whether it is what I would produce for *any*
brief of this kind. Going through it, most of it was. Here is what was generic, and what I
changed.

**1. Fifteen statuses, fifteen colours.** My first pass did the obvious thing — took the existing
eight hues, cleaned them up, added seven more for the unmapped values. That is the generic
answer and it is wrong. It took actually reading the enum to notice that `SENT_VOICEMAIL`,
`CALL_DECLINED` and `NOT_ANSWERING` are not pipeline stages at all — they are *call outcomes*
that happen to live in the same enum. Collapsing fifteen values onto five stages, spending colour
only on Hot and Won, and letting the word carry the specific status is the decision this
application actually needed, and it does not transfer to any other CRM with a different enum.

**2. "Collapsible icon-rail sidebar."** Straight from the brief, and I had written it down
without checking. The sidebar has nineteen items and three of them use the same `Shield` icon.
An icon rail turns nineteen ambiguous labels into nineteen ambiguous icons. Grouping them into
six named sections was the thing the actual navigation needed; the rail is now secondary.

**3. Instrument Serif.** I had it in the plan for page titles, because the brief specified it.
Then I looked for a surface it belonged on and there isn't one — this app has no hero, no
editorial content, nothing above 28px. Dropped entirely, as the brief invited me to do if the
content turned out to be technical.

**4. The brief's spacing scale.** I copied 64/96 section rhythm and 20/32/48 gutters verbatim on
the first pass. That is storefront spacing, and applying it to a queue-processing tool means a
staff member scrolls past empty bands all day. Halved, with the *discipline* kept intact.

**5. WhatsApp.** The brief's floating 56px WhatsApp bubble is a storefront contact affordance.
Here WhatsApp is a full inbox with a message transcript, so the bubble is meaningless and the
real question is whether the chat surface keeps its recognisable green-and-cream. I decided it
does, which is technically a violation of "colour only where it carries meaning" until you
notice that recognition *is* meaning.

**6. What I did not change, and should say so.** The neutral ramp, the semantic surface mapping,
the elevation scale, the motion tokens and the primitive list are the brief's, essentially
verbatim. They are generic — and that is correct. A neutral ramp has no business being
distinctive. Those are infrastructure, and reinventing infrastructure to look bespoke is how
design systems acquire the quirks that everyone downstream has to work around.

---

## 10. Quality floor for Passes 2 and 3

- Responsive from 320px. Verified at 320 / 390 / 768 / 1024 / 1440. No horizontal overflow.
  Tap targets 44px on touch.
- Every interactive element Tab-reachable in a sensible order with a visible focus ring. Dialogs
  trap focus and return it. Skip-to-content link.
- Semantic landmarks, one `h1` per page, correct heading order, `aria-label` on icon buttons,
  `aria-live` on toasts and the follow-up count.
- Contrast verified by computation, not assumption: 4.5:1 body, 3:1 large text and UI borders,
  in both themes.
- No layout shift. Every async area gets a correctly sized skeleton. Every conditional message
  occupies reserved space.
- `prefers-reduced-motion` respected everywhere.
- Dark mode complete and verified screen by screen, including charts, badges and the WhatsApp
  transcript.
- Loading, empty, error and success states for every async surface.

### Scope

Nineteen routes, ~120 component files. Pass 3 order:

1. App shell (sidebar, top bar, page header) + theme toggle
2. Dashboard
3. Leads (table, kanban, filters, forms)
4. Lead detail (all four tabs)
5. Itinerary builder + itinerary list/detail
6. Follow-ups, clients
7. Inventory — hotels, vehicles, destinations
8. WhatsApp inbox
9. Analytics, performance
10. Settings — branches, users, rules, audit
11. Auth — login, forgot password
12. PDF templates — **excluded**; `@react-pdf/renderer` uses its own StyleSheet, not Tailwind,
    and restyling the generated PDFs is a separate piece of work. Flagging rather than assuming.

---

**Pass 1 ends here.** No code has been written. Passes 2 and 3 begin on your approval.
