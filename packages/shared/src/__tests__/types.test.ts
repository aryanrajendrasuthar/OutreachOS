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

import { describe, expect, it } from 'vitest';
import type {
  ApiResponse,
  PaginationParams,
  SequenceStep,
  ReplyIntent,
} from '../types.js';

describe('SequenceStep type contract', () => {
  it('accepts a valid connection_request step', () => {
    const step: SequenceStep = {
      stepNumber: 1,
      type: 'connection_request',
      delayDays: 0,
      templateId: '00000000-0000-0000-0000-000000000001',
      condition: 'always',
      skipIfReplied: false,
    };
    expect(step.stepNumber).toBe(1);
    expect(step.type).toBe('connection_request');
  });

  it('accepts a valid follow_up step with skipIfReplied', () => {
    const step: SequenceStep = {
      stepNumber: 4,
      type: 'follow_up',
      delayDays: 14,
      templateId: '00000000-0000-0000-0000-000000000004',
      condition: 'if_no_reply',
      skipIfReplied: true,
    };
    expect(step.skipIfReplied).toBe(true);
    expect(step.delayDays).toBe(14);
  });
});

describe('ApiResponse type contract', () => {
  it('represents a successful response with data', () => {
    const res: ApiResponse<string[]> = {
      success: true,
      data: ['a', 'b'],
      meta: { total: 2, page: 1, limit: 25 },
    };
    expect(res.success).toBe(true);
    expect(res.data).toHaveLength(2);
    expect(res.meta?.total).toBe(2);
  });

  it('represents an error response', () => {
    const res: ApiResponse = { success: false, error: 'Not found.' };
    expect(res.success).toBe(false);
    expect(res.error).toBe('Not found.');
  });
});

describe('ReplyIntent values', () => {
  it('covers all 4 expected intent values', () => {
    const intents: ReplyIntent[] = ['interested', 'neutral', 'declined', 'question'];
    expect(intents).toHaveLength(4);
  });
});

describe('PaginationParams defaults', () => {
  it('accepts partial pagination params', () => {
    const params: PaginationParams = { page: 2 };
    expect(params.page).toBe(2);
    expect(params.limit).toBeUndefined();
  });

  it('accepts full pagination params', () => {
    const params: PaginationParams = { page: 1, limit: 50, sortBy: 'createdAt', sortOrder: 'desc' };
    expect(params.sortOrder).toBe('desc');
  });
});
