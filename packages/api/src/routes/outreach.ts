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
import { z } from 'zod';
import { and, eq } from 'drizzle-orm';
import { getDb, getEnv, outreachEvents } from '@outreachos/shared';
import { requireAuth, assertOwnership } from '../middleware/auth.js';

export function outreachRouter(): Router {
  const router = ExpressRouter();
  const env = getEnv();

  function db() {
    return getDb(env.NEXT_PUBLIC_SUPABASE_URL);
  }

  router.use(requireAuth);

  router.get('/queue', async (req, res) => {
    const rows = await db()
      .select()
      .from(outreachEvents)
      .where(and(eq(outreachEvents.userId, req.user.id), eq(outreachEvents.status, 'pending')));
    res.json({ success: true, data: rows });
  });

  router.post('/approve/:eventId', async (req, res) => {
    const [event] = await db()
      .select()
      .from(outreachEvents)
      .where(eq(outreachEvents.id, req.params['eventId'] ?? ''))
      .limit(1);

    if (!assertOwnership(event, req.user.id, res)) return;
    if (event?.status !== 'pending') {
      res.status(409).json({ success: false, error: 'Event is not in pending state.' });
      return;
    }

    const [updated] = await db()
      .update(outreachEvents)
      .set({ status: 'sent', sentAt: new Date() })
      .where(eq(outreachEvents.id, req.params['eventId'] ?? ''))
      .returning();

    res.json({ success: true, data: updated });
  });

  router.post('/reject/:eventId', async (req, res) => {
    const schema = z.object({ reason: z.string().max(500).optional() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const [event] = await db()
      .select()
      .from(outreachEvents)
      .where(eq(outreachEvents.id, req.params['eventId'] ?? ''))
      .limit(1);

    if (!assertOwnership(event, req.user.id, res)) return;
    if (event?.status !== 'pending') {
      res.status(409).json({ success: false, error: 'Event is not in pending state.' });
      return;
    }

    const [updated] = await db()
      .update(outreachEvents)
      .set({
        status: 'skipped',
        errorMessage: parsed.data.reason ?? 'Rejected by user.',
        metadata: { ...((event.metadata as Record<string, unknown>) ?? {}), rejectedAt: new Date() },
      })
      .where(eq(outreachEvents.id, req.params['eventId'] ?? ''))
      .returning();

    res.json({ success: true, data: updated });
  });

  router.get('/history', async (req, res) => {
    const rows = await db()
      .select()
      .from(outreachEvents)
      .where(eq(outreachEvents.userId, req.user.id));
    res.json({ success: true, data: rows });
  });

  return router;
}
