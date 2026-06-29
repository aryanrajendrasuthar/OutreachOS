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

import Groq from 'groq-sdk';
import { getEnv } from '@outreachos/shared';

let _client: Groq | null = null;

export function getGroqClient(): Groq {
  if (!_client) {
    const env = getEnv();
    _client = new Groq({ apiKey: env.GROQ_API_KEY });
  }
  return _client;
}

export const MODEL = 'llama-3.3-70b-versatile';
export const MAX_TOKENS = 1000;
