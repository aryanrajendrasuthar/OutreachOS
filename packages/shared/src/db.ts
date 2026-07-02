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

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema.js';

let _pool: Pool | null = null;

export function getPool(connectionString: string): Pool {
  if (!_pool) {
    const ssl = process.env['NODE_ENV'] === 'production' ? { rejectUnauthorized: false } : false;
    _pool = new Pool({ connectionString, ssl });
  }
  return _pool;
}

export function getDb(connectionString: string) {
  return drizzle(getPool(connectionString), { schema });
}

export type Db = ReturnType<typeof getDb>;
