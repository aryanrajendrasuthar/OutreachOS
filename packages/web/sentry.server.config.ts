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

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env['SENTRY_DSN'],
  tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
  beforeSend(event) {
    if (event.request?.headers?.['cookie']) event.request.headers['cookie'] = '[REDACTED]';
    if (event.request?.headers?.['authorization'])
      event.request.headers['authorization'] = '[REDACTED]';
    return event;
  },
});
