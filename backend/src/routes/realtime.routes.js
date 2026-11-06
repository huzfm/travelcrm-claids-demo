import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { scopeRoleOf } from '../config/roles.js';
import { addSubscriber, bumpSubscriber } from '../services/realtime.service.js';
import { getUserPermissions } from '../services/permission.service.js';

const router = Router();

/**
 * SSE stream used by the frontend to receive realtime WhatsApp events.
 * Auth is via a short-lived token in the query string because EventSource
 * cannot set custom headers from the browser.
 *
 * GET /api/v1/realtime/stream?token=<jwt>
 */
router.get('/stream', (req, res) => {
  const token = req.query.token;
  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }

  // SSE-friendly headers: no buffering, no compression, long-lived.
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.flushHeaders?.();
  res.write(`retry: 3000\n\n`);
  res.write(`event: ready\ndata: {"ok":true}\n\n`);

  const user = {
    id: decoded.id,
    role: scopeRoleOf(decoded.role),
    branchId: decoded.branchId,
  };

  const unsubscribe = addSubscriber(res, user);

  // The frontend pings every 20s to keep the connection fresh; mark it as alive.
  const pingInterval = setInterval(() => {
    try {
      res.write(`event: ping\ndata: ${JSON.stringify({ at: Date.now() })}\n\n`);
      bumpSubscriber(res);
    } catch {
      // Connection already closed; the close handler cleans up.
    }
  }, 20000);
  pingInterval.unref?.();

  req.on('close', () => {
    clearInterval(pingInterval);
    unsubscribe();
  });
});

/**
 * Helper endpoint: trade a Bearer access token for a short-lived SSE token.
 * The frontend calls this once after login, then opens the EventSource.
 */
router.post('/token', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const account = await getUserPermissions(decoded.id);
    if (!account || (decoded.tv ?? 0) !== account.tokenVersion) {
      return res.status(401).json({ success: false, error: 'Session revoked' });
    }
    // Re-sign the same payload; the only thing that changes is the audience tag.
    const sseToken = jwt.sign(
      { id: decoded.id, role: decoded.role, branchId: decoded.branchId, scope: 'sse' },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
    return res.json({ success: true, data: { token: sseToken } });
  } catch {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
});

export default router;
