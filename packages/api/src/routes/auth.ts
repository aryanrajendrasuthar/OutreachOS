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
import { getEnv } from '@outreachos/shared';
import { requireAuth } from '../middleware/auth.js';
import { createAuthRateLimiter } from '../middleware/security.js';
import { logger } from '../logger.js';

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
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  }

  function getSupabaseAnon() {
    return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
  }

  router.post('/signup', authLimiter, async (req, res) => {
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
    const supabase = getSupabaseAnon();
    await supabase.auth.signOut();
    res.clearCookie('refresh_token');
    res.json({ success: true });
  });

  router.post('/refresh', authLimiter, async (req, res) => {
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

  router.get('/me', requireAuth, (req, res) => {
    res.json({ success: true, data: { id: req.user.id, email: req.user.email } });
  });

  return router;
}
