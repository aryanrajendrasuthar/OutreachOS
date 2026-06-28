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

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

vi.mock('@outreachos/shared', () => ({
  getEnv: () => ({
    ANTHROPIC_API_KEY: 'sk-ant-test',
    NODE_ENV: 'test',
  }),
}));

function makeTextResponse(text: string) {
  return { content: [{ type: 'text', text }] };
}

const PROSPECT = {
  fullName: 'Jane Smith',
  headline: 'Engineering Manager at Acme Corp',
  company: 'Acme Corp',
  seniorityLevel: 'manager' as const,
  industry: 'Software',
  location: 'San Francisco, CA',
  mutualConnections: 3,
};

const STEP = {
  stepNumber: 2,
  type: 'message' as const,
  delayDays: 1,
  templateId: 'uuid-1',
  condition: 'if_accepted' as const,
  skipIfReplied: false,
};

describe('scoreProspect', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it('returns an integer score 0–100', async () => {
    mockCreate.mockResolvedValue(makeTextResponse('78'));
    const { scoreProspect } = await import('../services.js');
    const score = await scoreProspect(PROSPECT, 'Software engineering role at a Series B startup');
    expect(score).toBe(78);
  });

  it('throws if the model returns a non-numeric value', async () => {
    mockCreate.mockResolvedValue(makeTextResponse('high'));
    const { scoreProspect } = await import('../services.js');
    await expect(scoreProspect(PROSPECT, 'any goal')).rejects.toThrow();
  });

  it('throws if the score is out of range', async () => {
    mockCreate.mockResolvedValue(makeTextResponse('150'));
    const { scoreProspect } = await import('../services.js');
    await expect(scoreProspect(PROSPECT, 'any goal')).rejects.toThrow();
  });
});

describe('generateConnectionNote', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it('returns note text when length is within 150–280 chars', async () => {
    const note = 'Hi Jane, I loved your talk on engineering culture at Acme — really resonated with how I think about team building. Would love to connect!';
    mockCreate.mockResolvedValue(makeTextResponse(note));
    const { generateConnectionNote } = await import('../services.js');
    const result = await generateConnectionNote(PROSPECT, 'personalized note');
    expect(result).toBe(note);
    expect(result.length).toBeGreaterThanOrEqual(50);
  });

  it('throws when the returned note is too short', async () => {
    mockCreate.mockResolvedValue(makeTextResponse('Hi!'));
    const { generateConnectionNote } = await import('../services.js');
    await expect(generateConnectionNote(PROSPECT, 'hint')).rejects.toThrow('invalid length');
  });
});

describe('generateMessage', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it('injects first_name token and returns message', async () => {
    mockCreate.mockResolvedValue(
      makeTextResponse('Hi Jane, excited to follow up about a potential role at Acme Corp.'),
    );
    const { generateMessage } = await import('../services.js');
    const msg = await generateMessage(PROSPECT, STEP, 'Hi {{first_name}}, following up about {{company}}.');
    expect(msg).toContain('Jane');
  });
});

describe('classifyReplyIntent', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it.each([
    ['interested', 'interested'],
    ['neutral', 'neutral'],
    ['declined', 'declined'],
    ['question', 'question'],
    ['INTERESTED', 'interested'],
  ])('classifies "%s" → "%s"', async (raw, expected) => {
    mockCreate.mockResolvedValue(makeTextResponse(raw));
    const { classifyReplyIntent } = await import('../services.js');
    const intent = await classifyReplyIntent('Some message body');
    expect(intent).toBe(expected);
  });

  it('throws on an unexpected intent value', async () => {
    mockCreate.mockResolvedValue(makeTextResponse('maybe'));
    const { classifyReplyIntent } = await import('../services.js');
    await expect(classifyReplyIntent('message')).rejects.toThrow();
  });
});

describe('draftReply', () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it('returns exactly 3 reply options', async () => {
    const options = ['Enthusiastic reply.', 'Professional reply.', 'Brief reply.'];
    mockCreate.mockResolvedValue(makeTextResponse(JSON.stringify(options)));
    const { draftReply } = await import('../services.js');
    const thread = [{ sender: 'prospect' as const, body: 'Hi there!', sentAt: new Date() }];
    const result = await draftReply(thread, 'software engineer looking for a new role');
    expect(result).toHaveLength(3);
    expect(result[0]).toBe('Enthusiastic reply.');
  });

  it('throws when the model returns fewer than 3 options', async () => {
    mockCreate.mockResolvedValue(makeTextResponse(JSON.stringify(['only one'])));
    const { draftReply } = await import('../services.js');
    await expect(
      draftReply([{ sender: 'prospect', body: 'hi', sentAt: new Date() }], 'context'),
    ).rejects.toThrow();
  });

  it('throws when the model returns invalid JSON', async () => {
    mockCreate.mockResolvedValue(makeTextResponse('not json'));
    const { draftReply } = await import('../services.js');
    await expect(
      draftReply([{ sender: 'prospect', body: 'hi', sentAt: new Date() }], 'context'),
    ).rejects.toThrow();
  });
});
