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

import {
  boolean,
  date,
  integer,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  name: text('name').notNull(),
  linkedinProfileUrl: text('linkedin_profile_url'),
  linkedinSessionCookie: text('linkedin_session_cookie'),
  totpSecret: text('totp_secret'),
  totpEnabled: boolean('totp_enabled').default(false),
  dailyRequestCap: integer('daily_request_cap').default(20),
  hitlEnabled: boolean('hitl_enabled').default(true),
  plan: text('plan', { enum: ['free', 'pro', 'enterprise'] }).default('free'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const prospects = pgTable('prospects', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  fullName: text('full_name').notNull(),
  linkedinUrl: text('linkedin_url').notNull(),
  headline: text('headline'),
  company: text('company'),
  seniorityLevel: text('seniority_level', {
    enum: ['ic', 'senior', 'staff', 'lead', 'manager', 'director', 'vp', 'c-suite'],
  }),
  industry: text('industry'),
  location: text('location'),
  mutualConnections: integer('mutual_connections').default(0),
  aiFitScore: integer('ai_fit_score'),
  profileSnapshot: jsonb('profile_snapshot'),
  status: text('status', {
    enum: [
      'queued',
      'requested',
      'connected',
      'replied',
      'warm',
      'interview',
      'hired',
      'archived',
      'declined',
    ],
  }).default('queued'),
  tags: text('tags').array(),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const sequences = pgTable('sequences', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  steps: jsonb('steps').notNull(),
  isActive: boolean('is_active').default(true),
  targetCriteria: jsonb('target_criteria'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const outreachEvents = pgTable('outreach_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  prospectId: uuid('prospect_id')
    .notNull()
    .references(() => prospects.id, { onDelete: 'cascade' }),
  sequenceId: uuid('sequence_id').references(() => sequences.id, { onDelete: 'set null' }),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  eventType: text('event_type', {
    enum: [
      'connection_request',
      'welcome_message',
      'job_inquiry',
      'follow_up',
      'reply_received',
      'sequence_paused',
      'sequence_completed',
    ],
  }).notNull(),
  messageBody: text('message_body'),
  aiGenerated: boolean('ai_generated').default(false),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  sentAt: timestamp('sent_at', { withTimezone: true }),
  status: text('status', { enum: ['pending', 'sent', 'failed', 'skipped'] }).default('pending'),
  errorMessage: text('error_message'),
  metadata: jsonb('metadata'),
});

export const messageTemplates = pgTable('message_templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', {
    enum: ['connection_note', 'welcome', 'job_inquiry', 'follow_up', 'custom'],
  }).notNull(),
  body: text('body').notNull(),
  isDefault: boolean('is_default').default(false),
  abVariant: text('ab_variant', { enum: ['A', 'B'] }),
  performance: jsonb('performance'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const analyticsSnapshots = pgTable('analytics_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  date: date('date').notNull(),
  requestsSent: integer('requests_sent').default(0),
  accepted: integer('accepted').default(0),
  messagesSent: integer('messages_sent').default(0),
  repliesReceived: integer('replies_received').default(0),
  positiveReplies: integer('positive_replies').default(0),
  interviewsBooked: integer('interviews_booked').default(0),
  acceptRate: numeric('accept_rate', { precision: 5, scale: 2 }),
  replyRate: numeric('reply_rate', { precision: 5, scale: 2 }),
  snapshotData: jsonb('snapshot_data'),
});

export const auditLog = pgTable('audit_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  action: text('action').notNull(),
  resourceType: text('resource_type').notNull(),
  resourceId: uuid('resource_id'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
});
