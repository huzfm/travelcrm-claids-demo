/**
 * In-process pub/sub for server-sent events.
 *
 * Why in-process: this CRM runs as a single Node process; we don't need Redis
 * to fan out. Each connected browser opens one EventSource stream and we
 * filter events for them based on role + branchId + userId.
 *
 * Event shape:
 *   { type: 'whatsapp:new_message' | 'whatsapp:status_update' | 'whatsapp:message_deleted', payload, audience }
 *
 * Audience is a hint we use to skip the per-subscriber match work cheaply.
 */

const subscribers = new Set(); // { res, user }

let heartbeatTimer = null;

function startHeartbeat() {
  if (heartbeatTimer) return;
  heartbeatTimer = setInterval(() => {
    const now = Date.now();
    for (const sub of subscribers) {
      // Close idle connections so the browser auto-reconnects.
      if (now - sub.lastSeen > 90000) {
        try {
          sub.res.end();
        } catch {
          // Ignore: socket already closed.
        }
        subscribers.delete(sub);
        continue;
      }
      try {
        sub.res.write(':heartbeat\n\n');
      } catch {
        // Ignore: socket already closed.
      }
    }
  }, 25000).unref();
}

/**
 * Register a new SSE subscriber. Returns an unsubscribe function.
 */
export function addSubscriber(res, user) {
  startHeartbeat();
  const sub = { res, user, lastSeen: Date.now() };
  subscribers.add(sub);
  return () => {
    try {
      res.end();
    } catch {
      // Ignore: socket already closed.
    }
    subscribers.delete(sub);
  };
}

/**
 * Mark a subscriber as still alive (called when the client sends its keepalive ping).
 */
export function bumpSubscriber(res) {
  for (const sub of subscribers) {
    if (sub.res === res) {
      sub.lastSeen = Date.now();
      return;
    }
  }
}

/**
 * Decide if a given user should receive a given event.
 *  - ADMIN: receives everything (so All WhatsApp updates in realtime)
 *  - MANAGER: only events for their branch
 *  - STAFF: only events for their own user-owned conversations
 */
function userCanReceive(user, audience) {
  if (!user) return false;
  if (user.role === 'ADMIN') return true;
  if (!audience) return false;
  if (audience.userId && audience.userId === user.id) return true;
  if (audience.branchId && audience.branchId === user.branchId && user.role === 'MANAGER') {
    return true;
  }
  return false;
}

/**
 * Publish an event to all matching subscribers.
 * The event is JSON-serialized once and SSE-framed into each response stream.
 */
export function publish(type, payload, audience = {}) {
  const frame = `event: ${type}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const sub of subscribers) {
    if (!userCanReceive(sub.user, audience)) continue;
    try {
      sub.res.write(frame);
      sub.lastSeen = Date.now();
    } catch {
      // Drop broken subscribers silently; the next heartbeat will clean up.
    }
  }
}

/**
 * Test/diagnostic helper. Not used in production code paths.
 */
export function subscriberCount() {
  return subscribers.size;
}
