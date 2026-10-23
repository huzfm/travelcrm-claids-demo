/**
 * Google Ads integration
 *
 * Two separate concerns live here:
 *
 *   1. OAuth   - exchanging an authorization code for a refresh token, and
 *                turning that refresh token back into a short-lived access
 *                token when we need to call the API.
 *   2. Metrics - reading spend / impressions / clicks / conversions for a
 *                campaign via the Google Ads REST API.
 *
 * Calling the Ads API needs THREE things, not just OAuth:
 *   - an OAuth refresh token for a user with access to the account
 *   - GOOGLE_ADS_DEVELOPER_TOKEN, issued to your Google Ads manager account
 *   - the numeric customer ID of the account being queried
 *
 * Without a developer token the API returns 401 no matter how valid the OAuth
 * token is. That is the step most people miss.
 *
 * See: https://developers.google.com/google-ads/api/docs/rest/overview
 */

import { OAuth2Client } from 'google-auth-library';

const ADS_API_VERSION = process.env.GOOGLE_ADS_API_VERSION || 'v18';
const ADS_API_URL = `https://googleads.googleapis.com/${ADS_API_VERSION}`;

/**
 * Build a FRESH OAuth client per call.
 *
 * The previous implementation shared one module-level client across every
 * request and mutated it with setCredentials(). Two admins syncing two
 * different campaigns at the same time would overwrite each other's tokens,
 * and either could end up querying the wrong account. An OAuth client is
 * cheap; a per-call instance removes the shared mutable state entirely.
 */
export const createOAuthClient = () => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret) {
    throw new Error(
      'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set to use the Google integration'
    );
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
};

export const GOOGLE_ADS_SCOPES = ['https://www.googleapis.com/auth/adwords'];

/**
 * Generate the consent URL the admin is sent to.
 *
 * access_type=offline plus prompt=consent is what makes Google return a
 * refresh token. Without prompt=consent Google only issues one on the very
 * first authorization ever, so re-connecting an account silently yields no
 * refresh token and the integration appears to connect but never works.
 */
export const buildAuthUrl = state => {
  const client = createOAuthClient();

  return client.generateAuthUrl({
    access_type: 'offline',
    scope: GOOGLE_ADS_SCOPES,
    state,
    prompt: 'consent',
    include_granted_scopes: true,
  });
};

/**
 * Exchange an authorization code for tokens.
 */
export const exchangeCodeForTokens = async code => {
  const client = createOAuthClient();
  const { tokens } = await client.getToken(code);
  return tokens;
};

/**
 * Turn a stored refresh token into a usable access token.
 *
 * The bug this replaces: the old code called setCredentials({ refresh_token })
 * and then immediately read credentials.access_token off the client.
 * setCredentials only STORES what you hand it - it performs no network call -
 * so access_token was always undefined and every sync returned
 * "Failed to refresh Google access token". getAccessToken() is the call that
 * actually refreshes.
 */
export const getAccessToken = async refreshToken => {
  if (!refreshToken) return null;

  const client = createOAuthClient();
  client.setCredentials({ refresh_token: refreshToken });

  try {
    const { token } = await client.getAccessToken();
    return token || null;
  } catch (error) {
    // invalid_grant means the user revoked access or the token was never valid.
    const reason = error?.response?.data?.error || error.message;
    console.error('[Google Ads] Could not refresh access token:', reason);
    return null;
  }
};

/**
 * Google Ads customer IDs are shown as 123-456-7890 but the API wants 1234567890.
 */
const normaliseCustomerId = customerId => String(customerId || '').replace(/\D/g, '');

/**
 * Run a GAQL query against the Ads API.
 *
 * searchStream returns an array of chunks, each holding its own `results`
 * array, so the caller gets a flattened list.
 */
