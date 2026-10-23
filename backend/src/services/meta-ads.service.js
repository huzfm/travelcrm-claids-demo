/**
 * Meta (Facebook / Instagram) Lead Ads integration
 *
 * Meta's leadgen webhook does NOT contain the answers the user typed. It only
 * tells us a lead exists, via `leadgen_id`. The actual field values must be
 * fetched from the Graph API with a Page access token:
 *
 *   GET /v21.0/{leadgen_id}?access_token={page_token}
 *
 * See: https://developers.facebook.com/docs/marketing-api/guides/lead-ads/retrieving
 */

import crypto from 'crypto';
import prisma from '../config/prisma.js';

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v21.0';
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

/**
 * `access_token` plus its `appsecret_proof` for a Graph API call.
 *
 * With "Require App Secret" on in the app's Advanced settings, Meta rejects
 * every server call made with a user or Page token unless it also carries
 * HMAC-SHA256(token, app secret) - a leaked token alone is then useless.
 * Sending the proof is harmless when the setting is off, so it always goes.
 */
const tokenParams = accessToken => {
  const appSecret = process.env.META_APP_SECRET;
  if (!appSecret || !accessToken) return { access_token: accessToken };

  return {
    access_token: accessToken,
    appsecret_proof: crypto.createHmac('sha256', appSecret).update(accessToken).digest('hex'),
  };
};

/**
 * Verify Meta's X-Hub-Signature-256 header against the raw request body.
 *
 * Returns true only when the signature is present, well-formed, and matches.
 * Uses a timing-safe comparison.
 */
export const verifyMetaSignature = (rawBody, signatureHeader) => {
  const appSecret = process.env.META_APP_SECRET;

  if (!appSecret || !rawBody || !signatureHeader) return false;
  if (!signatureHeader.startsWith('sha256=')) return false;

  const expected = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex');
  const received = signatureHeader.slice('sha256='.length);

  // timingSafeEqual throws when lengths differ, so guard first.
  if (expected.length !== received.length) return false;

  try {
    return crypto.timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(received, 'hex'));
  } catch {
    return false;
  }
};

/**
 * Fetch a single lead's field data from the Graph API.
 *
 * `pageToken` comes from the MetaPage row the customer connected. The
 * META_PAGE_ACCESS_TOKEN env var is only a fallback for installs that were set
 * up before per-customer connections existed.
 *
 * Returns the raw Graph response, or null if it could not be retrieved.
 */
