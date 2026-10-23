import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { addClient, removeClient } from '../services/sse.service.js';

const router = Router();

/**
 * SSE stream endpoint for real-time notifications
 *
 * Client should connect via EventSource:
 * const eventSource = new EventSource('/api/v1/notifications/stream', {
 *   headers: { Authorization: `Bearer ${token}` }
 * });
 *
 * Event format:
 * data: {"type":"notification","data":{...},"timestamp":"..."}
 */
router.get('/stream', authenticate, (req, res) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

  // Send initial comment to establish connection
  res.write(': connected\n\n');

  // Add client to SSE service
  addClient(req.user.id, res);

  // Keep connection alive with periodic heartbeat
  const heartbeatInterval = setInterval(() => {
    try {
      res.write(': heartbeat\n\n');
    } catch {
      // Connection closed
      clearInterval(heartbeatInterval);
    }
  }, 30000); // Every 30 seconds

  // Handle client disconnect
  req.on('close', () => {
    clearInterval(heartbeatInterval);
    removeClient(req.user.id, res);
  });

  req.on('end', () => {
    clearInterval(heartbeatInterval);
    removeClient(req.user.id, res);
  });
});

export default router;
