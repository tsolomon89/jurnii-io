import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

const app = express();
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
const distDir = path.join(__dirname, 'dist');

// Load CJS handlers from booking and integrations
const availabilityHandler = require('./booking/api/v1/availability.js');
const bookingHostsHandler = require('./booking/api/v1/booking-hosts.js');
const submissionsStartHandler = require('./booking/api/v1/submissions/start.js');
const submissionsIdHandler = require('./booking/api/v1/submissions/[id].js');
const bookingsIndexHandler = require('./booking/api/v1/bookings/index.js');
const bookingsRescheduleHandler = require('./booking/api/v1/bookings/[id]/reschedule.js');
const bookingsStatusHandler = require('./booking/api/v1/bookings/[id]/status.js');
const bookingsIdIndexHandler = require('./booking/api/v1/bookings/[id]/index.js');
const jobsRunHandler = require('./booking/api/v1/internal/jobs/run.js');
const jobsRetentionHandler = require('./booking/api/v1/internal/jobs/retention.js');
const journeysResolveHandler = require('./booking/api/v1/internal/journeys/[id]/resolve.js');
const lemlistSyncHandler = require('./integrations/lemlist-zoho/handler.js');

// Security headers for API endpoints (matching vercel.json)
app.use('/api', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  next();
});

// JSON body parsing for API requests
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

/**
 * Adapter ensuring Express requests provide Vercel-compatible query params.
 * Dynamic path params (e.g. :id) are merged into req.query so handlers
 * reading req.query.id function identically to their Vercel serverless behavior.
 */
function wrapHandler(handler) {
  return async (req, res, next) => {
    try {
      if (req.params) {
        req.query = Object.assign({}, req.query || {}, req.params);
      }
      await handler(req, res);
    } catch (err) {
      next(err);
    }
  };
}

// Health check endpoint for Fly.io platform probes
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', uptime: process.uptime() });
});

// API Routes (matching vercel.json and booking endpoints)
app.all('/api/v1/availability', wrapHandler(availabilityHandler));
app.all('/api/v1/booking-hosts', wrapHandler(bookingHostsHandler));
app.all('/api/v1/submissions/start', wrapHandler(submissionsStartHandler));
app.all('/api/v1/submissions/:id', wrapHandler(submissionsIdHandler));
app.all('/api/v1/bookings', wrapHandler(bookingsIndexHandler));
app.all('/api/v1/bookings/:id/reschedule', wrapHandler(bookingsRescheduleHandler));
app.all('/api/v1/bookings/:id/status', wrapHandler(bookingsStatusHandler));
app.all('/api/v1/bookings/:id', wrapHandler(bookingsIdIndexHandler));
app.all('/api/v1/internal/jobs/run', wrapHandler(jobsRunHandler));
app.all('/api/v1/internal/jobs/retention', wrapHandler(jobsRetentionHandler));
app.all('/api/v1/internal/journeys/:id/resolve', wrapHandler(journeysResolveHandler));
app.all('/api/v1/internal/lemlist-sync', wrapHandler(lemlistSyncHandler));

// Explicit non-SPA routes (matching vercel.json rewrites)
app.get(['/admin-form', '/admin-form.html'], (req, res) => {
  const file = path.join(distDir, 'admin-form.html');
  if (fs.existsSync(file)) {
    return res.sendFile(file);
  }
  res.status(404).send('Not Found');
});

app.get('/manage.html', (req, res) => {
  const file = path.join(distDir, 'manage.html');
  if (fs.existsSync(file)) {
    return res.sendFile(file);
  }
  res.status(404).send('Not Found');
});

// Static assets from dist/
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir, {
    maxAge: '1h',
    index: false,
  }));
}

// SPA fallback for all remaining non-API GET routes
app.use((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return res.status(405).send('Method Not Allowed');
  }
  const indexHtml = path.join(distDir, 'index.html');
  if (fs.existsSync(indexHtml)) {
    return res.sendFile(indexHtml);
  }
  res.status(404).send('App build not found. Please run npm run build.');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[server.error]', err);
  if (!res.headersSent) {
    res.status(500).json({ error: 'internal_server_error', message: 'Internal Server Error' });
  }
});

const server = app.listen(PORT, HOST, () => {
  console.log(`[jurnii-web] Server listening on http://${HOST}:${PORT}`);
});

function gracefulShutdown(signal) {
  console.log(`[jurnii-web] Received ${signal}. Shutting down gracefully...`);
  server.close(() => {
    console.log('[jurnii-web] HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[jurnii-web] Forceful shutdown after timeout.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
