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

'use client';

import { useEffect, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Card, CardHeader, StatCard, SkeletonStatCard, Badge } from '@/components/ui';
import { api } from '@/lib/api';
import type { AnalyticsOverview, DailySnapshot, MessageTemplate } from '@/lib/api';

const CHART_COLORS = {
  accent: '#6BBF3A',
  blue: '#3B82F6',
  yellow: '#EAB308',
  red: '#EF4444',
};

interface FunnelData {
  sent: number;
  accepted: number;
  replied: number;
  interviews: number;
}

export default function AnalyticsPage() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [funnel, setFunnel] = useState<FunnelData | null>(null);
  const [daily, setDaily] = useState<DailySnapshot[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    void Promise.all([
      api.analytics.overview(token),
      api.analytics.funnel(token),
      api.analytics.daily(token),
      api.analytics.templates(token),
    ]).then(([ov, fn, dl, tp]) => {
      if (ov.data) setOverview(ov.data);
      if (fn.data) setFunnel(fn.data);
      if (dl.data) setDaily(dl.data);
      if (tp.data) setTemplates(tp.data);
      setIsLoading(false);
    });
  }, [token]);

  const funnelData = funnel
    ? [
        { label: 'Sent', value: funnel.sent, color: CHART_COLORS.blue },
        { label: 'Accepted', value: funnel.accepted, color: CHART_COLORS.accent },
        { label: 'Replied', value: funnel.replied, color: CHART_COLORS.yellow },
        { label: 'Interviews', value: funnel.interviews, color: CHART_COLORS.red },
      ]
    : [];

  return (
    <div>
      <h1 className="text-xl font-bold text-text-primary mb-6">Analytics</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <StatCard label="Requests Sent" value={overview?.requestsSent ?? 0} />
            <StatCard label="Accept Rate"
              value={overview && overview.requestsSent > 0
                ? `${((overview.accepted / overview.requestsSent) * 100).toFixed(1)}%`
                : '—'} />
            <StatCard label="Reply Rate"
              value={overview && overview.messagesSent > 0
                ? `${((overview.repliesReceived / overview.messagesSent) * 100).toFixed(1)}%`
                : '—'} />
            <StatCard label="Interviews" value={overview?.interviewsBooked ?? 0} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        <motion.div
          className="lg:col-span-2"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card>
            <CardHeader title="Daily Sends" subtitle="Last 30 days" />
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={daily} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradAccent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6BBF3A" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6BBF3A" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#242424" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#5A5A5A', fontSize: 10 }}
                  tickFormatter={(v: string) => v.slice(5)}
                />
                <YAxis tick={{ fill: '#5A5A5A', fontSize: 10 }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#141414',
                    border: '1px solid #242424',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#9A9A9A' }}
                />
                <Area
                  type="monotone"
                  dataKey="requestsSent"
                  name="Requests"
                  stroke="#6BBF3A"
                  strokeWidth={2}
                  fill="url(#gradAccent)"
                />
                <Area
                  type="monotone"
                  dataKey="repliesReceived"
                  name="Replies"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  fill="none"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card>
            <CardHeader title="Conversion Funnel" />
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                layout="vertical"
                data={funnelData}
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#242424" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#5A5A5A', fontSize: 10 }} />
                <YAxis dataKey="label" type="category" tick={{ fill: '#9A9A9A', fontSize: 11 }} width={72} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#141414',
                    border: '1px solid #242424',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" name="Count" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <Card padding={false}>
          <div className="p-5 border-b border-bg-border">
            <h3 className="text-sm font-semibold text-text-primary">Template A/B Performance</h3>
          </div>
          {templates.length === 0 ? (
            <div className="p-8 text-center text-text-muted text-sm">No template data yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bg-border bg-bg-elevated">
                  {['Template', 'Type', 'Variant', 'Sent', 'Accepted', 'Replied', 'Reply Rate'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-medium text-text-muted">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {templates.map((t) => {
                  const perf = t.performance;
                  return (
                    <tr key={t.id} className="border-b border-bg-border hover:bg-bg-elevated transition-colors">
                      <td className="px-4 py-3 text-text-primary font-medium">{t.name}</td>
                      <td className="px-4 py-3"><Badge variant="muted">{t.type}</Badge></td>
                      <td className="px-4 py-3">
                        {t.abVariant ? <Badge variant="accent">{t.abVariant}</Badge> : <span className="text-text-muted">—</span>}
                      </td>
                      <td className="px-4 py-3 text-text-secondary tabular-nums">{perf?.sent ?? '—'}</td>
                      <td className="px-4 py-3 text-text-secondary tabular-nums">{perf?.accepted ?? '—'}</td>
                      <td className="px-4 py-3 text-text-secondary tabular-nums">{perf?.replied ?? '—'}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {perf?.replyRate != null ? (
                          <span className="text-status-interested font-medium">
                            {(perf.replyRate * 100).toFixed(1)}%
                          </span>
                        ) : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Card>
      </motion.div>
    </div>
  );
}
