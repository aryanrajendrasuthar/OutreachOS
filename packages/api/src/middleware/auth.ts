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
import { getEnv } from '@outreachos/shared';
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

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers['authorization'];
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or invalid authorization header.' });
    return;
  }

  const token = authHeader.slice(7);
  const env = getEnv();

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

/**
 * Asserts that the authenticated user owns the given resource.
 * Throws a 403 response if the ownership check fails.
 */
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
