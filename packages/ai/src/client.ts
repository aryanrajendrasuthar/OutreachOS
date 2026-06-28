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

import Anthropic from '@anthropic-ai/sdk';
import { getEnv } from '@outreachos/shared';

let _client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!_client) {
    const env = getEnv();
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export const MODEL = 'claude-sonnet-4-6';
export const MAX_TOKENS = 1000;
