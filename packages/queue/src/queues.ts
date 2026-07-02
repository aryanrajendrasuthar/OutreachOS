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

import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

export interface OutreachJobData {
  userId: string;
  prospectId: string;
  sequenceId: string;
  stepNumber: number;
  eventId: string;
  hitlApproved?: boolean;
}

export interface ScoringJobData {
  userId: string;
  prospectId: string;
  userGoal: string;
}

export function createOutreachQueue(redis: Redis) {
  return new Queue<OutreachJobData>('outreach', {
    connection: redis,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 500 },
    },
  });
}

export function createScoringQueue(redis: Redis) {
  return new Queue<ScoringJobData>('scoring', {
    connection: redis,
    defaultJobOptions: {
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 },
    },
  });
}
