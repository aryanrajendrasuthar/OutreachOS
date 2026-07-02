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
import type { Redis } from 'ioredis';
import { Queue } from 'bullmq';
import { z } from 'zod';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb, getEnv, outreachEvents, sequences, messageTemplates, prospects } from '@outreachos/shared';
import { requireAuth, assertOwnership } from '../middleware/auth.js';

interface OutreachJobData {
  userId: string;
  prospectId: string;
  sequenceId: string;
  stepNumber: number;
  eventId: string;
  hitlApproved?: boolean;
}

type SequenceStep = {
  stepNumber: number;
  type: 'connection_request' | 'message' | 'follow_up';
  delayDays: number;
  templateId: string;
  condition?: string;
  skipIfReplied: boolean;
};

const STEP_TYPE_MAP: Record<string, 'connection_request' | 'welcome_message' | 'follow_up'> = {
  connection_request: 'connection_request',
  message: 'welcome_message',
  follow_up: 'follow_up',
};

export function outreachRouter(redis: Redis): Router {
  const router = ExpressRouter();
  const env = getEnv();
  const outreachQueue = new Queue<OutreachJobData>('outreach', { connection: redis });

  function db() {
    return getDb(env.DATABASE_URL!);
  }

  router.use(requireAuth);

  router.post('/enroll', async (req, res) => {
    const schema = z.object({
      prospectIds: z.array(z.string().uuid()).min(1),
      sequenceId: z.string().uuid(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const [seq] = await db()
      .select()
      .from(sequences)
      .where(eq(sequences.id, parsed.data.sequenceId))
      .limit(1);

    if (!assertOwnership(seq, req.user.id, res)) return;

    const steps = (seq.steps as SequenceStep[]) ?? [];
    const templateIds = [...new Set(steps.map((s) => s.templateId).filter(Boolean))];
    const templateRows = templateIds.length
      ? await db().select().from(messageTemplates).where(inArray(messageTemplates.id, templateIds))
      : [];
    const templateMap = Object.fromEntries(templateRows.map((t) => [t.id, t.body]));

    const now = new Date();
    const rows: (typeof outreachEvents.$inferInsert)[] = [];

    for (const prospectId of parsed.data.prospectIds) {
      for (const step of steps) {
        const scheduledAt = new Date(now);
        scheduledAt.setDate(scheduledAt.getDate() + step.delayDays);
        rows.push({
          prospectId,
          sequenceId: parsed.data.sequenceId,
          userId: req.user.id,
          eventType: STEP_TYPE_MAP[step.type] ?? 'connection_request',
          messageBody: templateMap[step.templateId] ?? null,
          status: 'pending',
          scheduledAt,
          metadata: { stepNumber: step.stepNumber, templateId: step.templateId },
        });
      }
    }

    if (rows.length === 0) {
      res.status(400).json({ success: false, error: 'Sequence has no steps.' });
      return;
    }

    const created = await db().insert(outreachEvents).values(rows).returning();
    res.status(201).json({ success: true, data: created, meta: { total: created.length } });
  });

  router.get('/queue', async (req, res) => {
    const rows = await db()
      .select({
        id: outreachEvents.id,
        userId: outreachEvents.userId,
        prospectId: outreachEvents.prospectId,
        sequenceId: outreachEvents.sequenceId,
        eventType: outreachEvents.eventType,
        status: outreachEvents.status,
        messageBody: outreachEvents.messageBody,
        scheduledAt: outreachEvents.scheduledAt,
        sentAt: outreachEvents.sentAt,
        aiGenerated: outreachEvents.aiGenerated,
        errorMessage: outreachEvents.errorMessage,
        metadata: outreachEvents.metadata,
        prospectName: prospects.fullName,
        prospectLinkedinUrl: prospects.linkedinUrl,
        prospectHeadline: prospects.headline,
      })
      .from(outreachEvents)
      .leftJoin(prospects, eq(outreachEvents.prospectId, prospects.id))
      .where(and(eq(outreachEvents.userId, req.user.id), eq(outreachEvents.status, 'pending')));
    res.json({ success: true, data: rows });
  });

  router.post('/approve/:eventId', async (req, res) => {
    const approveSchema = z.object({ messageBody: z.string().max(1000).optional() });
    const parsed = approveSchema.safeParse(req.body);
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

    const meta = (event.metadata ?? {}) as Record<string, unknown>;
    const stepNumber = typeof meta['stepNumber'] === 'number' ? meta['stepNumber'] : 1;

    const updatePayload: Record<string, unknown> = {
      status: 'sent',
      metadata: { ...(event.metadata as Record<string, unknown> ?? {}), hitlApproved: true },
    };
    if (parsed.data.messageBody) {
      updatePayload['messageBody'] = parsed.data.messageBody;
    }

    const [updated] = await db()
      .update(outreachEvents)
      .set(updatePayload)
      .where(eq(outreachEvents.id, event.id))
      .returning();

    await outreachQueue.add('send', {
      userId: req.user.id,
      prospectId: event.prospectId,
      sequenceId: event.sequenceId ?? '',
      stepNumber,
      eventId: event.id,
      hitlApproved: true,
    });

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
