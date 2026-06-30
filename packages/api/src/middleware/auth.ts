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
import type { NextFunction, Request, Response } from 'express';
import { getEnv, isDevBypassAuth } from '@outreachos/shared';
import { logger } from '../logger.js';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user: {
        id: string;
        email: string;
      };
    }
  }
}

// Fixed dev user injected when DEV_BYPASS_AUTH=true
const DEV_USER = {
  id: '00000000-0000-0000-0000-000000000001',
  email: 'dev@outreachos.local',
};

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (isDevBypassAuth()) {
    logger.warn('DEV_BYPASS_AUTH is enabled — skipping auth check. Never use in production.');
    req.user = DEV_USER;
    next();
    return;
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or invalid authorization header.' });
    return;
  }

  const token = authHeader.slice(7);
  const env = getEnv();

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    res.status(500).json({ success: false, error: 'Auth not configured.' });
    return;
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });

  const { data, error } = await supabase.auth.getUser();
  if (error ?? !data.user) {
    logger.warn({ error: error?.message }, 'Auth token validation failed');
    res.status(401).json({ success: false, error: 'Invalid or expired token.' });
    return;
  }

  req.user = { id: data.user.id, email: data.user.email ?? '' };
  next();
}

export function assertOwnership(
  resource: { userId: string | null } | null | undefined,
  userId: string,
  res: Response,
): boolean {
  if (!resource || resource.userId !== userId) {
    res.status(403).json({ success: false, error: 'Forbidden.' });
    return false;
  }
  return true;
}
