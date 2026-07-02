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
import { and, count, eq, gte, sql } from 'drizzle-orm';
import { subDays } from 'date-fns';
import { analyticsSnapshots, getDb, getEnv, outreachEvents, messageTemplates } from '@outreachos/shared';
import { requireAuth } from '../middleware/auth.js';

export function analyticsRouter(): Router {
  const router = ExpressRouter();
  const env = getEnv();

  function db() {
    return getDb(env.DATABASE_URL!);
  }

  router.use(requireAuth);

  router.get('/overview', async (req, res) => {
    const since = subDays(new Date(), 30);
    const userId = req.user.id;
    const base = and(eq(outreachEvents.userId, userId), gte(outreachEvents.scheduledAt, since));

    const [requestsSent] = await db().select({ v: count() }).from(outreachEvents)
      .where(and(base, eq(outreachEvents.eventType, 'connection_request'), eq(outreachEvents.status, 'sent')));
    const [messagesSent] = await db().select({ v: count() }).from(outreachEvents)
      .where(and(base, eq(outreachEvents.eventType, 'welcome_message'), eq(outreachEvents.status, 'sent')));
    const [repliesReceived] = await db().select({ v: count() }).from(outreachEvents)
      .where(and(base, eq(outreachEvents.eventType, 'reply_received')));

    res.json({
      success: true,
      data: {
        requestsSent: Number(requestsSent?.v ?? 0),
        accepted: 0,
        messagesSent: Number(messagesSent?.v ?? 0),
        repliesReceived: Number(repliesReceived?.v ?? 0),
        positiveReplies: 0,
        interviewsBooked: 0,
      },
    });
  });

  router.get('/funnel', async (req, res) => {
    const since = subDays(new Date(), 30);
    const userId = req.user.id;
    const base = and(eq(outreachEvents.userId, userId), gte(outreachEvents.scheduledAt, since));

    const [sent] = await db().select({ v: count() }).from(outreachEvents)
      .where(and(base, eq(outreachEvents.eventType, 'connection_request'), eq(outreachEvents.status, 'sent')));
    const [replied] = await db().select({ v: count() }).from(outreachEvents)
      .where(and(base, eq(outreachEvents.eventType, 'reply_received')));

    res.json({
      success: true,
      data: {
        sent: Number(sent?.v ?? 0),
        accepted: 0,
        replied: Number(replied?.v ?? 0),
        interviews: 0,
      },
    });
  });

  router.get('/templates', async (req, res) => {
    const rows = await db()
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.userId, req.user.id));

    const withPerformance = rows.map((t) => ({ id: t.id, name: t.name, type: t.type, abVariant: t.abVariant, performance: t.performance }));
    res.json({ success: true, data: withPerformance });
  });

  router.get('/daily', async (req, res) => {
    const rows = await db()
      .select()
      .from(analyticsSnapshots)
      .where(
        sql`${analyticsSnapshots.userId} = ${req.user.id} AND ${analyticsSnapshots.date} >= ${subDays(new Date(), 30)}`,
      );
    res.json({ success: true, data: rows });
  });

  return router;
}
