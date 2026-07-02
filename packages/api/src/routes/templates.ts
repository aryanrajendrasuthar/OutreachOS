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
import { getDb, getEnv, messageTemplates } from '@outreachos/shared';
import { requireAuth, assertOwnership } from '../middleware/auth.js';

const createTemplateSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['connection_request', 'message', 'follow_up', 'reply']),
  body: z.string().min(1).max(5000),
  isDefault: z.boolean().default(false),
  abVariant: z.enum(['A', 'B']).optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

export function templatesRouter(): Router {
  const router = ExpressRouter();
  const env = getEnv();

  function db() {
    return getDb(env.DATABASE_URL!);
  }

  router.use(requireAuth);

  router.get('/', async (req, res) => {
    const rows = await db()
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.userId, req.user.id));
    res.json({ success: true, data: rows });
  });

  router.post('/', async (req, res) => {
    const parsed = createTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const [template] = await db()
      .insert(messageTemplates)
      .values({ ...parsed.data, userId: req.user.id })
      .returning();

    res.status(201).json({ success: true, data: template });
  });

  router.patch('/:id', async (req, res) => {
    const parsed = updateTemplateSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const [existing] = await db()
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(existing, req.user.id, res)) return;

    const [updated] = await db()
      .update(messageTemplates)
      .set(parsed.data)
      .where(eq(messageTemplates.id, req.params['id'] ?? ''))
      .returning();

    res.json({ success: true, data: updated });
  });

  router.delete('/:id', async (req, res) => {
    const [existing] = await db()
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(existing, req.user.id, res)) return;

    await db()
      .delete(messageTemplates)
      .where(eq(messageTemplates.id, req.params['id'] ?? ''));

    res.json({ success: true });
  });

  router.post('/:id/clone', async (req, res) => {
    const [existing] = await db()
      .select()
      .from(messageTemplates)
      .where(eq(messageTemplates.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(existing, req.user.id, res)) return;

    const [cloned] = await db()
      .insert(messageTemplates)
      .values({
        userId: req.user.id,
        name: `${existing.name} (Copy)`,
        type: existing.type,
        body: existing.body,
        isDefault: false,
        abVariant: undefined,
      })
      .returning();

    res.status(201).json({ success: true, data: cloned });
  });

  return router;
}
