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

export type UserPlan = 'free' | 'pro' | 'enterprise';

export type SeniorityLevel =
  | 'ic'
  | 'senior'
  | 'staff'
  | 'lead'
  | 'manager'
  | 'director'
  | 'vp'
  | 'c-suite';

export type ProspectStatus =
  | 'queued'
  | 'requested'
  | 'connected'
  | 'replied'
  | 'warm'
  | 'interview'
  | 'hired'
  | 'archived'
  | 'declined';

export type OutreachEventType =
  | 'connection_request'
  | 'welcome_message'
  | 'job_inquiry'
  | 'follow_up'
  | 'reply_received'
  | 'sequence_paused'
  | 'sequence_completed';

export type OutreachEventStatus = 'pending' | 'sent' | 'failed' | 'skipped';

export type MessageTemplateType =
  | 'connection_note'
  | 'welcome'
  | 'job_inquiry'
  | 'follow_up'
  | 'custom';

export type ReplyIntent = 'interested' | 'neutral' | 'declined' | 'question';

export interface SequenceStep {
  stepNumber: number;
  type: 'connection_request' | 'message' | 'follow_up';
  delayDays: number;
  templateId: string;
  condition?: 'always' | 'if_no_reply' | 'if_accepted';
  skipIfReplied: boolean;
}

export interface SearchCriteria {
  keywords?: string;
  location?: string;
  industry?: string;
  seniorityLevel?: SeniorityLevel[];
  company?: string;
  limit?: number;
}

export interface ProspectProfile {
  fullName: string;
  headline?: string;
  company?: string;
  location?: string;
  industry?: string;
  seniorityLevel?: SeniorityLevel;
  mutualConnections?: number;
  profileSnapshot: Record<string, unknown>;
}

export interface InboxMessage {
  profileUrl: string;
  senderName: string;
  body: string;
  receivedAt: Date;
  threadId?: string;
}

export interface TemplatePerformance {
  sent: number;
  accepted: number;
  replied: number;
  replyRate: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface JwtPayload {
  sub: string;
  email: string;
  iat: number;
  exp: number;
}
