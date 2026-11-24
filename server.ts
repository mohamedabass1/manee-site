import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { config } from './server/config.ts';
import { checkDbHealth, getDb } from './server/infrastructure/db.ts';
import { checkStorageWritable, ensureStorageRoot } from './server/infrastructure/storage.ts';
import { emailQueue } from './server/infrastructure/email.ts';
import { runSeeder } from './server/services/seederService.ts';
import { attachTraceId, globalErrorHandler } from './server/middleware/errorHandler.ts';
import { authRouter } from './server/routes/authRoutes.ts';
import { publicRouter } from './server/routes/publicRoutes.ts';
import { adminRouter } from './server/routes/adminRoutes.ts';
import { docsRouter } from './server/openapi.ts';

async function startServer(): Promise<void> {
  // Initialize DB, storage, seeder, and startup email recovery
  getDb();
  ensureStorageRoot();
  await runSeeder();
  emailQueue.recoverRecentPendingMessages();

  const app = express();

  // Reverse proxy support for accurate IP rate limiting and logging
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(attachTraceId);

  // Security headers (keep SPA embeddable in preview iframe; restrict framing on /api)
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    if (config.isProduction && req.secure) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000');
    }
    if (req.path.startsWith('/api/')) {
      res.setHeader('X-Frame-Options', 'DENY');
    }
    next();
  });

  // Strict CORS configuration (no wildcard * or arbitrary origin reflection)
  const appOrigin = (() => {
    try {
      return new URL(config.appUrl).origin;
    } catch {
      return '';
    }
  })();

  app.use((req, res, next) => {
    const requestHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').trim();
    const middleware = cors({
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (config.cors.allowedOrigins.length > 0) {
          callback(null, config.cors.allowedOrigins.includes(origin));
          return;
        }
        try {
          const parsed = new URL(origin);
          const sameHost = requestHost.length > 0 && parsed.host === requestHost;
          const matchesApp = appOrigin.length > 0 && parsed.origin === appOrigin;
          const isLocal =
            !config.isProduction &&
            (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1');
          callback(null, sameHost || matchesApp || isLocal);
        } catch {
          callback(null, false);
        }
      },
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });
    middleware(req, res, next);
  });

  app.use(express.json({ limit: '2mb' }));

  // Serve processed uploaded project images with 30-day cache and no directory listing
  app.use(
    '/uploads',
    express.static(config.storage.rootPath, {
      index: false,
      dotfiles: 'ignore',
      maxAge: '30d',
      setHeaders: (res) => {
        res.setHeader('Cache-Control', 'public, max-age=2592000');
        res.setHeader('X-Content-Type-Options', 'nosniff');
      },
    }),
  );

  // Health Check endpoint (DB + Storage write check, no auth, no sensitive details)
  app.get('/health', (_req, res) => {
    const dbOk = checkDbHealth();
    const storageOk = checkStorageWritable();
    const healthy = dbOk && storageOk;
    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'Healthy' : 'Unhealthy',
      checks: {
        database: dbOk ? 'Healthy' : 'Unhealthy',
        storage: storageOk ? 'Healthy' : 'Unhealthy',
      },
      timestampUtc: new Date().toISOString(),
    });
  });

  // OpenAPI / Swagger Docs
  if (config.swaggerEnabled) {
    app.use('/api', docsRouter);
  }

  // Versioned API v1 routes
  app.use('/api/v1/auth', authRouter);
  app.use('/api/v1/public', publicRouter);
  app.use('/api/v1/admin', adminRouter);

  // Unknown API routes -> 404 ProblemDetails
  app.use('/api', (_req, res) => {
    res.status(404).type('application/problem+json').json({
      type: 'https://tools.ietf.org/html/rfc7231#section-6.5.4',
      title: 'المسار غير موجود',
      status: 404,
      detail: 'نقطة النهاية المطلوبة غير موجودة.',
    });
  });

  // Mount Vite dev middleware in development or static dist in production
  if (!config.isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build artifacts not found.');
      }
    });
  }

  app.use(globalErrorHandler);

  app.listen(config.port, '0.0.0.0', () => {
    console.log(`MANEE | مَنيع server running on http://0.0.0.0:${config.port}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});
