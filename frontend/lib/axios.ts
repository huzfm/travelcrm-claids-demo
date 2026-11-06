import axios from 'axios';

// Direct backend URL - no proxy needed
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'https://claids-travel-crm-web.boi7rl.easypanel.host/api/v1';

export const api = axios.create({
  baseURL: BASE_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 30000,
  withCredentials: true,
});

/** Dispatched on `window` the moment a session is found to be dead. */
export const SESSION_EXPIRED_EVENT = 'crm:session-expired';

export type SessionEndReason = 'expired' | 'revoked';

// Endpoints that work without (or in spite of) an access token. They must never
// trigger a refresh or a forced logout, or a failed sign-in would bounce the
// login page onto itself.
const PUBLIC_AUTH_PATHS = [
  '/auth/login',
  '/auth/refresh',
  '/auth/verify-login-otp',
  '/auth/resend-login-otp',
  '/auth/forgot-password',
  '/auth/verify-otp',
  '/auth/reset-password',
];

function isPublicAuthRequest(url?: string) {
  if (!url) return false;
  return PUBLIC_AUTH_PATHS.some(path => url.includes(path));
}

let accessToken: string | null = null;

export function setToken(token: string | null) {
  accessToken = token;
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem('crm_token', token);
  else localStorage.removeItem('crm_token');
}

export function getToken() {
  return accessToken;
}

function decodeJwtExp(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const parsed = JSON.parse(json);
    return typeof parsed.exp === 'number' ? parsed.exp : null;
  } catch {
    return null;
  }
}

/**
 * True when the token is past `exp` (optionally `skewSeconds` early). A token we
 * cannot read is treated as dead: it is never going to be accepted either.
 */
export function isTokenExpired(token: string | null, skewSeconds = 0): boolean {
  if (!token) return true;
  const exp = decodeJwtExp(token);
  if (exp === null) return true;
  return exp - Math.floor(Date.now() / 1000) <= skewSeconds;
}

let loggingOut = false;

/**
 * End the session now. Clears the token everywhere, tells the React tree, and
 * sends the browser to the login page. A hard navigation is deliberate: it
 * tears down every in-flight query so the user never sees a half-loaded page
 * full of "failed to load" errors behind a session that no longer exists.
 */
export function forceLogout(reason: SessionEndReason = 'expired') {
  if (loggingOut) return;

  accessToken = null;
  if (typeof window === 'undefined') return;

  loggingOut = true;
  localStorage.removeItem('crm_token');
  localStorage.removeItem('crm_user');
  window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT, { detail: { reason } }));

  if (window.location.pathname.startsWith('/login')) {
    // Already where we want them; let the page keep working.
    loggingOut = false;
    return;
  }

  window.location.replace(`/login?session=${reason}`);
}

let refreshPromise: Promise<string | null> | null = null;

/** Exchanges the httpOnly refresh cookie for a new access token. */
export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = axios
    .post(`${BASE_URL}/auth/refresh`, null, { withCredentials: true })
    .then(res => {
      const token = res.data?.data?.accessToken ?? null;
      if (token) setToken(token);
      return token;
    })
    .catch(() => null)
    .finally(() => {
      refreshPromise = null;
    });
  return refreshPromise;
}

/**
 * Guarantees the in-memory token is usable, refreshing it when it is close to
 * expiry. Returns false — after forcing a logout — when the session is gone.
 * Call this before trusting a stored session (boot, tab focus, periodic check).
 */
export async function ensureValidSession(): Promise<boolean> {
  if (!accessToken) return false;
  if (!isTokenExpired(accessToken, 60)) return true;

  const fresh = await refreshAccessToken();
  if (fresh) return true;

  // The refresh cookie is missing, expired or revoked. If the access token is
  // already dead there is nothing left to authenticate with.
  if (isTokenExpired(accessToken)) {
    forceLogout('expired');
    return false;
  }
  return true;
}

api.interceptors.request.use(async config => {
  if (!accessToken || isPublicAuthRequest(config.url)) return config;

  // Refresh ahead of expiry so a long-lived page keeps working, and bail out
  // entirely when the session is unrecoverable rather than firing a request
  // that is certain to 401.
  if (isTokenExpired(accessToken, 60)) {
    const fresh = await refreshAccessToken();
    if (!fresh && isTokenExpired(accessToken)) {
      forceLogout('expired');
      throw new axios.CanceledError('Session expired');
    }
  }

  config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

api.interceptors.response.use(
  response => response,
  async error => {
    const originalRequest = error.config;

    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    // Sign-in, OTP and refresh failures belong to the caller's UI.
    if (isPublicAuthRequest(originalRequest.url)) {
      return Promise.reject(error);
    }

    if (originalRequest._retry) {
      // A freshly refreshed token was still rejected: the account or session
      // has been revoked server-side.
      forceLogout('revoked');
      return Promise.reject(error);
    }

    originalRequest._retry = true;
    const token = await refreshAccessToken();
    if (token) {
      originalRequest.headers.Authorization = `Bearer ${token}`;
      return api(originalRequest);
    }

    const code = error.response?.data?.code;
    forceLogout(code === 'ACCOUNT_DEACTIVATED' || code === 'SESSION_REVOKED' ? 'revoked' : 'expired');
    return Promise.reject(error);
  }
);

export default api;