export const fetchLeadFromGraph = async (leadgenId, pageToken = process.env.META_PAGE_ACCESS_TOKEN) => {
  if (!pageToken) {
    console.error('[Meta] No page token for this lead - connect the Page first', leadgenId);
    return null;
  }

  const url = `${GRAPH_URL}/${leadgenId}?${new URLSearchParams(tokenParams(pageToken))}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      console.error(`[Meta] Graph API error for lead ${leadgenId}:`, data.error.message);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`[Meta] Failed to fetch lead ${leadgenId}:`, error.message);
    return null;
  }
};

/**
 * Meta returns answers as:
 *   field_data: [{ name: 'phone_number', values: ['+919876543210'] }, ...]
 *
 * Field names come from how the lead form was built, so we match on several
 * common spellings for each value we care about.
 */
const FIELD_ALIASES = {
  name: ['full_name', 'name', 'first_name'],
  lastName: ['last_name'],
  phone: ['phone_number', 'phone', 'mobile_number', 'mobile'],
  email: ['email', 'email_address'],
  destination: ['destination', 'destination_city', 'where_do_you_want_to_go'],
  travelMonth: ['travel_month', 'when_do_you_want_to_travel', 'preferred_date'],
  numberOfPax: ['number_of_pax', 'party_size', 'how_many_people', 'number_of_travellers'],
  budget: ['budget', 'trip_budget', 'travel_budget'],
  tripType: ['trip_type', 'travel_type'],
};

export const mapLeadFields = fieldData => {
  const answers = {};

  for (const field of fieldData || []) {
    if (!field?.name) continue;
    const value = Array.isArray(field.values) ? field.values[0] : field.values;
    if (value !== undefined && value !== null && value !== '') {
      answers[String(field.name).toLowerCase()] = String(value);
    }
  }

  const pick = keys => {
    for (const key of keys) {
      if (answers[key]) return answers[key];
    }
    return null;
  };

  const firstName = pick(FIELD_ALIASES.name);
  const lastName = pick(FIELD_ALIASES.lastName);
  const fullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  const rawBudget = pick(FIELD_ALIASES.budget);
  // Budgets often arrive as "50,000" or "₹50000+" - keep only the digits.
  const budgetDigits = rawBudget ? rawBudget.replace(/[^\d.]/g, '') : '';
  const budget = budgetDigits ? parseFloat(budgetDigits) : null;

  return {
    name: fullName || 'Meta Lead',
    phone: (pick(FIELD_ALIASES.phone) || '').replace(/\D/g, ''),
    email: pick(FIELD_ALIASES.email),
    destination: pick(FIELD_ALIASES.destination),
    travelMonth: pick(FIELD_ALIASES.travelMonth),
    numberOfPax: pick(FIELD_ALIASES.numberOfPax) || '1',
    budget: Number.isFinite(budget) ? budget : null,
    tripType: pick(FIELD_ALIASES.tripType),
  };
};

/**
 * Map Meta's numeric ad / adset / campaign IDs onto one of OUR AdCampaign rows.
 *
 * Meta's IDs are not our cuids, so we match them against the metaAdSetId /
 * metaAccountId columns the campaign was configured with. Returns null when no
 * campaign is configured for this ad - the lead is still imported, just unlinked.
 */
export const resolveCampaign = async (metaIds, branchId) => {
  const ids = metaIds.filter(Boolean).map(String);
  if (ids.length === 0) return null;

  return prisma.adCampaign.findFirst({
    where: {
      platform: 'META',
      ...(branchId && { branchId }),
      OR: [{ metaAdSetId: { in: ids } }, { metaAccountId: { in: ids } }],
    },
    select: { id: true, branchId: true },
  });
};

// ============================================================================
// OAuth
// ============================================================================

/**
 * The single source of truth for Meta's redirect URI.
 *
 * This has to be byte-identical in three places or the exchange fails with
 * "redirect_uri isn't an absolute URI":
 *   1. the consent URL we build
 *   2. the token exchange we POST
 *   3. the "Valid OAuth Redirect URIs" list in the Meta app dashboard
 *
 * The previous code built it from FRONTEND_URL but pointed at a BACKEND path
 * (`${FRONTEND_URL}/api/v1/ad-campaigns/meta/callback`), so it resolved to a
 * page that does not exist on the frontend. It also used one path for the
 * campaign flow and a different one for the account flow, so at most one of
 * them could ever match what was registered with Meta.
 */
export const getRedirectUri = () => {
  // Trimmed because a stray space or newline in the env value is invisible in
  // the dashboard but makes Meta reject the URI as "not whitelisted".
  const explicit = process.env.META_REDIRECT_URI?.trim();
  if (explicit) return explicit;

  const base = process.env.FRONTEND_URL?.trim();

  if (!base) {
    throw new Error('META_REDIRECT_URI (or FRONTEND_URL) must be set to use the Meta integration');
  }

  return `${base.replace(/\/$/, '')}/ad-campaigns/callback/meta`;
};

// pages_manage_metadata lets us subscribe the customer's Page to leadgen
// webhooks; pages_read_engagement + pages_manage_ads are what Meta requires
// for a page token to read lead answers; business_management exposes Pages
// and ad accounts owned through Business Manager rather than personally.
export const META_SCOPES = [
  'ads_read',
  'leads_retrieval',
  'pages_show_list',
  'pages_read_engagement',
  'pages_manage_metadata',
  'pages_manage_ads',
  'business_management',
];

/**
 * Build the consent URL an admin is sent to.
 */
export const buildAuthUrl = state => {
  const clientId = process.env.META_APP_ID;

  if (!clientId) {
    throw new Error('META_APP_ID must be set to use the Meta integration');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    state,
  });

  // Business-type apps using "Facebook Login for Business" define their
  // permissions in a Configuration in the dashboard and expect its config_id
  // instead of a scope list. Plain "Facebook Login" apps keep using scope.
  const configId = process.env.META_LOGIN_CONFIG_ID?.trim();
  if (configId) {
    params.set('config_id', configId);
  } else {
    params.set('scope', META_SCOPES.join(','));
  }

  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${params.toString()}`;
};

/**
 * Exchange an authorization code for a short-lived user access token.
 *
 * Sent as a POST body rather than a query string. The old implementation put
 * client_secret in the URL, where it lands in proxy logs, server access logs
 * and browser history.
 */
