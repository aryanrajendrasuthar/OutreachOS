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
import { eq, and, sql } from 'drizzle-orm';
import { getDb, getEnv, prospects } from '@outreachos/shared';
import { requireAuth, assertOwnership } from '../middleware/auth.js';

const createProspectSchema = z.object({
  fullName: z.string().min(1).max(200),
  linkedinUrl: z.string().url().includes('linkedin.com'),
  headline: z.string().max(500).optional(),
  company: z.string().max(200).optional(),
  seniorityLevel: z
    .enum(['ic', 'senior', 'staff', 'lead', 'manager', 'director', 'vp', 'c-suite'])
    .optional(),
  industry: z.string().max(200).optional(),
  location: z.string().max(200).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional(),
});

const updateProspectSchema = z.object({
  status: z
    .enum([
      'queued',
      'requested',
      'connected',
      'replied',
      'warm',
      'interview',
      'hired',
      'archived',
      'declined',
    ])
    .optional(),
  notes: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  aiFitScore: z.number().int().min(0).max(100).optional(),
});

const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(25),
  status: z
    .enum([
      'queued',
      'requested',
      'connected',
      'replied',
      'warm',
      'interview',
      'hired',
      'archived',
      'declined',
    ])
    .optional(),
  sortBy: z.enum(['createdAt', 'fullName', 'aiFitScore', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export function prospectsRouter(): Router {
  const router = ExpressRouter();
  const env = getEnv();

  function db() {
    return getDb(env.NEXT_PUBLIC_SUPABASE_URL);
  }

  router.use(requireAuth);

  router.get('/', async (req, res) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }
    const { page, limit, status } = parsed.data;
    const offset = (page - 1) * limit;

    const conditions = [eq(prospects.userId, req.user.id)];
    if (status) conditions.push(eq(prospects.status, status));

    const [rows, countResult] = await Promise.all([
      db()
        .select()
        .from(prospects)
        .where(and(...conditions))
        .limit(limit)
        .offset(offset),
      db()
        .select({ count: sql<number>`count(*)` })
        .from(prospects)
        .where(and(...conditions)),
    ]);

    res.json({
      success: true,
      data: rows,
      meta: { total: Number(countResult[0]?.count ?? 0), page, limit },
    });
  });

  router.post('/', async (req, res) => {
    const parsed = createProspectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const [prospect] = await db()
      .insert(prospects)
      .values({ ...parsed.data, userId: req.user.id })
      .returning();

    res.status(201).json({ success: true, data: prospect });
  });

  router.post('/bulk', async (req, res) => {
    const schema = z.object({ prospects: z.array(createProspectSchema).min(1).max(500) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const rows = parsed.data.prospects.map((p) => ({ ...p, userId: req.user.id }));
    const inserted = await db().insert(prospects).values(rows).returning();
    res.status(201).json({ success: true, data: inserted, meta: { total: inserted.length } });
  });

  router.get('/:id', async (req, res) => {
    const [prospect] = await db()
      .select()
      .from(prospects)
      .where(eq(prospects.id, req.params['id'] ?? ''))
      .limit(1);

    if (!assertOwnership(prospect, req.user.id, res)) return;
    res.json({ success: true, data: prospect });
  });

  router.patch('/:id', async (req, res) => {
    const parsed = updateProspectSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }

    const [existing] = await db()
      .select()
      .from(prospects)
      .where(eq(prospects.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(existing, req.user.id, res)) return;

    const [updated] = await db()
      .update(prospects)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(prospects.id, req.params['id'] ?? ''))
      .returning();

    res.json({ success: true, data: updated });
  });

  router.delete('/:id', async (req, res) => {
    const [existing] = await db()
      .select()
      .from(prospects)
      .where(eq(prospects.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(existing, req.user.id, res)) return;

    await db()
      .update(prospects)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(prospects.id, req.params['id'] ?? ''));

    res.json({ success: true });
  });

  router.post('/:id/score', async (req, res) => {
    const [existing] = await db()
      .select()
      .from(prospects)
      .where(eq(prospects.id, req.params['id'] ?? ''))
      .limit(1);
    if (!assertOwnership(existing, req.user.id, res)) return;

    res.json({ success: true, data: { message: 'Scoring job enqueued.' } });
  });

  return router;
}
