import express, { Application, Request, Response } from 'express';

let mainApp: Application | undefined;
let initError: string | undefined;

try {
  const { default: cors } = await import('cors');
  const { default: helmet } = await import('helmet');
  const { default: morgan } = await import('morgan');
  const { default: cookieParser } = await import('cookie-parser');
  const { toNodeHandler } = await import('better-auth/node');
  const { env } = await import('./config/env.js');
  const { auth } = await import('./config/auth.js');
  const { errorHandler } = await import('./middleware/error.middleware.js');
  const { notFoundHandler } = await import('./middleware/notFound.middleware.js');
  const { default: apiRoutes } = await import('./routes/index.js');

  // Explicit origins: FRONTEND_URL + any extras from CORS_ORIGINS env var
  const extraOrigins = env.CORS_ORIGINS
    ? env.CORS_ORIGINS.split(',').map((o) => o.trim()).filter(Boolean)
    : [];

  const allowedOrigins = [
    env.FRONTEND_URL,
    'http://localhost:3000',
    'http://localhost:3001',
    ...extraOrigins,
  ].filter(Boolean);

  // Wildcard pattern for common deployment platforms
  const deploymentPattern =
    /^https:\/\/.+\.(vercel\.app|railway\.app|onrender\.com|netlify\.app|up\.railway\.app)$/;

  console.log('[CORS] Allowed explicit origins:', allowedOrigins);

  const app = express();

  app.use(helmet());
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (Postman, curl, mobile apps, SSR)
        if (!origin) return callback(null, true);

        const isAllowed =
          allowedOrigins.includes(origin) ||
          deploymentPattern.test(origin);

        if (isAllowed) {
          callback(null, true);
        } else {
          console.warn('[CORS] Blocked origin:', origin);
          callback(new Error(`CORS: origin "${origin}" is not allowed`));
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
      exposedHeaders: ['Set-Cookie'],
    }),
  );
  app.use(cookieParser());
  app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // Better Auth handles all /api/auth/* routes — must be BEFORE express.json()
  // because Better Auth parses its own request bodies.
  app.all('/api/auth/*splat', toNodeHandler(auth));

  app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // All domain API routes — /api prefix applied once here
  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  mainApp = app;
} catch (err) {
  const e = err as Error;
  initError = `${e?.constructor?.name ?? 'Error'}: ${e?.message ?? String(err)}`;
  if (e?.stack) {
    initError += '\n' + e.stack.split('\n').slice(1, 5).join('\n');
  }
  console.error('[FATAL] App initialization failed:', err);
}

const app: Application = mainApp ?? (() => {
  const fallback = express();
  fallback.use((_req: Request, res: Response) => {
    res.status(500).json({
      error: 'Server initialization failed',
      detail: initError,
    });
  });
  return fallback;
})();

export default app;
