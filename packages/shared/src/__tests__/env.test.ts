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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const VALID_ENV: Record<string, string> = {
  NODE_ENV: 'test',
  PORT: '3001',
  NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  NEXT_PUBLIC_API_URL: 'http://localhost:3001',
  NEXT_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key-value',
  REDIS_URL: 'redis://localhost:6379',
  REDIS_TOKEN: 'test-token',
  ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
  GROQ_API_KEY: 'gsk_test_key_value',
  RESEND_API_KEY: 're_test_key',
  RESEND_FROM_EMAIL: 'noreply@outreachos.com',
  JWT_SECRET: 'a'.repeat(32),
  SESSION_SECRET: 'b'.repeat(32),
};

describe('getEnv', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, VALID_ENV);
  });

  afterEach(() => {
    for (const key of Object.keys(VALID_ENV)) {
      delete process.env[key];
    }
  });

  it('returns parsed env for a fully valid environment', async () => {
    const { getEnv } = await import('../env.js');
    const env = getEnv();
    expect(env.PORT).toBe(3001);
    expect(env.NODE_ENV).toBe('test');
    expect(env.RESEND_FROM_EMAIL).toBe('noreply@outreachos.com');
  });

  it('casts PORT to a number', async () => {
    process.env['PORT'] = '9000';
    const { getEnv } = await import('../env.js');
    expect(getEnv().PORT).toBe(9000);
  });

  it('throws when a required var is missing', async () => {
    delete process.env['GROQ_API_KEY'];
    const { getEnv } = await import('../env.js');
    expect(() => getEnv()).toThrow('Invalid environment variables');
  });

  it('throws when ENCRYPTION_KEY is too short', async () => {
    process.env['ENCRYPTION_KEY'] = 'tooshort';
    const { getEnv } = await import('../env.js');
    expect(() => getEnv()).toThrow('Invalid environment variables');
  });

  it('throws when GROQ_API_KEY does not start with gsk_', async () => {
    process.env['GROQ_API_KEY'] = 'sk-ant-oops';
    const { getEnv } = await import('../env.js');
    expect(() => getEnv()).toThrow('Invalid environment variables');
  });

  it('throws when RESEND_API_KEY does not start with re_', async () => {
    process.env['RESEND_API_KEY'] = 'badkey';
    const { getEnv } = await import('../env.js');
    expect(() => getEnv()).toThrow('Invalid environment variables');
  });

  it('accepts optional SENTRY_DSN when provided', async () => {
    process.env['SENTRY_DSN'] = 'https://abc@sentry.io/123';
    const { getEnv } = await import('../env.js');
    expect(getEnv().SENTRY_DSN).toBe('https://abc@sentry.io/123');
  });
});
