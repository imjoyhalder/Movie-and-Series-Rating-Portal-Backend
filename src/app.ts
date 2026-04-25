import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { toNodeHandler } from 'better-auth/node';
import { env } from './config/env.js';
import { auth } from './config/auth.js';
import { errorHandler } from './middleware/error.middleware.js';
import { notFoundHandler } from './middleware/notFound.middleware.js';
import apiRoutes from './routes/index.js';

const app: Application = express();

app.use(helmet());
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// Better Auth handles all /api/auth/* routes — must be BEFORE express.json()
// because Better Auth parses its own request bodies.
const betterAuthHandler = toNodeHandler(auth);
app.use((req: Request, res: Response, next) => {
  if (req.path.startsWith('/api/auth')) {
    return betterAuthHandler(req, res);
  }
  return next();
});


app.use('/api/payments/webhook',
  express.raw({
    type: 'application/json'
  }));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.get('/health',
  (_req: Request, res: Response) => {
    res.status(200)
      .json({ status: 'ok', timestamp: new Date().toISOString() });
  });

// All domain API routes — /api prefix applied once here
app.use('/api', apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
