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

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: unknown;
  meta?: { total?: number; page?: number; limit?: number };
}

async function request<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<ApiResponse<T>> {
  const { token, ...rest } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...rest.headers,
  };

  const res = await fetch(`${API_URL}${path}`, { ...rest, headers });
  const json = (await res.json()) as ApiResponse<T>;
  return json;
}

export interface Prospect {
  id: string;
  userId: string;
  fullName: string;
  linkedinUrl: string;
  headline?: string;
  company?: string;
  seniorityLevel?: string;
  industry?: string;
  location?: string;
  mutualConnections?: number;
  aiFitScore?: number;
  status: string;
  tags?: string[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Sequence {
  id: string;
  userId: string;
  name: string;
  description?: string;
  steps: SequenceStep[];
  isActive: boolean;
  createdAt: string;
}

export interface SequenceStep {
  stepNumber: number;
  type: 'connection_request' | 'message' | 'follow_up';
  delayDays: number;
  templateId: string;
  condition?: 'always' | 'if_no_reply' | 'if_accepted';
  skipIfReplied: boolean;
}

export interface OutreachEvent {
  id: string;
  prospectId: string;
  sequenceId?: string;
  userId: string;
  eventType: string;
  messageBody?: string;
  aiGenerated: boolean;
  scheduledAt?: string;
  sentAt?: string;
  status: string;
  errorMessage?: string;
  metadata?: Record<string, unknown>;
  // Joined fields from /queue endpoint
  prospectName?: string;
  prospectLinkedinUrl?: string;
  prospectHeadline?: string;
}

export interface MessageTemplate {
  id: string;
  userId: string;
  name: string;
  type: string;
  body: string;
  isDefault: boolean;
  abVariant?: 'A' | 'B';
  performance?: {
    sent: number;
    accepted: number;
    replied: number;
    replyRate: number;
  };
  createdAt: string;
}

export interface AnalyticsOverview {
  requestsSent: number;
  accepted: number;
  messagesSent: number;
  repliesReceived: number;
  positiveReplies: number;
  interviewsBooked: number;
}

export interface DailySnapshot {
  date: string;
  requestsSent: number;
  accepted: number;
  messagesSent: number;
  repliesReceived: number;
  acceptRate?: string;
  replyRate?: string;
}

export const api = {
  auth: {
    signup: (body: { email: string; password: string; name: string }) =>
      request('/api/auth/signup', { method: 'POST', body: JSON.stringify(body) }),
    login: (body: { email: string; password: string }) =>
      request<{ accessToken: string; expiresAt: number; user: { id: string; email: string; name: string } }>(
        '/api/auth/login',
        { method: 'POST', body: JSON.stringify(body), credentials: 'include' },
      ),
    logout: (token: string) =>
      request('/api/auth/logout', { method: 'POST', token, credentials: 'include' }),
    me: (token: string) =>
      request<{ id: string; email: string; dailyRequestCap: number; hitlEnabled: boolean }>('/api/auth/me', { token }),
    updateSettings: (token: string, body: { dailyRequestCap?: number; hitlEnabled?: boolean }) =>
      request('/api/auth/settings', { method: 'PATCH', body: JSON.stringify(body), token }),
    linkedinStatus: (token: string) => request<{ connected: boolean }>('/api/auth/linkedin-status', { token }),
    linkedinSetup: (token: string) =>
      request('/api/auth/linkedin-setup', {
        method: 'POST',
        token,
        // Give 6 minutes — the server waits up to 5 min for manual login
        signal: AbortSignal.timeout ? AbortSignal.timeout(360_000) : undefined,
      }),
  },

  prospects: {
    list: (token: string, params?: Record<string, string>) => {
      const qs = params ? `?${new URLSearchParams(params).toString()}` : '';
      return request<Prospect[]>(`/api/prospects${qs}`, { token });
    },
    get: (token: string, id: string) => request<Prospect>(`/api/prospects/${id}`, { token }),
    create: (token: string, body: Partial<Prospect>) =>
      request<Prospect>('/api/prospects', { method: 'POST', body: JSON.stringify(body), token }),
    update: (token: string, id: string, body: Partial<Prospect>) =>
      request<Prospect>(`/api/prospects/${id}`, { method: 'PATCH', body: JSON.stringify(body), token }),
    delete: (token: string, id: string) =>
      request(`/api/prospects/${id}`, { method: 'DELETE', token }),
    score: (token: string, id: string) =>
      request(`/api/prospects/${id}/score`, { method: 'POST', token }),
  },

  sequences: {
    list: (token: string) => request<Sequence[]>('/api/sequences', { token }),
    get: (token: string, id: string) => request<Sequence>(`/api/sequences/${id}`, { token }),
    create: (token: string, body: Partial<Sequence>) =>
      request<Sequence>('/api/sequences', { method: 'POST', body: JSON.stringify(body), token }),
    update: (token: string, id: string, body: Partial<Sequence>) =>
      request<Sequence>(`/api/sequences/${id}`, { method: 'PATCH', body: JSON.stringify(body), token }),
    delete: (token: string, id: string) =>
      request(`/api/sequences/${id}`, { method: 'DELETE', token }),
    start: (token: string, id: string) =>
      request(`/api/sequences/${id}/start`, { method: 'POST', token }),
    pause: (token: string, id: string) =>
      request(`/api/sequences/${id}/pause`, { method: 'POST', token }),
    resume: (token: string, id: string) =>
      request(`/api/sequences/${id}/resume`, { method: 'POST', token }),
  },

  outreach: {
    enroll: (token: string, body: { prospectIds: string[]; sequenceId: string }) =>
      request('/api/outreach/enroll', { method: 'POST', body: JSON.stringify(body), token }),
    queue: (token: string) => request<OutreachEvent[]>('/api/outreach/queue', { token }),
    approve: (token: string, eventId: string, messageBody?: string) =>
      request(`/api/outreach/approve/${eventId}`, {
        method: 'POST',
        body: JSON.stringify({ messageBody }),
        token,
      }),
    reject: (token: string, eventId: string, reason?: string) =>
      request(`/api/outreach/reject/${eventId}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
        token,
      }),
    history: (token: string) => request<OutreachEvent[]>('/api/outreach/history', { token }),
  },

  inbox: {
    messages: (token: string) => request<OutreachEvent[]>('/api/inbox/messages', { token }),
    getMessage: (token: string, id: string) =>
      request<OutreachEvent>(`/api/inbox/messages/${id}`, { token }),
    hotLeads: (token: string) => request<OutreachEvent[]>('/api/inbox/hot-leads', { token }),
    classify: (token: string, id: string) =>
      request(`/api/inbox/messages/${id}/classify`, { method: 'POST', token }),
    reply: (token: string, id: string, body: string) =>
      request(`/api/inbox/messages/${id}/reply`, { method: 'POST', body: JSON.stringify({ body }), token }),
    sync: (token: string) =>
      request<{ synced: number; created: number }>('/api/inbox/sync', { method: 'POST', token }),
    draft: (token: string, id: string) =>
      request<{ drafts: string[] }>(`/api/inbox/messages/${id}/draft`, { method: 'POST', token }),
  },

  analytics: {
    overview: (token: string) => request<AnalyticsOverview>('/api/analytics/overview', { token }),
    funnel: (token: string) =>
      request<{ sent: number; accepted: number; replied: number; interviews: number }>(
        '/api/analytics/funnel',
        { token },
      ),
    templates: (token: string) =>
      request<MessageTemplate[]>('/api/analytics/templates', { token }),
    daily: (token: string) => request<DailySnapshot[]>('/api/analytics/daily', { token }),
  },

  templates: {
    list: (token: string) => request<MessageTemplate[]>('/api/templates', { token }),
    create: (token: string, body: Partial<MessageTemplate>) =>
      request<MessageTemplate>('/api/templates', {
        method: 'POST',
        body: JSON.stringify(body),
        token,
      }),
    update: (token: string, id: string, body: Partial<MessageTemplate>) =>
      request<MessageTemplate>(`/api/templates/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(body),
        token,
      }),
    delete: (token: string, id: string) =>
      request(`/api/templates/${id}`, { method: 'DELETE', token }),
    clone: (token: string, id: string) =>
      request<MessageTemplate>(`/api/templates/${id}/clone`, { method: 'POST', token }),
  },
};