export const exchangeCodeForToken = async code => {
  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('META_APP_ID and META_APP_SECRET must be set to use the Meta integration');
  }

  const response = await fetch(`${GRAPH_URL}/oauth/access_token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: getRedirectUri(),
      code,
    }).toString(),
  });

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error.message || 'Meta rejected the authorization code');
  }

  return data;
};

/**
 * Trade a short-lived token for a long-lived one.
 *
 * This step was missing entirely. Meta's initial token expires in about an
 * hour, so a campaign connected at 09:00 stopped syncing at 10:00 with an
 * opaque error. The fb_exchange_token grant returns a token good for ~60 days.
 *
 * Note that 60 days is still finite: an admin has to reconnect roughly every
 * two months. There is no refresh-token concept for Meta user tokens; the only
 * way to get a genuinely non-expiring token is to exchange for a Page token,
 * which needs a Page selection step this app does not have yet.
 */
export const exchangeForLongLivedToken = async shortLivedToken => {
  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;

  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: clientId,
    client_secret: clientSecret,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`${GRAPH_URL}/oauth/access_token?${params.toString()}`);
  const data = await response.json();

  if (data.error) {
    // Fall back to the short-lived token rather than failing the whole connect -
    // a token that works for an hour beats no connection at all.
    console.error('[Meta] Long-lived token exchange failed:', data.error.message);
    return { access_token: shortLivedToken, expires_in: 3600, long_lived: false };
  }

  return { ...data, long_lived: true };
};

// ============================================================================
// Insights
// ============================================================================

/**
 * Meta wants ad account IDs prefixed with "act_".
 */
const normaliseAccountId = accountId => {
  const id = String(accountId || '').trim();
  if (!id) return '';
  return id.startsWith('act_') ? id : `act_${id.replace(/\D/g, '')}`;
};

const DATE_PRESETS = {
  TODAY: 'today',
  YESTERDAY: 'yesterday',
  LAST_7_DAYS: 'last_7d',
  LAST_14_DAYS: 'last_14d',
  LAST_30_DAYS: 'last_30d',
  THIS_MONTH: 'this_month',
  LAST_MONTH: 'last_month',
};

/**
 * Fetch spend / impressions / clicks / leads for an ad account or ad set.
 *
 * Returns null when Meta has no rows for the window, which is normal for a
 * campaign that has not started delivering yet.
 */
export const fetchInsights = async ({
  accessToken,
  accountId,
  adSetId,
  dateRange = 'LAST_30_DAYS',
}) => {
  if (!accessToken) {
    throw new Error('A Meta access token is required. The account may need to be reconnected.');
  }

  // An ad set gives per-campaign numbers; without one we fall back to the
  // whole account, which is the best available approximation.
  const target = adSetId ? String(adSetId).replace(/\D/g, '') : normaliseAccountId(accountId);

  if (!target) {
    throw new Error('A Meta ad account ID or ad set ID is required');
  }

  const params = new URLSearchParams({
    fields: 'spend,impressions,clicks,actions,account_currency',
    date_preset: DATE_PRESETS[dateRange] || DATE_PRESETS.LAST_30_DAYS,
    ...tokenParams(accessToken),
  });

  const response = await fetch(`${GRAPH_URL}/${target}/insights?${params.toString()}`);
  const body = await response.json();

  if (body.error) {
    throw new Error(body.error.message || 'Meta Insights API returned an error');
  }

  const row = body.data?.[0];
  if (!row) return null;

  // Lead counts arrive inside `actions`, keyed by action_type.
  const leadAction = (row.actions || []).find(action =>
    ['lead', 'onsite_conversion.lead_grouped', 'offsite_conversion.fb_pixel_lead'].includes(
      action.action_type
    )
  );

  return {
    accountId: target,
    spend: Number(parseFloat(row.spend || '0').toFixed(2)),
    currency: row.account_currency || null,
    impressions: Number(row.impressions || 0),
    clicks: Number(row.clicks || 0),
    leads: Number(leadAction?.value || 0),
    dateRange: DATE_PRESETS[dateRange] || DATE_PRESETS.LAST_30_DAYS,
  };
};

// ============================================================================
// Per-customer connection: who logged in, which Pages and ad accounts they own
// ============================================================================

const graphGet = async (path, { access_token, ...params }) => {
  const query = new URLSearchParams({ ...params, ...tokenParams(access_token) });
  const response = await fetch(`${GRAPH_URL}/${path}?${query.toString()}`);
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || `Meta Graph API error on ${path}`);
  return body;
};

/**
 * Follow Graph API cursor pagination until exhausted. Agencies routinely
 * manage more Pages than fit on one page of results.
 */
const graphGetAll = async (path, params, maxPages = 10) => {
  const rows = [];
  let body = await graphGet(path, { limit: '100', ...params });

  for (let i = 0; i < maxPages; i++) {
    rows.push(...(body.data || []));
    if (!body.paging?.next) break;
    // Meta's `next` links carry the token but not always the proof.
    const next = new URL(body.paging.next);
    if (!next.searchParams.has('appsecret_proof')) {
      const { appsecret_proof } = tokenParams(next.searchParams.get('access_token'));
      if (appsecret_proof) next.searchParams.set('appsecret_proof', appsecret_proof);
    }
    const response = await fetch(next);
    body = await response.json();
    if (body.error) throw new Error(body.error.message || `Meta Graph API error on ${path}`);
  }

  return rows;
};

export const fetchMe = accessToken => graphGet('me', { fields: 'id,name', access_token: accessToken });

/**
 * Pages the user manages, each with its own Page access token.
 *
 * Because the user token passed in is long-lived, the page tokens returned
 * here never expire - this is what lets leads keep flowing without the
 * customer reconnecting every 60 days.
 *
 * me/accounts alone is not enough. When the customer ticks only some of their
 * Pages on the Facebook Login for Business screen (rather than "all current
 * and future"), Meta grants those Pages - they appear in the token's
 * granular_scopes - yet me/accounts comes back empty, and the connection
 * looked like "no Page selected". Pages granted that way are fetched by id.
 */
export const listPages = async accessToken => {
  const [listed, grantedIds] = await Promise.all([
    graphGetAll('me/accounts', { fields: 'id,name,access_token,tasks', access_token: accessToken }),
    grantedPageIds(accessToken),
  ]);

  const known = new Set(listed.map(page => page.id));
  const missing = grantedIds.filter(id => !known.has(id));

  const fetched = await Promise.all(
    missing.map(id =>
      graphGet(id, { fields: 'id,name,access_token', access_token: accessToken }).catch(error => {
        console.error(`[Meta] Could not load granted page ${id}:`, error.message);
        return null;
      })
    )
  );

  // Without a Page token the Page can neither be subscribed nor read leads.
  return [...listed, ...fetched.filter(page => page?.access_token)];
};

// Page-level permissions only - business_management's target_ids are
// business portfolio ids, not Pages.
const PAGE_SCOPES = [
  'pages_show_list',
  'leads_retrieval',
  'pages_manage_metadata',
  'pages_read_engagement',
  'pages_manage_ads',
];

/**
 * Ids of the Pages this user token was granted, read from debug_token.
 */
const grantedPageIds = async accessToken => {
  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;
  if (!accessToken || !clientId || !clientSecret) return [];

  try {
    const body = await graphGet('debug_token', {
      input_token: accessToken,
      // debug_token is called with the app token, which takes no appsecret_proof.
      access_token: `${clientId}|${clientSecret}`,
    });

    const ids = (body.data?.granular_scopes || [])
      .filter(grant => PAGE_SCOPES.includes(grant.scope))
      .flatMap(grant => grant.target_ids || []);

    return [...new Set(ids.map(String))];
  } catch (error) {
    console.error('[Meta] Could not read granted pages from token:', error.message);
    return [];
  }
};

export const listAdAccounts = async accessToken => {
  const rows = await graphGetAll('me/adaccounts', {
    fields: 'id,account_id,name,currency,account_status',
    access_token: accessToken,
  });

  return rows.map(row => ({
    id: row.id,
    accountId: row.account_id,
    name: row.name,
    currency: row.currency,
    // 1 = ACTIVE; anything else is disabled, unsettled, closed etc.
    active: row.account_status === 1,
  }));
};

/**
 * Tell Meta to send this Page's new leads to our app's webhook.
 *
 * The app itself must also be subscribed to the `page` object's `leadgen`
 * field (once, in the App Dashboard) - this call only opts the Page in.
 */
export const subscribePageToLeadgen = async (pageId, pageToken) => {
  const response = await fetch(`${GRAPH_URL}/${pageId}/subscribed_apps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ subscribed_fields: 'leadgen', ...tokenParams(pageToken) }).toString(),
  });
  const body = await response.json();
  if (body.error) throw new Error(body.error.message || 'Meta refused the Page subscription');
  return Boolean(body.success);
};

