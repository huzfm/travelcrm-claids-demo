'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/components/providers';
import { PageWrapper, PageHeader } from '@/components/layout/page-wrapper';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  useAdConnectionStatus,
  useGetGoogleAccountAuthUrl,
  useGetMetaAccountAuthUrl,
  useMetaConnection,
  useResubscribeMetaPage,
  useDisconnectMeta,
} from '@/hooks/useAdCampaigns';
import { CheckCircle, Link2, AlertTriangle, RefreshCw, Unplug, Loader2 } from 'lucide-react';

type Platform = 'GOOGLE' | 'META';

export default function ConnectedAppsPage() {
  const { user } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [connecting, setConnecting] = useState<Platform | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'ADMIN') router.replace('/dashboard');
  }, [user, router]);

  const { data: status } = useAdConnectionStatus();
  const { data: meta, isLoading: metaLoading } = useMetaConnection();
  const getGoogleAuthUrl = useGetGoogleAccountAuthUrl();
  const getMetaAuthUrl = useGetMetaAccountAuthUrl();
  const resubscribePage = useResubscribeMetaPage();
  const disconnectMeta = useDisconnectMeta();

  // The callback page announces success from the popup. BroadcastChannel is
  // the reliable path (Facebook can sever window.opener); postMessage is kept
  // as a fallback for browsers without it.
  useEffect(() => {
    const onConnected = (data: unknown) => {
      if ((data as { type?: string })?.type !== 'ad-oauth-connected') return;
      setConnecting(null);
      queryClient.invalidateQueries({ queryKey: ['meta-connection'] });
      queryClient.invalidateQueries({ queryKey: ['ad-connection-status'] });
    };

    const onMessage = (event: MessageEvent) => {
      if (event.origin === window.location.origin) onConnected(event.data);
    };
    window.addEventListener('message', onMessage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel('ad-oauth');
      channel.onmessage = event => onConnected(event.data);
    } catch {
      channel = null;
    }

    return () => {
      window.removeEventListener('message', onMessage);
      channel?.close();
    };
  }, [queryClient]);

  const handleConnect = async (platform: Platform) => {
    setConnecting(platform);

    // Browsers only allow a popup opened synchronously inside the click, so
    // open a blank one now and point it at the login page once the URL arrives.
    // Opening it after the await is what gets it silently blocked.
    const popup = openCenteredPopup();

    try {
      const mutation = platform === 'GOOGLE' ? getGoogleAuthUrl : getMetaAuthUrl;
      const result = await mutation.mutateAsync();
      if (!result?.url) throw new Error('No login URL returned');

      if (!popup || popup.closed) {
        // Popup blocker won anyway - fall back to a full-page redirect.
        window.location.href = result.url;
        return;
      }

      popup.location.href = result.url;

      // Closing the popup without finishing should re-enable the button.
      const timer = window.setInterval(() => {
        if (popup.closed) {
          window.clearInterval(timer);
          setConnecting(null);
          queryClient.invalidateQueries({ queryKey: ['meta-connection'] });
          queryClient.invalidateQueries({ queryKey: ['ad-connection-status'] });
        }
      }, 500);
    } catch (error) {
      popup?.close();
      const err = error as { response?: { data?: { error?: string } }; message?: string };
      toast.error(
        err.response?.data?.error || err.message || 'Could not start the connection. Try again.'
      );
      setConnecting(null);
    }
  };

  const handleDisconnect = () => {
    if (!confirmDisconnect) {
      setConfirmDisconnect(true);
      setTimeout(() => setConfirmDisconnect(false), 4000);
      return;
    }
    setConfirmDisconnect(false);
    disconnectMeta.mutate();
  };

  const pagesNeedingRetry = meta?.pages?.filter(p => !p.subscribed) ?? [];

  return (
    <PageWrapper>
      <PageHeader
        title="Connected Apps"
        description="Connect your ad accounts and new leads will appear in the CRM automatically"
      />

      <div className="grid gap-4 sm:gap-6 md:grid-cols-2 max-w-3xl">
        {/* ── Meta ─────────────────────────────── */}
        <PlatformCard
          name="Meta Ads"
          subtitle="Facebook & Instagram lead forms"
          letter="M"
          tone="blue"
          connected={Boolean(meta?.connected)}
        >
          {metaLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : meta?.connected ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Connected as <span className="font-medium text-foreground">{meta.userName}</span>
              </p>

              {!meta.tokenValid && (
                <Notice>Your Facebook login expired. Reconnect to keep everything working.</Notice>
              )}

              {meta.pages?.length === 0 && (
                <Notice>
                  No Facebook Page was selected. Reconnect and tick the Page your ads run on.
                </Notice>
              )}

              {pagesNeedingRetry.map(page => (
                <Notice key={page.pageId}>
                  {page.name} isn&apos;t sending leads yet.{' '}
                  {/* Meta's own reason - without it the fix (missing permission,
                      no full control of the Page, ...) is guesswork. */}
                  {page.subscribeError && (
                    <span className="block text-xs opacity-80">Meta says: {page.subscribeError}</span>
                  )}
                  <button
                    type="button"
                    className="underline font-medium"
                    disabled={resubscribePage.isPending}
                    onClick={() => resubscribePage.mutate(page.pageId)}
                  >
                    Try again
                  </button>
                </Notice>
              ))}

              {meta.pages && meta.pages.length > 0 && (
                <p className="text-xs text-muted-foreground">
                  Leads from{' '}
                  {meta.pages
                    .filter(p => p.subscribed)
                    .map(p => p.name)
                    .join(', ') || 'your Pages'}{' '}
                  arrive automatically.
                </p>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={() => handleConnect('META')}
                  disabled={connecting === 'META'}
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  Reconnect
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handleDisconnect}
                  disabled={disconnectMeta.isPending}
                >
                  <Unplug className="h-3.5 w-3.5 mr-1.5" />
                  {confirmDisconnect ? 'Click to confirm' : 'Disconnect'}
                </Button>
              </div>
            </div>
          ) : (
            <ConnectButton
              loading={connecting === 'META'}
              label="Continue with Facebook"
              onClick={() => handleConnect('META')}
            />
          )}
        </PlatformCard>

        {/* ── Google ───────────────────────────── */}
        <PlatformCard
          name="Google Ads"
          subtitle="Search & YouTube lead forms"
          letter="G"
          tone="red"
          connected={Boolean(status?.google?.connected)}
        >
          {status?.google?.connected ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Your Google Ads account is connected.</p>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => handleConnect('GOOGLE')}
                disabled={connecting === 'GOOGLE'}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                Reconnect
              </Button>
            </div>
          ) : (
            <ConnectButton
              loading={connecting === 'GOOGLE'}
              label="Continue with Google"
              onClick={() => handleConnect('GOOGLE')}
            />
          )}
        </PlatformCard>
      </div>
    </PageWrapper>
  );
}