const searchStream = async ({ accessToken, customerId, query }) => {
  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;

  if (!developerToken) {
    throw new Error(
      'GOOGLE_ADS_DEVELOPER_TOKEN is not set. Apply for one in your Google Ads manager account under Tools > API Center.'
    );
  }

  const id = normaliseCustomerId(customerId);
  if (!id) throw new Error('A Google Ads customer ID is required');

  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'developer-token': developerToken,
    'Content-Type': 'application/json',
  };

  // Required when the authorised user reaches the account through a manager account.
  const loginCustomerId = normaliseCustomerId(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  if (loginCustomerId) headers['login-customer-id'] = loginCustomerId;

  const response = await fetch(`${ADS_API_URL}/customers/${id}/googleAds:searchStream`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query }),
  });

  const body = await response.json();

  if (!response.ok) {
    const detail =
      body?.error?.message ||
      body?.[0]?.error?.message ||
      `Google Ads API returned ${response.status}`;
    throw new Error(detail);
  }

  const chunks = Array.isArray(body) ? body : [body];
  return chunks.flatMap(chunk => chunk.results || []);
};

/**
 * Date ranges the Ads API accepts directly in GAQL.
 */
const DATE_RANGES = {
  TODAY: 'TODAY',
  YESTERDAY: 'YESTERDAY',
  LAST_7_DAYS: 'LAST_7_DAYS',
  LAST_14_DAYS: 'LAST_14_DAYS',
  LAST_30_DAYS: 'LAST_30_DAYS',
  THIS_MONTH: 'THIS_MONTH',
  LAST_MONTH: 'LAST_MONTH',
};

/**
 * Fetch performance metrics for one campaign.
 *
 * Returns null when the campaign has no rows in the window - a campaign that
 * exists but has not run yet is not an error.
 */
export const fetchCampaignMetrics = async ({
  refreshToken,
  customerId,
  campaignId,
  dateRange = 'LAST_30_DAYS',
}) => {
  const accessToken = await getAccessToken(refreshToken);

  if (!accessToken) {
    throw new Error(
      'Could not obtain a Google access token. The account may need to be reconnected.'
    );
  }

  const range = DATE_RANGES[dateRange] || DATE_RANGES.LAST_30_DAYS;
  const numericCampaignId = Number(String(campaignId).replace(/\D/g, ''));

  if (!Number.isFinite(numericCampaignId) || numericCampaignId <= 0) {
    throw new Error('A numeric Google Ads campaign ID is required');
  }

  const query = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      metrics.cost_micros,
      metrics.impressions,
      metrics.clicks,
      metrics.conversions
    FROM campaign
    WHERE campaign.id = ${numericCampaignId}
      AND segments.date DURING ${range}
  `.trim();

  const rows = await searchStream({ accessToken, customerId, query });

  if (rows.length === 0) return null;

  // One row per day in the range - sum them into a single figure.
  const totals = rows.reduce(
    (acc, row) => {
      const m = row.metrics || {};
      acc.costMicros += Number(m.costMicros || 0);
      acc.impressions += Number(m.impressions || 0);
      acc.clicks += Number(m.clicks || 0);
      acc.conversions += Number(m.conversions || 0);
      return acc;
    },
    { costMicros: 0, impressions: 0, clicks: 0, conversions: 0 }
  );

  const campaign = rows[0].campaign || {};

  return {
    campaignId: campaign.id ? String(campaign.id) : String(campaignId),
    campaignName: campaign.name || null,
    status: campaign.status || null,
    // Google reports money in micros: 1,000,000 micros = 1 unit of currency.
    spend: Number((totals.costMicros / 1000000).toFixed(2)),
    impressions: totals.impressions,
    clicks: totals.clicks,
    conversions: totals.conversions,
    dateRange: range,
  };
};

/**
 * List the ad accounts the authorised user can reach, so an admin can pick the
 * right customer ID instead of typing a ten-digit number from memory.
 */
export const listAccessibleCustomers = async refreshToken => {
  const accessToken = await getAccessToken(refreshToken);
  if (!accessToken) return [];

  const developerToken = process.env.GOOGLE_ADS_DEVELOPER_TOKEN;
  if (!developerToken) return [];

  const response = await fetch(`${ADS_API_URL}/customers:listAccessibleCustomers`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'developer-token': developerToken,
    },
  });

  if (!response.ok) return [];

  const body = await response.json();
  // Returns resource names like "customers/1234567890".
  return (body.resourceNames || []).map(name => name.split('/')[1]);
};
