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
import { motion } from 'framer-motion';
import type { Metadata } from 'next';
import { useAuth } from '@/context/AuthContext';
import { StatCard, SkeletonStatCard, StatusBadge, Avatar } from '@/components/ui';
import { api } from '@/lib/api';
import type { AnalyticsOverview, OutreachEvent } from '@/lib/api';

const FADE_UP = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 } };

export default function DashboardPage() {
  const { token } = useAuth();
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [queue, setQueue] = useState<OutreachEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    void Promise.all([
      api.analytics.overview(token),
      api.outreach.queue(token),
    ]).then(([ov, q]) => {
      if (ov.data) setOverview(ov.data);
      if (q.data) setQueue(q.data.slice(0, 5));
      setIsLoading(false);
    });
  }, [token]);

  const acceptRate = overview && overview.requestsSent > 0
    ? ((overview.accepted / overview.requestsSent) * 100).toFixed(1)
    : '—';

  const replyRate = overview && overview.messagesSent > 0
    ? ((overview.repliesReceived / overview.messagesSent) * 100).toFixed(1)
    : '—';

  return (
    <div>
      <motion.div {...FADE_UP} transition={{ duration: 0.3 }}>
        <h1 className="text-xl font-bold text-text-primary mb-1">Dashboard</h1>
        <p className="text-sm text-text-secondary mb-6">Last 30 days</p>
      </motion.div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)
        ) : (
          <>
            <motion.div {...FADE_UP} transition={{ delay: 0.05 }}>
              <StatCard label="Requests Sent" value={overview?.requestsSent ?? 0} />
            </motion.div>
            <motion.div {...FADE_UP} transition={{ delay: 0.1 }}>
              <StatCard label="Accepted" value={overview?.accepted ?? 0} />
            </motion.div>
            <motion.div {...FADE_UP} transition={{ delay: 0.15 }}>
              <StatCard label="Accept Rate" value={`${acceptRate}%`} />
            </motion.div>
            <motion.div {...FADE_UP} transition={{ delay: 0.2 }}>
              <StatCard label="Interviews" value={overview?.interviewsBooked ?? 0} />
            </motion.div>
            <motion.div {...FADE_UP} transition={{ delay: 0.25 }}>
              <StatCard label="Messages Sent" value={overview?.messagesSent ?? 0} />
            </motion.div>
            <motion.div {...FADE_UP} transition={{ delay: 0.3 }}>
              <StatCard label="Replies" value={overview?.repliesReceived ?? 0} />
            </motion.div>
            <motion.div {...FADE_UP} transition={{ delay: 0.35 }}>
              <StatCard label="Reply Rate" value={`${replyRate}%`} />
            </motion.div>
            <motion.div {...FADE_UP} transition={{ delay: 0.4 }}>
              <StatCard label="Positive Replies" value={overview?.positiveReplies ?? 0} />
            </motion.div>
          </>
        )}
      </div>

      <motion.div {...FADE_UP} transition={{ delay: 0.45 }} className="card">
        <div className="flex items-center justify-between p-5 border-b border-bg-border">
          <h2 className="text-sm font-semibold text-text-primary">Pending Approvals</h2>
          <a href="/outreach/queue" className="text-xs text-accent hover:text-accent-hover">
            View all →
          </a>
        </div>
        {queue.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">
            No messages pending approval.
          </div>
        ) : (
          <ul>
            {queue.map((event) => (
              <li key={event.id} className="flex items-center gap-4 px-5 py-3 border-b border-bg-border last:border-0 hover:bg-bg-elevated transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-text-primary truncate font-medium">
                    {event.eventType.replace(/_/g, ' ')}
                  </p>
                  <p className="text-xs text-text-muted truncate mt-0.5">
                    {event.messageBody?.slice(0, 80) ?? 'No preview'}
                  </p>
                </div>
                <StatusBadge status={event.status} />
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  );
}
