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

import type { Application, NextFunction, Request, Response } from 'express';
import helmet from 'helmet';
import { RateLimiterRedis } from 'rate-limiter-flexible';
import type { Redis } from 'ioredis';
import { logger } from '../logger.js';

export function applySecurityMiddleware(app: Application): void {
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'"],
          imgSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"],
          fontSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameSrc: ["'none'"],
        },
      },
      hsts: { maxAge: 31_536_000, includeSubDomains: true, preload: true },
      frameguard: { action: 'deny' },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      permittedCrossDomainPolicies: false,
    }),
  );

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    next();
  });
}

export function createAuthRateLimiter(redis: Redis): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const limiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:auth',
    points: 10,
    duration: 900,
  });

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await limiter.consume(req.ip ?? 'unknown');
      next();
    } catch {
      logger.warn({ ip: req.ip }, 'Auth rate limit exceeded');
      res.status(429).json({ success: false, error: 'Too many requests. Try again later.' });
    }
  };
}

export function createApiRateLimiter(redis: Redis): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const limiter = new RateLimiterRedis({
    storeClient: redis,
    keyPrefix: 'rl:api',
    points: 300,
    duration: 60,
  });

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const key = (req as Request & { user?: { id: string } }).user?.id ?? req.ip ?? 'unknown';
    try {
      await limiter.consume(key);
      next();
    } catch {
      logger.warn({ key }, 'API rate limit exceeded');
      res.status(429).json({ success: false, error: 'Rate limit exceeded.' });
    }
  };
}
