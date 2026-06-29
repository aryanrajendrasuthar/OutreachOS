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

import { z } from 'zod';
import type { ReplyIntent, SequenceStep } from '@outreachos/shared';
import { getGroqClient, MAX_TOKENS, MODEL } from './client.js';

interface ProspectContext {
  fullName: string;
  headline?: string | null;
  company?: string | null;
  seniorityLevel?: string | null;
  industry?: string | null;
  location?: string | null;
  mutualConnections?: number | null;
}

interface Message {
  sender: 'user' | 'prospect';
  body: string;
  sentAt: Date;
}

async function chat(systemPrompt: string, userMessage: string): Promise<string> {
  const client = getGroqClient();
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
  });

  const text = response.choices[0]?.message?.content;
  if (!text) {
    throw new Error('Unexpected response format from AI API.');
  }
  return text.trim();
}

export async function scoreProspect(
  prospect: ProspectContext,
  userGoal: string,
): Promise<number> {
  const system = `You are a career advisor evaluating how well a LinkedIn profile matches a job seeker's goal.
Return ONLY a single integer between 0 and 100. No explanation. No other text.
100 = perfect match. 0 = completely irrelevant.`;

  const user = `User's goal: ${userGoal}
Prospect: ${prospect.fullName}, ${prospect.headline ?? 'No headline'} at ${prospect.company ?? 'Unknown company'}.
Seniority: ${prospect.seniorityLevel ?? 'unknown'}. Industry: ${prospect.industry ?? 'unknown'}.`;

  const raw = await chat(system, user);
  const score = parseInt(raw, 10);
  return z.number().int().min(0).max(100).parse(score);
}

export async function generateConnectionNote(
  prospect: ProspectContext,
  templateHint: string,
): Promise<string> {
  const system = `You are writing a LinkedIn connection request note on behalf of a job seeker.
Rules:
- Between 150–280 characters (including spaces).
- Must reference something specific from the profile: mutual connection, shared school, company milestone, or recent role.
- Warm, genuine, professional. No generic openers like "I came across your profile."
- Return ONLY the note text. Nothing else.`;

  const user = `Prospect: ${prospect.fullName}, ${prospect.headline ?? ''} at ${prospect.company ?? ''}.
Mutual connections: ${prospect.mutualConnections ?? 0}.
Template hint: ${templateHint}`;

  const note = await chat(system, user);
  if (note.length < 50 || note.length > 300) {
    throw new Error(`Generated connection note has invalid length: ${note.length} chars.`);
  }
  return note;
}

export async function generateMessage(
  prospect: ProspectContext,
  step: SequenceStep,
  templateBody: string,
): Promise<string> {
  const system = `You are drafting a LinkedIn message for a job seeker's outreach sequence.
Inject these tokens literally if found in the template: {{first_name}}, {{company}}, {{role}}.
Rules:
- Under 300 words.
- Match the step type tone: connection_request = brief/warm, message = friendly pitch, follow_up = polite nudge.
- Return ONLY the final message body. No subject line.`;

  const firstName = prospect.fullName.split(' ')[0] ?? prospect.fullName;
  const filledTemplate = templateBody
    .replace(/\{\{first_name\}\}/g, firstName)
    .replace(/\{\{company\}\}/g, prospect.company ?? 'your company')
    .replace(/\{\{role\}\}/g, prospect.headline ?? 'your role');

  const user = `Step type: ${step.type} (step ${step.stepNumber}).
Prospect: ${prospect.fullName} at ${prospect.company ?? 'unknown'}.
Template: ${filledTemplate}`;

  return chat(system, user);
}

export async function classifyReplyIntent(messageBody: string): Promise<ReplyIntent> {
  const system = `Classify the intent of this LinkedIn message reply.
Return ONLY one of: interested, neutral, declined, question
No other output.`;

  const raw = await chat(system, messageBody);
  return z.enum(['interested', 'neutral', 'declined', 'question']).parse(raw.toLowerCase());
}

export async function draftReply(
  thread: Message[],
  userContext: string,
): Promise<string[]> {
  const system = `You are drafting 3 reply options for a job seeker responding to a LinkedIn message.
Each option should have a different tone: 1) enthusiastic, 2) professional/measured, 3) brief/casual.
Return a JSON array of exactly 3 strings. No markdown. No explanation.`;

  const threadText = thread
    .map((m) => `[${m.sender === 'user' ? 'You' : 'Prospect'}]: ${m.body}`)
    .join('\n');

  const user = `Context: ${userContext}\n\nThread:\n${threadText}`;

  const raw = await chat(system, user);
  const parsed = z.array(z.string()).length(3).safeParse(JSON.parse(raw));
  if (!parsed.success) {
    throw new Error('AI returned malformed reply options.');
  }
  return parsed.data;
}
