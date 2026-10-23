# Google Ads & Meta Ads — setup and usage

Written for whoever configures and operates the ad integrations (admin + developer).

There are **two independent features** here, and they are wired up separately.
People usually conflate them, then wonder why one works and the other does not:

| | What it does | Direction | Needs OAuth? |
|---|---|---|---|
| **Lead webhooks** | New lead forms arrive in the CRM automatically | Google/Meta → us | **No** |
| **Campaign sync** | Pulls spend, impressions, clicks into the campaign record | us → Google/Meta | **Yes** |

You can run the webhooks without ever touching OAuth. Start there — it is the
part that actually generates leads.

---

## Part 1 — Lead webhooks

### 1.1 Meta (Facebook / Instagram) Lead Ads

**Environment variables**

```bash
META_APP_ID=                    # developers.facebook.com → your app → Settings → Basic
META_APP_SECRET=                # same page
META_WEBHOOK_VERIFY_TOKEN=      # any random string you invent
META_PAGE_ACCESS_TOKEN=         # see below - leads arrive EMPTY without this
META_GRAPH_VERSION=v21.0        # optional
```

> ⚠️ `META_PAGE_ACCESS_TOKEN` is the one people miss. Meta's webhook payload
> contains **only a `leadgen_id`** — none of the answers the customer typed.
> The CRM has to call the Graph API to fetch them. With no page token the lead
> is skipped and you get `META_PAGE_ACCESS_TOKEN is not set` in the logs.

**Getting the page access token**