function openCenteredPopup() {
  const width = 600;
  const height = 720;
  const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
  const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);
  return window.open(
    'about:blank',
    'ad-oauth',
    `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );
}

function PlatformCard({
  name,
  subtitle,
  letter,
  tone,
  connected,
  children,
}: {
  name: string;
  subtitle: string;
  letter: string;
  tone: 'blue' | 'red';
  connected: boolean;
  children: ReactNode;
}) {
  const toneClass =
    tone === 'blue'
      ? 'bg-neutral-500/20 border-neutral-500/30 text-neutral-400'
      : 'bg-red-500/20 border-red-500/30 text-red-400';

  return (
    <Card className={connected ? 'border-success/30 bg-success/5' : 'border-border bg-card'}>
      <CardContent className="p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div
            className={`h-11 w-11 rounded-xl border flex items-center justify-center shrink-0 ${toneClass}`}
          >
            <span className="font-bold text-lg">{letter}</span>
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-foreground">{name}</h3>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
          {connected && (
            <span className="flex items-center gap-1 text-xs font-medium text-success shrink-0">
              <CheckCircle className="h-3.5 w-3.5" />
              Connected
            </span>
          )}
        </div>
        {children}
      </CardContent>
    </Card>
  );
}

function ConnectButton({
  label,
  loading,
  onClick,
}: {
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <Button className="w-full" onClick={onClick} disabled={loading}>
      {loading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <Link2 className="h-4 w-4 mr-2" />
      )}
      {loading ? 'Waiting for login…' : label}
    </Button>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-warning">
      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-px" />
      <span>{children}</span>
    </p>
  );
}
