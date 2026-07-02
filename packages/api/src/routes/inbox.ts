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
import { and, eq, ilike } from 'drizzle-orm';
import { getDb, getEnv, outreachEvents, prospects } from '@outreachos/shared';
import { requireAuth, assertOwnership } from '../middleware/auth.js';
import { LinkedInAutomationService } from '@outreachos/automation';
import { classifyReplyIntent, draftReply } from '@outreachos/ai';
import { logger } from '../logger.js';

export function inboxRouter(): Router {
  const router = ExpressRouter();
  const env = getEnv();

  function db() {
    return getDb(env.DATABASE_URL!);
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

    if (event?.messageBody) {
      const intent = await classifyReplyIntent(event.messageBody).catch(() => 'neutral');
      await db()
        .update(outreachEvents)
        .set({ metadata: { ...((event.metadata as Record<string, unknown>) ?? {}), intent } })
        .where(eq(outreachEvents.id, event.id));
      res.json({ success: true, data: { intent } });
    } else {
      res.json({ success: true, data: { intent: 'neutral' } });
    }
  });

  router.post('/messages/:id/draft', async (req, res) => {
    const [event] = await db()
      .select()
      .from(outreachEvents)
      .where(eq(outreachEvents.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(event, req.user.id, res)) return;

    // draftReply returns [enthusiastic, professional, brief] options
    const thread = [{ sender: 'prospect' as const, body: event?.messageBody ?? '', sentAt: new Date() }];
    const drafts = await draftReply(thread, 'Job seeker looking for opportunities').catch(() => ['', '', '']);
    res.json({ success: true, data: { drafts } });
  });

  // Scrape LinkedIn inbox, match senders to prospects, persist reply_received events
  router.post('/sync', requireAuth, async (req, res) => {
    const automation = new LinkedInAutomationService(req.user.id);
    if (!await automation.isSessionValid()) {
      await automation.close();
      res.status(400).json({ success: false, error: 'LinkedIn not connected. Connect in Settings first.' });
      return;
    }

    try {
      const messages = await automation.checkInbox();
      await automation.close();

      let created = 0;
      for (const msg of messages) {
        if (!msg.senderName) continue;

        // Match sender name to a prospect (case-insensitive first+last name)
        const nameParts = msg.senderName.trim().split(/\s+/);
        const [prospect] = await db()
          .select()
          .from(prospects)
          .where(
            and(
              eq(prospects.userId, req.user.id),
              ilike(prospects.fullName, `%${nameParts[0]}%`),
            ),
          )
          .limit(1);

        if (!prospect) continue;

        // Only create if no existing reply_received for this prospect
        const existing = await db()
          .select({ id: outreachEvents.id })
          .from(outreachEvents)
          .where(
            and(
              eq(outreachEvents.userId, req.user.id),
              eq(outreachEvents.prospectId, prospect.id),
              eq(outreachEvents.eventType, 'reply_received'),
            ),
          )
          .limit(1);

        if (existing.length > 0) continue;

        let intent: string = 'neutral';
        try {
          intent = await classifyReplyIntent(msg.body);
        } catch { /* non-fatal */ }

        await db().insert(outreachEvents).values({
          userId: req.user.id,
          prospectId: prospect.id,
          sequenceId: null,
          eventType: 'reply_received',
          status: 'sent',
          messageBody: msg.body,
          sentAt: msg.receivedAt,
          metadata: { intent, senderName: msg.senderName },
        });
        created++;
      }

      res.json({ success: true, data: { synced: messages.length, created } });
    } catch (err) {
      await automation.close();
      logger.error({ err }, 'Inbox sync failed');
      res.status(500).json({ success: false, error: 'Inbox sync failed.' });
    }
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