1. Open [Graph API Explorer](https://developers.facebook.com/tools/explorer/).
2. Pick your app, then **User Token**, and grant `leads_retrieval`, `pages_show_list`, `pages_read_engagement`.
3. Call `GET /me/accounts` — each entry has an `access_token`. That is the page token for that page.
4. Page tokens derived from a long-lived user token do not expire. Verify with
   [Access Token Debugger](https://developers.facebook.com/tools/debug/accesstoken/) — you want `Expires: Never`.

**Registering the webhook**

In your Meta app → **Webhooks** → **Page** → Subscribe to `leadgen`:

- **Callback URL:** `https://your-api-domain/api/v1/leads/webhook/meta`
- **Verify token:** exactly your `META_WEBHOOK_VERIFY_TOKEN`

Meta immediately sends a `GET` with `hub.challenge`. If verification fails:

- The server must already be running with the env var set. It now returns
  **503** when `META_WEBHOOK_VERIFY_TOKEN` is unset, rather than accepting the
  old placeholder value `your-verify-token`.
- The URL must be public HTTPS. For local development use
  `ngrok http 5000` and register the ngrok URL.

Finally, subscribe the **page itself** to the app — webhooks silently deliver
nothing until you do:

```bash
curl -X POST "https://graph.facebook.com/v21.0/{PAGE_ID}/subscribed_apps" \
  -d "subscribed_fields=leadgen" \
  -d "access_token={PAGE_ACCESS_TOKEN}"
```

**Testing**

Use Meta's [Lead Ads Testing Tool](https://developers.facebook.com/tools/lead-ads-testing),
pick your page and form, and submit a test lead. You should see:

```
[Meta Webhook] Lead 123456 created -> clxyz...
```

### 1.2 Google Ads Lead Forms

**Environment variables**

```bash
GOOGLE_ADS_WEBHOOK_KEY=         # any random string - paste the SAME one into Google Ads
GOOGLE_ADS_WEBHOOK_TOKEN=       # a SEPARATE random string, for Zapier/Make/curl only
```

> 🔧 **Fixed:** the Google endpoint previously validated the Zapier fallback
> against `META_WEBHOOK_VERIFY_TOKEN`. Anyone holding the Meta secret could post
> leads to the Google endpoint, and rotating one platform's secret silently
> changed the other's. It now uses its own `GOOGLE_ADS_WEBHOOK_TOKEN`.

**Registering**

In Google Ads → your Lead Form asset → **Lead delivery option**:

- **Webhook URL:** `https://your-api-domain/api/v1/leads/webhook/google`
- **Key:** exactly your `GOOGLE_ADS_WEBHOOK_KEY`

Click **Send test data**. Google's test payload carries `is_test: true` and is
acknowledged without creating a lead — that is intentional.

**Posting from Zapier / Make / curl**

These cannot send Google's `google_key`, so use the token instead:

```bash
curl -X POST "https://your-api-domain/api/v1/leads/webhook/google?token=YOUR_GOOGLE_ADS_WEBHOOK_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"full_name":"Anjali Rao","phone_number":"+919876543210","destination":"Mauritius"}'
```

### 1.3 Routing leads to the right branch and campaign

Both webhooks resolve a branch in this order:

1. The branch of the **AdCampaign** matched by the platform's numeric IDs
2. `?branchId=` on the webhook URL
3. `branch_id` in the payload
4. The oldest active branch

To link incoming leads to a campaign, create the campaign in
**Connected apps** and fill in the platform IDs:

- Google: `googleCampaignId` (or `googleAccountId`)
- Meta: `metaAdSetId` (or `metaAccountId`)

Leads whose IDs match nothing are still imported — just unlinked. That is
deliberate: losing a lead is worse than losing an attribution.

---

## Part 2 — Campaign sync (spend, clicks, impressions)

This is the part that needed OAuth, and the part that was broken.

### 2.1 Google Ads

**Environment variables**

```bash
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/ad-campaigns/callback/google
GOOGLE_ADS_DEVELOPER_TOKEN=        # NOT optional - see below
GOOGLE_ADS_LOGIN_CUSTOMER_ID=      # only if you use a manager (MCC) account
```

**Step 1 — OAuth client.** In
[Google Cloud Console](https://console.cloud.google.com/apis/credentials) →
**Create credentials** → **OAuth client ID** → **Web application**. Add your
`GOOGLE_REDIRECT_URI` verbatim under *Authorised redirect URIs*. It must match
character for character, including the trailing slash (or lack of one).

**Step 2 — Developer token.** This is the step that surprises people:
**OAuth alone cannot call the Google Ads API.** You also need a developer token
from a Google Ads **manager** account → *Tools & Settings* → **API Center**.

A fresh token starts at **Test account** access and works only against test
accounts. Querying a real account returns
`DEVELOPER_TOKEN_NOT_APPROVED` until Google grants Basic access — applications
typically take a few business days.

**Step 3 — Connect.** In the CRM: **Connected apps** → Google → **Connect**.
Approve in the popup; it returns to `/ad-campaigns/callback/google`, the server
exchanges the code, and the refresh token is stored against your branch's
Google campaigns.

**Step 4 — Fill in the IDs.** Each campaign needs:

- `googleAccountId` — the ten-digit customer ID (dashes are stripped automatically)
- `googleCampaignId` — the numeric campaign ID from the Google Ads UI

**Step 5 — Sync.**

```
POST /api/v1/ad-campaigns/{id}/sync/google?dateRange=LAST_30_DAYS
```

Accepted ranges: `TODAY`, `YESTERDAY`, `LAST_7_DAYS`, `LAST_14_DAYS`,
`LAST_30_DAYS`, `THIS_MONTH`, `LAST_MONTH`.

The returned `spend` is **written to the campaign's `spent` column**, so the
dashboard reflects it. The old implementation returned hardcoded zeroes and
never wrote anything, so a "successful" sync changed nothing.

### 2.2 Meta Ads

**Environment variables**

```bash
META_APP_ID=
META_APP_SECRET=
META_REDIRECT_URI=http://localhost:3000/ad-campaigns/callback/meta
```

Add that same URI to your Meta app → **Facebook Login** → **Settings** →
*Valid OAuth Redirect URIs*.

**Connect.** **Connected apps** → Meta → **Connect**. Approve, and the server
exchanges the code for a short-lived token, then immediately trades it for a
**long-lived (~60 day)** token.

> ⚠️ Meta user tokens expire after about 60 days and there is no refresh-token
> mechanism. An admin has to press **Connect** again roughly every two months.
> `GET /api/v1/ad-campaigns/connections/status` returns `expiresAt` so the UI
> can warn before a sync fails.

**Fill in the IDs:** `metaAccountId` (the `act_` ad account, prefix optional)
and ideally `metaAdSetId`. Without an ad set, insights fall back to the whole
account, which over-reports for a single campaign.

**Sync.**

```
POST /api/v1/ad-campaigns/{id}/sync/meta?dateRange=LAST_30_DAYS
```

### 2.3 Checking connection health

```
GET /api/v1/ad-campaigns/connections/status
```

```json
{
  "google": { "connected": true, "developerTokenConfigured": false },
  "meta":   { "connected": true, "tokenValid": true,
              "expiresAt": "2026-11-14T00:00:00.000Z",
              "pageTokenConfigured": true }
}
```

`developerTokenConfigured: false` is why a Google sync fails despite the
account showing as connected.

---

## What was broken, and what changed

| # | Problem | Effect | Fix |
|---|---|---|---|
| 1 | `setCredentials({refresh_token})` then reading `.access_token` | Google sync **always** failed with "Failed to refresh Google access token" — `setCredentials` stores, it does not refresh | `getAccessToken()`, which performs the refresh |
| 2 | One module-level `oauth2Client` shared by all requests | Concurrent syncs overwrote each other's tokens; a sync could query the wrong account | A fresh client per call |
| 3 | Both syncs returned hardcoded zeroes | "Sync successful" changed no data | Real Ads API / Insights API calls, written to `spent` |
| 4 | Meta stored the short-lived token | Sync died ~1 hour after connecting | `fb_exchange_token` → ~60-day token |
| 5 | Meta redirect was `${FRONTEND_URL}/api/v1/...` | Frontend origin + backend path = 404; campaign and account flows used different paths | One `getRedirectUri()` |
| 6 | No frontend callback page existed | OAuth redirect had nowhere to land | `/ad-campaigns/callback/[platform]` |
| 7 | `client_secret` in the token-exchange **URL** | Secret leaked into proxy/access logs | POST body |
| 8 | `state` was a bare campaign id | Callback was forgeable (CSRF) | HMAC-signed, 10-minute expiry |
| 9 | Account callbacks returned tokens to the browser | Ad credentials in JS memory and response logs | Never returned |
| 10 | Google webhook validated against `META_WEBHOOK_VERIFY_TOKEN` | Cross-wired secrets between platforms | `GOOGLE_ADS_WEBHOOK_TOKEN` |
| 11 | `metaWebhookVerify` fell back to `'your-verify-token'` | Unconfigured deploys verified for anyone guessing the placeholder | Fails closed with 503 |
| 12 | `googleAuthCallback` wrote `refresh_token` unconditionally | A `null` on reconnect wiped a working token | Guarded, with a fix-it message |
| 13 | `googleOAuth.js` defaulted to `'your-google-client-id'` | Misconfiguration surfaced as a confusing API error | Deleted; throws a named error |

---

## Troubleshooting

**"DEVELOPER_TOKEN_NOT_APPROVED"** — your token only has Test access. Apply for
Basic in API Center.

**"Google did not return a refresh token"** — Google issues one only on first
consent. Revoke at
[myaccount.google.com/permissions](https://myaccount.google.com/permissions)
and connect again.

**"redirect_uri isn't an absolute URI"** — `META_REDIRECT_URI` does not match
the Meta dashboard exactly. Compare character by character.

**Meta webhook verification fails** — server not running, env var unset (503),
or the URL is not public HTTPS.

**Leads arrive with no name/phone** — `META_PAGE_ACCESS_TOKEN` is missing or
lacks `leads_retrieval`.

**Leads land in the wrong branch** — no AdCampaign matches the platform IDs, so
it fell through to the oldest active branch.

---

## Known gaps

- **Tokens are stored in plaintext** in `ad_campaigns`. Anyone with database
  read access can use them against the ad accounts. Encrypting at rest is a
  schema change and was left out of a bug-fix pass — worth doing before this
  handles more accounts.
- **Meta reconnection is manual** every ~60 days. Eliminating it means adding a
  Page-token selection step.
- **No automatic sync.** `cron.service.js` already exists and is the natural
  home for a nightly spend refresh.
- `src/controllers/upload-day-image.controller.js` has a duplicate-export
  syntax error. It is dead code — imported nowhere — and pre-existing, so it
  was left alone.
