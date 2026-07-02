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

import { Redis } from 'ioredis';
import pino from 'pino';
import { Resend } from 'resend';
import { getEnv } from '@outreachos/shared';
import { createSequenceWorker, attachWorkerErrorHandlers } from './workers/sequenceWorker.js';

const logger = pino({ name: 'queue' });
const env = getEnv();

const redis = new Redis(env.REDIS_URL, {
  ...(env.REDIS_TOKEN ? { password: env.REDIS_TOKEN } : {}),
  tls: env.NODE_ENV === 'production' ? {} : undefined,
  maxRetriesPerRequest: null,
});

const resend = new Resend(env.RESEND_API_KEY);
const worker = createSequenceWorker(redis);
attachWorkerErrorHandlers(worker, resend, env.RESEND_FROM_EMAIL);

worker.on('ready', () => {
  logger.info('OutreachOS queue worker ready');
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down worker...');
  await worker.close();
  await redis.quit();
  process.exit(0);
});
