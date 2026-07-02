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

import { createClient } from '@supabase/supabase-js';
import type { Router } from 'express';
import { Router as ExpressRouter } from 'express';
import type { Redis } from 'ioredis';
import { z } from 'zod';
import { eq } from 'drizzle-orm';
import { getEnv, isDevBypassAuth, getDb, users } from '@outreachos/shared';
import { LinkedInAutomationService } from '@outreachos/automation';
import { requireAuth } from '../middleware/auth.js';
import { createAuthRateLimiter } from '../middleware/security.js';
import { logger } from '../logger.js';

const DEV_USER = { id: '00000000-0000-0000-0000-000000000001', email: 'dev@outreachos.local' };
const DEV_TOKEN = 'dev-bypass-token';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(200),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export function authRouter(redis: Redis): Router {
  const router = ExpressRouter();
  const env = getEnv();
  const authLimiter = createAuthRateLimiter(redis);

  function getSupabaseAdmin() {
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SERVICE_ROLE_KEY!);
  }

  function getSupabaseAnon() {
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  }

  router.post('/signup', authLimiter, async (req, res) => {
    if (isDevBypassAuth()) {
      res.status(201).json({ success: true, data: { userId: DEV_USER.id } });
      return;
    }

    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }
    const { email, password, name } = parsed.data;

    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name },
    });

    if (error) {
      logger.warn({ error: error.message }, 'Signup failed');
      res.status(400).json({ success: false, error: error.message });
      return;
    }

    res.status(201).json({ success: true, data: { userId: data.user.id } });
  });

  router.post('/login', authLimiter, async (req, res) => {
    if (isDevBypassAuth()) {
      res.json({
        success: true,
        data: {
          accessToken: DEV_TOKEN,
          expiresAt: Math.floor(Date.now() / 1000) + 86400,
          user: { id: DEV_USER.id, email: DEV_USER.email, name: 'Dev User' },
        },
      });
      return;
    }

    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }
    const { email, password } = parsed.data;

    const supabase = getSupabaseAnon();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error ?? !data.session) {
      res.status(401).json({ success: false, error: 'Invalid credentials.' });
      return;
    }

    res.cookie('refresh_token', data.session.refresh_token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        accessToken: data.session.access_token,
        expiresAt: data.session.expires_at,
        user: { id: data.user.id, email: data.user.email, name: data.user.user_metadata['name'] },
      },
    });
  });

  router.post('/logout', requireAuth, async (req, res) => {
    if (!isDevBypassAuth()) {
      const supabase = getSupabaseAnon();
      await supabase.auth.signOut();
    }
    res.clearCookie('refresh_token');
    res.json({ success: true });
  });

  router.post('/refresh', authLimiter, async (req, res) => {
    if (isDevBypassAuth()) {
      res.json({
        success: true,
        data: {
          accessToken: DEV_TOKEN,
          expiresAt: Math.floor(Date.now() / 1000) + 86400,
        },
      });
      return;
    }

    const refreshToken = req.cookies['refresh_token'] as string | undefined;
    if (!refreshToken) {
      res.status(401).json({ success: false, error: 'No refresh token.' });
      return;
    }

    const supabase = getSupabaseAnon();
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });

    if (error ?? !data.session) {
      res.status(401).json({ success: false, error: 'Invalid refresh token.' });
      return;
    }

    res.cookie('refresh_token', data.session.refresh_token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      success: true,
      data: {
        accessToken: data.session.access_token,
        expiresAt: data.session.expires_at,
      },
    });
  });

  router.get('/me', requireAuth, async (req, res) => {
    const db = getDb(env.DATABASE_URL!);
    const [user] = await db
      .select({ id: users.id, email: users.email, dailyRequestCap: users.dailyRequestCap, hitlEnabled: users.hitlEnabled })
      .from(users)
      .where(eq(users.id, req.user.id))
      .limit(1);
    res.json({
      success: true,
      data: user ?? { id: req.user.id, email: req.user.email, dailyRequestCap: 20, hitlEnabled: true },
    });
  });

  router.patch('/settings', requireAuth, async (req, res) => {
    const schema = z.object({
      dailyRequestCap: z.number().int().min(1).max(50).optional(),
      hitlEnabled: z.boolean().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: parsed.error.flatten() });
      return;
    }
    const db = getDb(env.DATABASE_URL!);
    await db.update(users).set({ ...parsed.data, updatedAt: new Date() }).where(eq(users.id, req.user.id));
    logger.info({ userId: req.user.id, settings: parsed.data }, 'User settings updated');
    res.json({ success: true });
  });

  router.get('/linkedin-status', requireAuth, async (req, res) => {
    const automation = new LinkedInAutomationService(req.user.id);
    const connected = await automation.isSessionValid();
    res.json({ success: true, data: { connected } });
  });

  // Opens a real browser window so the user can log in to LinkedIn once.
  // Blocks until login completes (up to 5 min). Client should use a long timeout.
  router.post('/linkedin-setup', requireAuth, async (req, res) => {
    try {
      logger.info({ userId: req.user.id }, 'Starting LinkedIn session setup');
      // Set Express response timeout high enough for the user to log in
      res.setTimeout(310_000);
      await LinkedInAutomationService.setupSession(req.user.id);
      logger.info({ userId: req.user.id }, 'LinkedIn session setup complete');
      res.json({ success: true });
    } catch (err) {
      logger.error({ err, userId: req.user.id }, 'LinkedIn session setup failed');
      res.status(500).json({ success: false, error: 'Setup failed or timed out. Please try again.' });
    }
  });

  return router;
}