export const unsubscribePage = async (pageId, pageToken) => {
  try {
    await fetch(
      `${GRAPH_URL}/${pageId}/subscribed_apps?${new URLSearchParams(tokenParams(pageToken))}`,
      { method: 'DELETE' }
    );
  } catch (error) {
    console.error(`[Meta] Failed to unsubscribe page ${pageId}:`, error.message);
  }
};

/**
 * Remove the app from the user's Facebook account entirely, so disconnecting
 * here is a real disconnect and not just forgetting the token on our side.
 */
export const revokeUserToken = async accessToken => {
  try {
    await fetch(`${GRAPH_URL}/me/permissions?${new URLSearchParams(tokenParams(accessToken))}`, {
      method: 'DELETE',
    });
  } catch (error) {
    console.error('[Meta] Failed to revoke user token:', error.message);
  }
};

/**
 * Everything that happens after the customer clicks "Continue" on Meta's
 * consent screen: store their token, discover their Pages and ad accounts,
 * and subscribe every Page to leadgen so leads start arriving with no further
 * setup on their side.
 *
 * A Page that fails to subscribe (usually missing the "Manage Page" task) is
 * stored with the error rather than failing the whole connection.
 */
export const saveConnection = async ({ branchId, userToken, connectedBy }) => {
  const [me, pages, adAccounts, tokenInfo] = await Promise.all([
    fetchMe(userToken),
    listPages(userToken),
    listAdAccounts(userToken).catch(error => {
      // No ads_read / no ad accounts should not block lead import.
      console.error('[Meta] Could not list ad accounts:', error.message);
      return [];
    }),
    inspectToken(userToken),
  ]);

  const connection = await prisma.metaConnection.upsert({
    where: { branchId },
    create: {
      branchId,
      metaUserId: me.id,
      metaUserName: me.name,
      accessToken: userToken,
      expiresAt: tokenInfo.expiresAt ? new Date(tokenInfo.expiresAt) : null,
      scopes: tokenInfo.scopes || [],
      adAccounts,
      connectedBy,
    },
    update: {
      metaUserId: me.id,
      metaUserName: me.name,
      accessToken: userToken,
      expiresAt: tokenInfo.expiresAt ? new Date(tokenInfo.expiresAt) : null,
      scopes: tokenInfo.scopes || [],
      adAccounts,
      connectedBy,
    },
  });

  const results = await Promise.all(
    pages.map(async page => {
      let subscribed = false;
      let subscribeError = null;

      try {
        subscribed = await subscribePageToLeadgen(page.id, page.access_token);
      } catch (error) {
        subscribeError = error.message;
        console.error(`[Meta] Could not subscribe page ${page.id}:`, error.message);
      }

      // page_id is unique: if another branch connected this Page earlier, the
      // most recent login takes it over, so each lead lands in exactly one branch.
      return prisma.metaPage.upsert({
        where: { pageId: page.id },
        create: {
          pageId: page.id,
          connectionId: connection.id,
          branchId,
          name: page.name,
          accessToken: page.access_token,
          subscribed,
          subscribeError,
        },
        update: {
          connectionId: connection.id,
          branchId,
          name: page.name,
          accessToken: page.access_token,
          subscribed,
          subscribeError,
        },
      });
    })
  );

  // Pages the user no longer grants us (they unticked them on the consent
  // screen) must stop importing.
  await prisma.metaPage.deleteMany({
    where: { connectionId: connection.id, pageId: { notIn: pages.map(p => p.id) } },
  });

  return { connection, pages: results, adAccounts };
};

