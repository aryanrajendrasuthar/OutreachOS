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
import { eq } from 'drizzle-orm';
import { getDb, getEnv, sequences } from '@outreachos/shared';
import { requireAuth, assertOwnership } from '../middleware/auth.js';

const sequenceStepSchema = z.object({
  stepNumber: z.number().int().min(1),
  type: z.enum(['connection_request', 'message', 'follow_up']),
  delayDays: z.number().int().min(0),
  templateId: z.string().uuid(),
  condition: z.enum(['always', 'if_no_reply', 'if_accepted']).optional(),
  skipIfReplied: z.boolean(),
});

const createSequenceSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  steps: z.array(sequenceStepSchema).min(1).max(20),
  isActive: z.boolean().default(true),
  targetCriteria: z.record(z.unknown()).optional(),
});

const updateSequenceSchema = createSequenceSchema.partial();

export function sequencesRouter(): Router {
  const router = ExpressRouter();
  const env = getEnv();

  function db() {
    return getDb(env.NEXT_PUBLIC_SUPABASE_URL);
  }

  router.use(requireAuth);

  router.get('/', async (req, res) => {
    const rows = await db()
      .select()
      .from(sequences)
      .where(eq(sequences.userId, req.user.id));
    res.json({ success: true, data: rows });
  });

  router.post('/', async (req, res) => {
    const parsed = createSequenceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const [sequence] = await db()
      .insert(sequences)
      .values({ ...parsed.data, userId: req.user.id })
      .returning();

    res.status(201).json({ success: true, data: sequence });
  });

  router.get('/:id', async (req, res) => {
    const [sequence] = await db()
      .select()
      .from(sequences)
      .where(eq(sequences.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(sequence, req.user.id, res)) return;
    res.json({ success: true, data: sequence });
  });

  router.patch('/:id', async (req, res) => {
    const parsed = updateSequenceSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const [existing] = await db()
      .select()
      .from(sequences)
      .where(eq(sequences.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(existing, req.user.id, res)) return;

    const [updated] = await db()
      .update(sequences)
      .set(parsed.data)
      .where(eq(sequences.id, req.params['id'] ?? ''))
      .returning();

    res.json({ success: true, data: updated });
  });

  router.delete('/:id', async (req, res) => {
    const [existing] = await db()
      .select()
      .from(sequences)
      .where(eq(sequences.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(existing, req.user.id, res)) return;

    await db()
      .delete(sequences)
      .where(eq(sequences.id, req.params['id'] ?? ''));

    res.json({ success: true });
  });

  router.post('/:id/start', async (req, res) => {
    const [existing] = await db()
      .select()
      .from(sequences)
      .where(eq(sequences.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(existing, req.user.id, res)) return;
    res.json({ success: true, data: { message: 'Sequence jobs enqueued.' } });
  });

  router.post('/:id/pause', async (req, res) => {
    const [existing] = await db()
      .select()
      .from(sequences)
      .where(eq(sequences.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(existing, req.user.id, res)) return;

    const [updated] = await db()
      .update(sequences)
      .set({ isActive: false })
      .where(eq(sequences.id, req.params['id'] ?? ''))
      .returning();

    res.json({ success: true, data: updated });
  });

  router.post('/:id/resume', async (req, res) => {
    const [existing] = await db()
      .select()
      .from(sequences)
      .where(eq(sequences.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(existing, req.user.id, res)) return;

    const [updated] = await db()
      .update(sequences)
      .set({ isActive: true })
      .where(eq(sequences.id, req.params['id'] ?? ''))
      .returning();

    res.json({ success: true, data: updated });
  });

  return router;
}
