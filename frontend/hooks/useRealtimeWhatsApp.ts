'use client';

import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ensureValidSession, forceLogout, getToken } from '@/lib/axios';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://travelcrm-azeesbackend.boi7rl.easypanel.host/api/v1';

/**
 * Subscribe to the backend's SSE stream and invalidate the right React Query
 * queries when realtime events arrive. Mount this once in the WhatsApp
 * pages so the inbox and conversation both refresh on inbound messages and
 * status updates (blue ticks).
 */
export function useRealtimeWhatsApp() {
  const queryClient = useQueryClient();
  const sourceRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Per-run flag, not a shared ref: a remount (React StrictMode, page
    // switches) must not revive a connect() still awaiting from the old run —
    // that opened an EventSource nothing ever closed. Leaked streams each hold
    // one of the browser's 6 connections to the API, and once they're used up
    // every request (deleting a chat included) hangs.
    let stopped = false;

    const connect = async () => {
      if (stopped) return;

      // EventSource can't send Authorization headers, so we exchange the
      // access token for a short-lived SSE token first.
      if (!getToken()) {
        // Sign-in hasn't finished yet — try again shortly.
        scheduleReconnect();
        return;
      }

      // This request is a raw fetch, so it misses the axios interceptor that
      // refreshes and ends dead sessions. Do that check here instead, or an
      // expired token reconnects every 3s forever.
      const sessionOk = await ensureValidSession();
      if (stopped) return;
      if (!sessionOk) {
        stopped = true;
        return;
      }

      const accessToken = getToken();

      let sseToken: string;
      try {
        const res = await fetch(`${BASE_URL}/realtime/token`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        if (stopped) return;
        if (res.status === 401) {
          // The token was revoked between the check above and this call.
          stopped = true;
          forceLogout('revoked');
          return;
        }
        if (!res.ok) {
          scheduleReconnect();
          return;
        }
        const data = await res.json();
        if (stopped) return;
        sseToken = data?.data?.token;
        if (!sseToken) {
          scheduleReconnect();
          return;
        }
      } catch {
        scheduleReconnect();
        return;
      }

      sourceRef.current?.close();
      const source = new EventSource(
        `${BASE_URL}/realtime/stream?token=${encodeURIComponent(sseToken)}`
      );
      sourceRef.current = source;

      source.addEventListener('ready', () => {
        // Connected.
      });

      source.addEventListener('whatsapp:new_message', evt => {
        try {
          const data = JSON.parse((evt as MessageEvent).data);
          // Refresh the inbox (sorted/filtered version the user is on) and the
          // admin unified inbox.
          queryClient.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-admin-inbox'] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-unread-count'] });
          // If the user is currently looking at this conversation, refresh it too.
          if (data?.contactId) {
            queryClient.invalidateQueries({
              queryKey: ['whatsapp-conversation', data.contactId],
            });
            queryClient.invalidateQueries({
              queryKey: ['whatsapp-admin-conversation', data.contactId],
            });
          }
        } catch {
          /* ignore malformed payloads */
        }
      });

      source.addEventListener('whatsapp:status_update', evt => {
        try {
          const data = JSON.parse((evt as MessageEvent).data);
          // Only the active conversation query cares about status flips.
          if (data?.contactId) {
            queryClient.invalidateQueries({
              queryKey: ['whatsapp-conversation', data.contactId],
            });
            queryClient.invalidateQueries({
              queryKey: ['whatsapp-admin-conversation', data.contactId],
            });
          }
        } catch {
          /* ignore */
        }
      });

      // Deleted for everyone in WhatsApp: drop it from the chat and refresh the
      // inbox, whose preview may have pointed at it.
      source.addEventListener('whatsapp:message_deleted', evt => {
        try {
          const data = JSON.parse((evt as MessageEvent).data);
          queryClient.invalidateQueries({ queryKey: ['whatsapp-inbox'] });
          queryClient.invalidateQueries({ queryKey: ['whatsapp-admin-inbox'] });
          if (data?.contactId) {
            queryClient.invalidateQueries({
              queryKey: ['whatsapp-conversation', data.contactId],
            });
            queryClient.invalidateQueries({
              queryKey: ['whatsapp-admin-conversation', data.contactId],
            });
          }
        } catch {
          /* ignore */
        }
      });

      source.onerror = () => {
        source.close();
        sourceRef.current = null;
        scheduleReconnect();
      };
    };

    const scheduleReconnect = () => {
      if (stopped) return;
      if (reconnectTimerRef.current) return;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, 3000);
    };

    connect();

    return () => {
      stopped = true;
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      sourceRef.current?.close();
      sourceRef.current = null;
    };
  }, [queryClient]);
}
