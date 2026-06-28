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

import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import request from 'supertest';

const mockGetUser = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock('drizzle-orm/postgres-js', () => ({ drizzle: vi.fn(() => ({})) }));
vi.mock('postgres', () => ({ default: vi.fn() }));

vi.mock('@outreachos/shared', () => ({
  getEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    DATABASE_URL: 'postgres://localhost/test',
    NODE_ENV: 'test',
  }),
  prospects: { userId: 'userId', id: 'id' },
  outreachEvents: { prospectId: 'prospectId' },
}));

vi.mock('../logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

vi.mock('../db.js', () => ({
  db: {
    select: mockSelect,
    insert: mockInsert,
    update: mockUpdate,
    delete: mockDelete,
  },
}));

const AUTHED_USER = { id: 'user-123', email: 'test@example.com' };

const PROSPECT_ROW = {
  id: 'prospect-1',
  userId: 'user-123',
  fullName: 'Jane Smith',
  linkedinUrl: 'https://linkedin.com/in/janesmith',
  headline: 'SWE at Acme',
  company: 'Acme Corp',
  seniorityLevel: 'mid',
  industry: 'Software',
  location: 'SF',
  status: 'not_contacted',
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeAuthMiddleware(userId: string) {
  return (
    req: express.Request,
    _res: express.Response,
    next: express.NextFunction,
  ) => {
    (req as unknown as Record<string, unknown>)['user'] = { id: userId };
    next();
  };
}

async function buildApp(userId = AUTHED_USER.id) {
  const { prospectsRouter } = await import('../routes/prospects.js');
  const app = express();
  app.use(express.json());
  app.use(makeAuthMiddleware(userId));
  app.use('/api/prospects', prospectsRouter());
  return app;
}

describe('GET /api/prospects', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it('returns 200 with an array of prospects', async () => {
    const chain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      offset: vi.fn().mockResolvedValue([PROSPECT_ROW]),
    };
    mockSelect.mockReturnValue(chain);
    const app = await buildApp();
    const res = await request(app).get('/api/prospects');
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
  });
});

describe('POST /api/prospects', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it('returns 201 with the new prospect', async () => {
    const insertChain = {
      values: vi.fn().mockReturnThis(),
      returning: vi.fn().mockResolvedValue([PROSPECT_ROW]),
    };
    mockInsert.mockReturnValue(insertChain);
    const app = await buildApp();
    const res = await request(app).post('/api/prospects').send({
      fullName: 'Jane Smith',
      linkedinUrl: 'https://linkedin.com/in/janesmith',
      headline: 'SWE at Acme',
      company: 'Acme Corp',
      seniorityLevel: 'mid',
      industry: 'Software',
      location: 'SF',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.fullName).toBe('Jane Smith');
  });

  it('returns 400 for missing required fields', async () => {
    const app = await buildApp();
    const res = await request(app).post('/api/prospects').send({ fullName: 'Jane' });
    expect(res.status).toBe(400);
  });
});

describe('PATCH /api/prospects/:id — IDOR protection', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it('returns 403 when prospect belongs to a different user', async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([{ ...PROSPECT_ROW, userId: 'other-user-999' }]),
    };
    mockSelect.mockReturnValue(selectChain);
    const app = await buildApp('user-123');
    const res = await request(app)
      .patch('/api/prospects/prospect-1')
      .send({ status: 'interested' });
    expect(res.status).toBe(403);
  });
});

describe('DELETE /api/prospects/:id — IDOR protection', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it('returns 404 when prospect does not exist', async () => {
    const selectChain = {
      from: vi.fn().mockReturnThis(),
      where: vi.fn().mockResolvedValue([]),
    };
    mockSelect.mockReturnValue(selectChain);
    const app = await buildApp();
    const res = await request(app).delete('/api/prospects/nonexistent-id');
    expect(res.status).toBe(404);
  });
});
