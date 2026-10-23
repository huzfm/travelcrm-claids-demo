'use client';

/**
 * OAuth landing page for Google Ads and Meta Ads.
 *
 * Google and Meta redirect the browser back here with ?code=...&state=...
 * after the admin approves access. The code is single-use and short-lived, so
 * this page immediately hands it to the backend, which performs the token
 * exchange server-side. The code never becomes a stored credential in the
 * browser and the client secret never leaves the server.
 *
 * Both platforms must have THIS url registered as an allowed redirect:
 *   <FRONTEND_URL>/ad-campaigns/callback/google
 *   <FRONTEND_URL>/ad-campaigns/callback/meta
 */

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { useConnectGoogleAccount, useConnectMetaAccount } from '@/hooks/useAdCampaigns';

type Status = 'working' | 'done' | 'error';

const PLATFORM_LABEL: Record<string, string> = {
  google: 'Google Ads',
  meta: 'Meta Ads',
};

/**
 * Everything wrong with the redirect itself is knowable from the URL alone, so
 * it is derived during render rather than assigned from inside an effect.
 * Only the token exchange - a genuine external call - moves state later.
 */
function readRedirect(searchParams: URLSearchParams, platform: string, label: string) {
  // Both providers report a refusal by redirecting here with an error param
  // rather than by failing the request.
  const denied =
    searchParams.get('error_description') ||
    searchParams.get('error_message') ||
    searchParams.get('error');

  if (denied) {
    return {
      error:
        denied === 'access_denied'
          ? `Access was declined, so ${label} was not connected.`
          : denied,
    };
  }

  if (platform !== 'google' && platform !== 'meta') {
    return { error: `Unknown platform "${platform}".` };
  }

  const code = searchParams.get('code');
  const state = searchParams.get('state');

  if (!code || !state) {
    return {
      error: 'The redirect did not include an authorization code. Start the connection again.',
    };
  }

  return { code, state, platform };
}

export default function AdOAuthCallbackPage() {
  const router = useRouter();
  const params = useParams<{ platform: string }>();
  const searchParams = useSearchParams();

  const platform = String(params.platform || '').toLowerCase();
  const label = PLATFORM_LABEL[platform] ?? 'Ad account';

  const connectGoogle = useConnectGoogleAccount();
  const connectMeta = useConnectMetaAccount();

  const redirect = readRedirect(new URLSearchParams(searchParams.toString()), platform, label);

  const [status, setStatus] = useState<Status>(redirect.error ? 'error' : 'working');
  const [message, setMessage] = useState(redirect.error ?? 'Finishing the connection…');

  // An authorization code can only be redeemed once. React mounts effects twice
  // in development, and without this guard the second attempt redeems an
  // already-used code and reports a failure over a connection that succeeded.
  const exchanged = useRef(false);

  useEffect(() => {
    if (exchanged.current) return;
    if (!redirect.code || !redirect.state) return;
    exchanged.current = true;

    const connect = redirect.platform === 'google' ? connectGoogle : connectMeta;

    connect
      .mutateAsync({ code: redirect.code, state: redirect.state })
      .then(() => {
        setStatus('done');
        setMessage(`${label} is connected. You can sync campaign data now.`);

        // The connect flow is usually opened in a popup. Facebook's login page
        // sends a Cross-Origin-Opener-Policy that can cut window.opener, so
        // announce on a same-origin channel instead - it works either way.
        try {
          const channel = new BroadcastChannel('ad-oauth');
          channel.postMessage({ type: 'ad-oauth-connected', platform });
          channel.close();
        } catch {
          // BroadcastChannel unsupported - the opener polls popup.closed too.
        }
        if (window.opener && window.opener !== window) {
          window.opener.postMessage({ type: 'ad-oauth-connected', platform }, window.origin);
        }

        // Close if we are a popup; if the browser refuses (full-page redirect),
        // the redirect below takes the user back instead.
        setTimeout(() => {
          window.close();
          router.replace('/ad-campaigns');
        }, 1200);
      })
      .catch((error: unknown) => {
        const err = error as { response?: { data?: { error?: string } } };
        setStatus('error');
        setMessage(err.response?.data?.error || `Could not connect ${label}.`);
      });
    // Runs once on mount - the authorization code is single-use.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-lg border border-border bg-card p-8 text-center">
        {status === 'working' && (
          <Loader2 className="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground" />
        )}
        {status === 'done' && <CheckCircle2 className="mx-auto mb-4 h-8 w-8 text-success" />}
        {status === 'error' && <XCircle className="mx-auto mb-4 h-8 w-8 text-destructive" />}

        <h1 className="mb-2 text-lg font-semibold text-foreground">
          {status === 'working' && `Connecting ${label}`}
          {status === 'done' && `${label} connected`}
          {status === 'error' && `Could not connect ${label}`}
        </h1>

        <p className="mb-6 text-sm leading-relaxed text-muted-foreground">{message}</p>

        {status !== 'working' && (
          <Button onClick={() => router.push('/ad-campaigns')} className="w-full">
            Back to connected apps
          </Button>
        )}
      </div>
    </div>
  );
}
