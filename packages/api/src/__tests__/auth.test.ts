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
import type { Redis } from 'ioredis';

const mockSignup = vi.fn();
const mockSignIn = vi.fn();
const mockSignOut = vi.fn();
const mockRefresh = vi.fn();
const mockGetUser = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    auth: {
      admin: { createUser: mockSignup },
      signInWithPassword: mockSignIn,
      signOut: mockSignOut,
      refreshSession: mockRefresh,
      getUser: mockGetUser,
    },
  })),
}));

vi.mock('@outreachos/shared', () => ({
  getEnv: () => ({
    NEXT_PUBLIC_SUPABASE_URL: 'https://test.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon-key',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    NODE_ENV: 'test',
  }),
}));

vi.mock('rate-limiter-flexible', () => ({
  RateLimiterRedis: vi.fn().mockImplementation(() => ({
    consume: vi.fn().mockResolvedValue({}),
  })),
}));

vi.mock('../logger.js', () => ({ logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

async function buildApp() {
  const { authRouter } = await import('../routes/auth.js');
  const app = express();
  app.use(express.json());
  const redis = {} as Redis;
  app.use('/api/auth', authRouter(redis));
  return app;
}

describe('POST /api/auth/signup', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it('returns 201 with userId on success', async () => {
    mockSignup.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null });
    const app = await buildApp();
    const res = await request(app).post('/api/auth/signup').send({
      email: 'test@example.com',
      password: 'password123',
      name: 'Test User',
    });
    expect(res.status).toBe(201);
    expect(res.body.data.userId).toBe('user-123');
  });

  it('returns 400 for invalid email', async () => {
    const app = await buildApp();
    const res = await request(app).post('/api/auth/signup').send({
      email: 'not-an-email',
      password: 'password123',
      name: 'Test',
    });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('returns 400 for password shorter than 8 chars', async () => {
    const app = await buildApp();
    const res = await request(app).post('/api/auth/signup').send({
      email: 'test@example.com',
      password: '123',
      name: 'Test',
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when Supabase returns an error', async () => {
    mockSignup.mockResolvedValue({ data: null, error: { message: 'Email already registered' } });
    const app = await buildApp();
    const res = await request(app).post('/api/auth/signup').send({
      email: 'existing@example.com',
      password: 'password123',
      name: 'Test',
    });
    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Email already registered');
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it('returns 200 with accessToken on valid credentials', async () => {
    mockSignIn.mockResolvedValue({
      data: {
        session: { access_token: 'token-abc', refresh_token: 'refresh-xyz', expires_at: 9999 },
        user: { id: 'u1', email: 'test@example.com', user_metadata: { name: 'Test' } },
      },
      error: null,
    });
    const app = await buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });
    expect(res.status).toBe(200);
    expect(res.body.data.accessToken).toBe('token-abc');
  });

  it('returns 401 on bad credentials', async () => {
    mockSignIn.mockResolvedValue({ data: { session: null }, error: { message: 'Invalid login credentials' } });
    const app = await buildApp();
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'wrongpass' });
    expect(res.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it('returns 401 without Authorization header', async () => {
    const app = await buildApp();
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns 200 with user id when token is valid', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-abc', email: 'me@example.com' } },
      error: null,
    });
    const app = await buildApp();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe('user-abc');
  });

  it('returns 401 when token validation fails', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: { message: 'expired' } });
    const app = await buildApp();
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer expired-token');
    expect(res.status).toBe(401);
  });
});
