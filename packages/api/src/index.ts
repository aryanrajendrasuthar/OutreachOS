/**
 * OutreachOS — LinkedIn Management & Automation Platform
 * Copyright (c) 2026 Aryan Suthar. All Rights Reserved.
 *
 * PROPRIETARY AND CONFIDENTIAL
 * Unauthorized copying, distribution, modification, or use of this file,
 * via any medium, is strictly prohibited without the express written
 * permission of the copyright owner.
 *
 * For licensing inquiries: aryanrajendrasuthar@gmail.com
 */

import { getEnv } from '@outreachos/shared';
import cors from 'cors';
import express from 'express';
import { pinoHttp } from 'pino-http';
import { Redis } from 'ioredis';
import { logger } from './logger.js';
import { initSentry } from './sentry.js';
import { applySecurityMiddleware, createApiRateLimiter } from './middleware/security.js';
import { authRouter } from './routes/auth.js';
import { prospectsRouter } from './routes/prospects.js';
import { sequencesRouter } from './routes/sequences.js';
import { outreachRouter } from './routes/outreach.js';
import { inboxRouter } from './routes/inbox.js';
import { analyticsRouter } from './routes/analytics.js';
import { templatesRouter } from './routes/templates.js';

initSentry();
const env = getEnv();

const app = express();

const redis = new Redis(env.REDIS_URL, {
  password: env.REDIS_TOKEN,
  tls: env.NODE_ENV === 'production' ? {} : undefined,
});

applySecurityMiddleware(app);

app.use(
  cors({
    origin: env.NEXT_PUBLIC_APP_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
app.use(express.json({ limit: '1mb' }));
app.use(pinoHttp({ logger }));

const apiLimiter = createApiRateLimiter(redis);
app.use('/api', apiLimiter);

app.use('/api/auth', authRouter(redis));
app.use('/api/prospects', prospectsRouter());
app.use('/api/sequences', sequencesRouter());
app.use('/api/outreach', outreachRouter());
app.use('/api/inbox', inboxRouter());
app.use('/api/analytics', analyticsRouter());
app.use('/api/templates', templatesRouter());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((_req, res) => {
  res.status(404).json({ success: false, error: 'Not found.' });
});

app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    import('./sentry.js').then(({ captureException }) => {
      captureException(err);
    }).catch(() => undefined);
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({ success: false, error: 'Internal server error.' });
  },
);

app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'OutreachOS API server started');
});

export default app;
