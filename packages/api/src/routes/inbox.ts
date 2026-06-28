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

import { Router as ExpressRouter } from 'express';
import type { Router } from 'express';
import { and, eq } from 'drizzle-orm';
import { getDb, getEnv, outreachEvents } from '@outreachos/shared';
import { requireAuth, assertOwnership } from '../middleware/auth.js';

export function inboxRouter(): Router {
  const router = ExpressRouter();
  const env = getEnv();

  function db() {
    return getDb(env.NEXT_PUBLIC_SUPABASE_URL);
  }

  router.use(requireAuth);

  router.get('/messages', async (req, res) => {
    const rows = await db()
      .select()
      .from(outreachEvents)
      .where(
        and(
          eq(outreachEvents.userId, req.user.id),
          eq(outreachEvents.eventType, 'reply_received'),
        ),
      );
    res.json({ success: true, data: rows });
  });

  router.get('/messages/:id', async (req, res) => {
    const [event] = await db()
      .select()
      .from(outreachEvents)
      .where(eq(outreachEvents.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(event, req.user.id, res)) return;
    res.json({ success: true, data: event });
  });

  router.post('/messages/:id/reply', async (req, res) => {
    const [event] = await db()
      .select()
      .from(outreachEvents)
      .where(eq(outreachEvents.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(event, req.user.id, res)) return;
    res.json({ success: true, data: { message: 'Reply job enqueued.' } });
  });

  router.post('/messages/:id/classify', async (req, res) => {
    const [event] = await db()
      .select()
      .from(outreachEvents)
      .where(eq(outreachEvents.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(event, req.user.id, res)) return;
    res.json({ success: true, data: { message: 'Classification job enqueued.' } });
  });

  router.get('/hot-leads', async (req, res) => {
    const rows = await db()
      .select()
      .from(outreachEvents)
      .where(
        and(
          eq(outreachEvents.userId, req.user.id),
          eq(outreachEvents.eventType, 'reply_received'),
        ),
      );
    const hotLeads = rows.filter(
      (r) =>
        (r.metadata as Record<string, unknown> | null)?.['intent'] === 'interested',
    );
    res.json({ success: true, data: hotLeads });
  });

  return router;
}
