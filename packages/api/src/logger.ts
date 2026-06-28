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

import pino from 'pino';

export const logger = pino({
  level: process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
  transport:
    process.env['NODE_ENV'] !== 'production'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
      'body.password',
      'body.linkedinSessionCookie',
      'body.totpSecret',
    ],
    censor: '[REDACTED]',
  },
});
