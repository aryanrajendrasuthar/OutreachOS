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

import { Worker } from 'bullmq';
import type { Job } from 'bullmq';
import type { Redis } from 'ioredis';
import pino from 'pino';
import { eq, and, count, gte, ne } from 'drizzle-orm';
import { Resend } from 'resend';
import { generateConnectionNote, generateMessage } from '@outreachos/ai';
import { LinkedInAutomationService, SessionExpiredError } from '@outreachos/automation';
import {
  getDb,
  getEnv,
  outreachEvents,
  prospects,
  sequences,
  users,
  messageTemplates,
} from '@outreachos/shared';
import type { SequenceStep } from '@outreachos/shared';
import type { OutreachJobData } from '../queues.js';

const logger = pino({ name: 'sequenceWorker' });

function randomDelay(): Promise<void> {
  // 3–10 minutes between requests — human pacing for bulk sends
  const ms = (3 * 60 + Math.floor(Math.random() * 7 * 60)) * 1000;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getDailyRequestCount(db: ReturnType<typeof getDb>, userId: string): Promise<number> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [result] = await db
    .select({ count: count() })
    .from(outreachEvents)
    .where(
      and(
        eq(outreachEvents.userId, userId),
        eq(outreachEvents.eventType, 'connection_request'),
        eq(outreachEvents.status, 'sent'),
        gte(outreachEvents.sentAt, today),
      ),
    );
  return Number(result?.count ?? 0);
}

async function hasExistingConnectionRequest(
  db: ReturnType<typeof getDb>,
  userId: string,
  prospectId: string,
  excludeEventId: string,
): Promise<boolean> {
  const [result] = await db
    .select({ count: count() })
    .from(outreachEvents)
    .where(
      and(
        eq(outreachEvents.userId, userId),
        eq(outreachEvents.prospectId, prospectId),
        eq(outreachEvents.eventType, 'connection_request'),
        eq(outreachEvents.status, 'sent'),
        ne(outreachEvents.id, excludeEventId),
      ),
    );
  return Number(result?.count ?? 0) > 0;
}

async function hasProspectReplied(
  db: ReturnType<typeof getDb>,
  prospectId: string,
): Promise<boolean> {
  const [result] = await db
    .select({ count: count() })
    .from(outreachEvents)
    .where(
      and(eq(outreachEvents.prospectId, prospectId), eq(outreachEvents.eventType, 'reply_received')),
    );
  return Number(result?.count ?? 0) > 0;
}