/**
 * Resolve an incoming leadgen webhook to the Page that owns it.
 */
export const findPage = pageId =>
  pageId
    ? prisma.metaPage.findUnique({
        where: { pageId: String(pageId) },
        select: { pageId: true, branchId: true, accessToken: true },
      })
    : null;

/**
 * Confirm a stored token is still valid, and say when it expires.
 *
 * Lets the UI warn "reconnect needed" before a sync fails, instead of after.
 */
export const inspectToken = async accessToken => {
  const clientId = process.env.META_APP_ID;
  const clientSecret = process.env.META_APP_SECRET;

  if (!accessToken || !clientId || !clientSecret) return { valid: false };

  const params = new URLSearchParams({
    input_token: accessToken,
    access_token: `${clientId}|${clientSecret}`,
  });

  try {
    const response = await fetch(`${GRAPH_URL}/debug_token?${params.toString()}`);
    const body = await response.json();
    const data = body.data;

    if (!data) return { valid: false };

    return {
      valid: Boolean(data.is_valid),
      // expires_at of 0 means the token does not expire.
      expiresAt: data.expires_at ? new Date(data.expires_at * 1000).toISOString() : null,
      scopes: data.scopes || [],
    };
  } catch (error) {
    console.error('[Meta] Token inspection failed:', error.message);
    return { valid: false };
  }
};
