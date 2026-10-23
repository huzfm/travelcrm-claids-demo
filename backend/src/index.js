import dns from 'dns';
import express from 'express';
import cors from 'cors';
import compression from 'compression';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Prefer IPv4 over IPv6/NAT64 for outbound requests (e.g. Evolution API) —
// avoids intermittent connect timeouts on networks where IPv6 routes are unreliable.
dns.setDefaultResultOrder('ipv4first');

import authRoutes from './routes/auth.routes.js';
import branchRoutes from './routes/branch.routes.js';
import userRoutes from './routes/user.routes.js';
import leadRoutes from './routes/lead.routes.js';
import followupRoutes from './routes/followup.routes.js';
import itineraryRoutes from './routes/itinerary.routes.js';
import flightRoutes from './routes/flight.routes.js';
import whatsappRoutes from './routes/whatsapp.routes.js';
import userWhatsAppRoutes from './routes/user-whatsapp.routes.js';
import webhookRoutes from './routes/webhooks.js';
import analyticsRoutes from './routes/analytics.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import auditRoutes from './routes/audit.routes.js';
import assignmentRoutes from './routes/assignment.routes.js';
import whatsappTemplateRoutes from './routes/whatsappTemplate.routes.js';
import adCampaignRoutes from './routes/adCampaign.routes.js';
import hotelRoutes from './routes/hotel.routes.js';
import vehicleRoutes from './routes/vehicle.routes.js';
import tripRoutes from './routes/trip.routes.js';
import destinationRoutes from './routes/destination.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import realtimeRoutes from './routes/realtime.routes.js';
import whatsappWebhookRoutes from './routes/whatsapp-webhook.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import searchRoutes from './routes/search.routes.js';

import { startCronJobs } from './services/cron.service.js';
import { checkConnection } from './config/db.js';
import { apiRateLimiter } from './middleware/rateLimit.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();

// Deployed behind one reverse proxy (Easypanel/Traefik): trust its
// X-Forwarded-For so req.ip is the real client, not the proxy — the IP-keyed
// rate limiters (login, OTP) otherwise lump every user together.
app.set('trust proxy', 1);
const PORT = process.env.PORT || 5000;

const uploadsDir = path.join(__dirname, '..', 'uploads');
const itinerariesDir = path.join(uploadsDir, 'itineraries');
const leadsDir = path.join(uploadsDir, 'leads');
const whatsappDir = path.join(uploadsDir, 'whatsapp');
const hotelsDir = path.join(uploadsDir, 'hotels');

[uploadsDir, itinerariesDir, leadsDir, whatsappDir, hotelsDir].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`Created directory: ${dir}`);
  }
});

// Standard security headers (nosniff, HSTS, frame protection, …).
// - crossOriginResourcePolicy: the frontend runs on another origin and loads
//   /uploads images and files from here, which the default 'same-origin' blocks.
// - contentSecurityPolicy: off — this server returns JSON and uploaded files,
//   not a web page, and a CSP on uploaded PDFs can break browser PDF viewers.
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

app.use(
  compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) return false;
      return compression.filter(req, res);
    },
  })
);

