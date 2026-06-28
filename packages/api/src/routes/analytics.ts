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
import { eq, gte, sql } from 'drizzle-orm';
import { subDays } from 'date-fns';
import { analyticsSnapshots, getDb, getEnv, outreachEvents, messageTemplates } from '@outreachos/shared';
import { requireAuth } from '../middleware/auth.js';

export function analyticsRouter(): Router {
  const router = ExpressRouter();
  const env = getEnv();

  function db() {
    return getDb(env.NEXT_PUBLIC_SUPABASE_URL);
  }

  router.use(requireAuth);

  router.get('/overview', async (req, res) => {
    const since = subDays(new Date(), 30);

    const [totals] = await db()
      .select({
        requestsSent: sql<number>`sum(requests_sent)`,
        accepted: sql<number>`sum(accepted)`,
        messagesSent: sql<number>`sum(messages_sent)`,
        repliesReceived: sql<number>`sum(replies_received)`,
        positiveReplies: sql<number>`sum(positive_replies)`,
        interviewsBooked: sql<number>`sum(interviews_booked)`,
      })
      .from(analyticsSnapshots)
      .where(
        sql`${analyticsSnapshots.userId} = ${req.user.id} AND ${analyticsSnapshots.date} >= ${since}`,
      );

    res.json({ success: true, data: totals });
  });

  router.get('/funnel', async (req, res) => {
    const since = subDays(new Date(), 30);

    const [funnel] = await db()
      .select({
        sent: sql<number>`sum(requests_sent)`,
        accepted: sql<number>`sum(accepted)`,
        replied: sql<number>`sum(replies_received)`,
        interviews: sql<number>`sum(interviews_booked)`,
      })
      .from(analyticsSnapshots)
      .where(
        sql`${analyticsSnapshots.userId} = ${req.user.id} AND ${analyticsSnapshots.date} >= ${since}`,
      );

    res.json({ success: true, data: funnel });
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