export function createSequenceWorker(redis: Redis): Worker<OutreachJobData> {
  const env = getEnv();
  const db = getDb(env.DATABASE_URL!);
  const resend = new Resend(env.RESEND_API_KEY);

  return new Worker<OutreachJobData>(
    'outreach',
    async (job: Job<OutreachJobData>) => {
      const { userId, prospectId, sequenceId, stepNumber, eventId, hitlApproved } = job.data;

      logger.info({ jobId: job.id, prospectId, stepNumber }, 'Processing outreach job');

      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const [prospect] = await db
        .select()
        .from(prospects)
        .where(eq(prospects.id, prospectId))
        .limit(1);
      const [sequence] = await db
        .select()
        .from(sequences)
        .where(eq(sequences.id, sequenceId))
        .limit(1);
      const [event] = await db
        .select()
        .from(outreachEvents)
        .where(eq(outreachEvents.id, eventId))
        .limit(1);

      if (!user || !prospect || !sequence || !event) {
        logger.error({ jobId: job.id }, 'Missing required records — skipping job');
        return;
      }

      const replied = await hasProspectReplied(db, prospectId);
      if (replied) {
        logger.info({ prospectId }, 'Prospect has replied — pausing sequence');
        await db
          .update(outreachEvents)
          .set({ status: 'skipped', errorMessage: 'Prospect replied — sequence paused.' })
          .where(eq(outreachEvents.id, eventId));
        return;
      }

      const steps = sequence.steps as SequenceStep[];
      const step = steps.find((s) => s.stepNumber === stepNumber);
      if (!step) {
        logger.warn({ stepNumber, sequenceId }, 'Step not found in sequence definition');
        return;
      }

      if (step.type === 'connection_request') {
        const alreadySent = await hasExistingConnectionRequest(db, userId, prospectId, eventId);
        if (alreadySent) {
          logger.info({ prospectId }, 'Connection request already sent to this prospect — skipping');
          await db
            .update(outreachEvents)
            .set({ status: 'skipped', errorMessage: 'Connection request already sent.' })
            .where(eq(outreachEvents.id, eventId));
          return;
        }

        const dailyCount = await getDailyRequestCount(db, userId);
        if (dailyCount >= (user.dailyRequestCap ?? 20)) {
          logger.info({ userId, dailyCount }, 'Daily cap reached — requeueing tomorrow');
          await job.moveToDelayed(Date.now() + 24 * 60 * 60 * 1000);
          return;
        }
      }

      if (user.hitlEnabled && !hitlApproved) {
        await db
          .update(outreachEvents)
          .set({ status: 'pending' })
          .where(eq(outreachEvents.id, eventId));
        logger.info({ eventId }, 'HITL: event set to pending for approval');
        return;
      }

      const automation = new LinkedInAutomationService(userId);

      const sessionReady = await automation.isSessionValid();
      if (!sessionReady) {
        await db
          .update(outreachEvents)
          .set({ status: 'pending', errorMessage: 'LinkedIn not connected — please connect in Settings.' })
          .where(eq(outreachEvents.id, eventId));
        logger.warn({ userId }, 'No LinkedIn session profile found — event reset to pending');
        return;
      }

      const [template] = await db
        .select()
        .from(messageTemplates)
        .where(eq(messageTemplates.id, step.templateId))
        .limit(1);

      if (!template) {
        await db
          .update(outreachEvents)
          .set({ status: 'failed', errorMessage: 'Template not found.' })
          .where(eq(outreachEvents.id, eventId));
        return;
      }

      let messageBody: string;
      if (step.type === 'connection_request') {
        messageBody = await generateConnectionNote(prospect, template.body);
      } else {
        messageBody = await generateMessage(prospect, step, template.body);
      }

      await randomDelay();

      let success = false;
      try {
        if (step.type === 'connection_request') {
          success = await automation.sendConnectionRequest(prospect.linkedinUrl, messageBody);
        } else {
          success = await automation.sendMessage(prospect.linkedinUrl, messageBody);
        }
      } catch (err) {
        if (err instanceof SessionExpiredError) {
          logger.warn({ eventId, userId }, 'LinkedIn session expired — resetting event to pending');
          await db
            .update(outreachEvents)
            .set({ status: 'pending', errorMessage: 'LinkedIn session expired — please reconnect in Settings, then approve again.' })
            .where(eq(outreachEvents.id, eventId));
          return; // don't re-throw — BullMQ won't retry, no session burning
        }
        throw err;
      } finally {
        await automation.close();
      }

      if (success) {
        await db
          .update(outreachEvents)
          .set({ status: 'sent', sentAt: new Date(), messageBody, aiGenerated: true })
          .where(eq(outreachEvents.id, eventId));
        logger.info({ eventId, stepNumber }, 'Outreach event sent successfully');
      } else {
        throw new Error('Playwright action failed — will retry');
      }
    },
    {
      connection: redis,
      concurrency: 1,
    },
  );
}

export function attachWorkerErrorHandlers(
  worker: Worker<OutreachJobData>,
  resend: Resend,
  fromEmail: string,
): void {
  worker.on('failed', async (job, err) => {
    if (!job || (job.attemptsMade ?? 0) < (job.opts.attempts ?? 3)) return;

    logger.error({ jobId: job.id, err: err.message }, 'Outreach job permanently failed');

    const { userId, eventId } = job.data;
    const env = getEnv();
    const db = getDb(env.DATABASE_URL!);

    await db
      .update(outreachEvents)
      .set({ status: 'failed', errorMessage: err.message })
      .where(eq(outreachEvents.id, eventId));

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (user?.email) {
      await resend.emails.send({
        from: fromEmail,
        to: user.email,
        subject: 'OutreachOS: Outreach Job Failed',
        html: `<p>An outreach job (event ID: ${eventId}) failed after 3 retries. Please check your LinkedIn session and HITL queue.</p>`,
      });
    }
  });
}