app.use(
  cors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://crm.tripoday.com',
    ],
    credentials: true,
  })
);
app.use(
  express.json({
    // Document/media messages (WhatsApp send-document, itinerary PDF share)
    // travel as base64 in the JSON body, which inflates the raw file size by
    // ~33% — 100mb gives real attachments (e.g. an image-heavy itinerary PDF)
    // enough headroom instead of failing with PayloadTooLargeError.
    limit: '100mb',
    // Keep the raw bytes around so webhook signatures (Meta's X-Hub-Signature-256)
    // can be verified against exactly what was sent.
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  })
);
app.use(express.urlencoded({ extended: true, limit: '100mb' }));
app.use(cookieParser());

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const userInfo = req.user ? ` | User: ${req.user.id} (${req.user.role})` : '';
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.path} | ${res.statusCode} | ${duration}ms${userInfo}`
    );
  });
  next();
});

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  });
});

// Root endpoint for basic health check
app.get('/', (_req, res) => {
  res.status(200).send('Travel Agency CRM Backend is running');
});

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/branches', apiRateLimiter, branchRoutes);
app.use('/api/v1/users', apiRateLimiter, userRoutes);
// The ad-platform lead webhooks (/leads/webhook/*) are unauthenticated server-
// to-server calls, so the limiter would key them all to Meta's/Google's IP and
// start answering 429 during a burst - Meta then retries and eventually
// disables the subscription. They authenticate by signature/key instead.
const PUBLIC_LEAD_WEBHOOKS = ['/webhook/meta', '/webhook/meta/verify', '/webhook/google'];
app.use(
  '/api/v1/leads',
  (req, res, next) =>
    PUBLIC_LEAD_WEBHOOKS.includes(req.path) ? next() : apiRateLimiter(req, res, next),
  leadRoutes
);
app.use('/api/v1/followups', apiRateLimiter, followupRoutes);
app.use('/api/v1/itineraries', apiRateLimiter, itineraryRoutes);
app.use('/api/v1/flights', apiRateLimiter, flightRoutes);
app.use('/api/v1/whatsapp', whatsappWebhookRoutes);
app.use('/api/v1/whatsapp', apiRateLimiter, whatsappRoutes);
app.use('/api/v1/whatsapp', userWhatsAppRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/analytics', apiRateLimiter, analyticsRoutes);
app.use('/api/v1/notifications', notificationsRoutes);
app.use('/api/v1/audit', apiRateLimiter, auditRoutes);
app.use('/api/v1/assignment-rules', apiRateLimiter, assignmentRoutes);
app.use('/api/v1/whatsapp/templates', apiRateLimiter, whatsappTemplateRoutes);
app.use('/api/v1/ad-campaigns', apiRateLimiter, adCampaignRoutes);
app.use('/api/v1/hotels', apiRateLimiter, hotelRoutes);
app.use('/api/v1/vehicles', apiRateLimiter, vehicleRoutes);
app.use('/api/v1/dashboard', apiRateLimiter, dashboardRoutes);
app.use('/api/v1/search', apiRateLimiter, searchRoutes);
app.use('/api/v1/trips', apiRateLimiter, tripRoutes);
app.use('/api/v1/destinations', apiRateLimiter, destinationRoutes);
app.use('/api/v1/uploads', uploadRoutes);
app.use('/api/v1/settings', apiRateLimiter, settingsRoutes);
app.use('/api/v1/realtime', realtimeRoutes);

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

app.use((err, _req, res, _next) => {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message,
    });
  }

  if (err.name === 'PrismaClientKnownRequestError') {
    return res.status(400).json({
      success: false,
      error: 'Database operation failed',
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Request payload too large',
    });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'File size too large',
    });
  }

  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
});

import prisma from './config/prisma.js';

const startServer = async () => {
  try {
    await checkConnection();
    startCronJobs();

    // Bind to all interfaces for Docker/container accessibility
    const HOST = process.env.HOST || '0.0.0.0';

    const server = app.listen(Number(PORT), HOST, () => {
      console.log('\n========================================');
      console.log('  Travel Agency CRM Backend');
      console.log('========================================');
      console.log(`  Server running on ${HOST}:${PORT}`);
      console.log(`  Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  Health check: http://localhost:${PORT}/api/v1/health`);
      console.log('========================================\n');
    });

    // Graceful shutdown - release database connections properly
    const shutdown = async signal => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      server.close(async () => {
        try {
          await prisma.$disconnect();
          console.log('Database connections closed.');
          process.exit(0);
        } catch (error) {
          console.error('Error during shutdown:', error);
          process.exit(1);
        }
      });
      // Force exit after 10 seconds
      setTimeout(() => process.exit(1), 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
