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
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Avatar, Badge, Button, Card, ProgressBar, StatusBadge, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import type { Prospect, OutreachEvent } from '@/lib/api';

export default function ProspectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { toast } = useToast();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isScoringLoading, setIsScoringLoading] = useState(false);

  useEffect(() => {
    if (!token || !id) return;
    void Promise.all([
      api.prospects.get(token, id),
      api.outreach.history(token),
    ]).then(([p, h]) => {
      if (p.data) setProspect(p.data);
      if (h.data) setEvents(h.data.filter((e) => e.prospectId === id));
      setIsLoading(false);
    });
  }, [token, id]);

  async function triggerScore() {
    if (!token || !id) return;
    setIsScoringLoading(true);
    const res = await api.prospects.score(token, id);
    if (res.success) toast('Scoring job queued.', 'success');
    else toast('Failed to queue scoring.', 'error');
    setIsScoringLoading(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!prospect) {
    return <div className="text-text-muted text-sm">Prospect not found.</div>;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }}>
      <div className="mb-4">
        <Link href="/prospects" className="text-xs text-text-muted hover:text-accent transition-colors">
          ← Prospects
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-1 flex flex-col gap-4">
          <Card>
            <div className="flex items-start gap-4">
              <Avatar name={prospect.fullName} size="lg" />
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-text-primary">{prospect.fullName}</h1>
                <p className="text-sm text-text-secondary mt-0.5">{prospect.headline}</p>
                <p className="text-xs text-text-muted mt-1">{prospect.company}</p>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-bg-border flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Status</span>
                <StatusBadge status={prospect.status} />
              </div>
              {prospect.seniorityLevel && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Seniority</span>
                  <Badge>{prospect.seniorityLevel}</Badge>
                </div>
              )}
              {prospect.location && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Location</span>
                  <span className="text-xs text-text-secondary">{prospect.location}</span>
                </div>
              )}
              {prospect.mutualConnections !== undefined && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-text-muted">Mutual</span>
                  <span className="text-xs text-text-secondary">{prospect.mutualConnections} connections</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-bg-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs text-text-muted">AI Fit Score</span>
                <Button size="sm" variant="ghost" isLoading={isScoringLoading} onClick={() => void triggerScore()}>
                  Refresh
                </Button>
              </div>
              {prospect.aiFitScore != null ? (
                <div className="flex items-center gap-3">
                  <ProgressBar value={prospect.aiFitScore} max={100} />
                  <span className="text-sm font-semibold text-text-primary tabular-nums">
                    {prospect.aiFitScore}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-text-muted">Not scored yet.</p>
              )}
            </div>

            {prospect.tags && prospect.tags.length > 0 && (
              <div className="mt-4 pt-4 border-t border-bg-border">
                <p className="text-xs text-text-muted mb-2">Tags</p>
                <div className="flex flex-wrap gap-1.5">
                  {prospect.tags.map((tag) => (
                    <Badge key={tag} variant="muted">{tag}</Badge>
                  ))}
                </div>
              </div>
            )}

            <a
              href={prospect.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center justify-center gap-2 w-full text-xs text-accent border border-accent/30 rounded py-2 hover:bg-accent-subtle transition-colors"
            >
              View on LinkedIn →
            </a>
          </Card>
        </div>

        <div className="col-span-2 flex flex-col gap-4">
          <Card>
            <h2 className="text-sm font-semibold text-text-primary mb-4">Conversation Thread</h2>
            {events.length === 0 ? (
              <p className="text-sm text-text-muted py-4 text-center">No outreach events yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className={`rounded-lg p-3 text-sm ${
                      event.eventType === 'reply_received'
                        ? 'bg-bg-elevated border border-bg-border ml-4'
                        : 'bg-accent-subtle border border-accent-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-text-secondary">
                        {event.eventType.replace(/_/g, ' ')}
                      </span>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={event.status} />
                        {event.sentAt && (
                          <span className="text-[10px] text-text-muted">
                            {new Date(event.sentAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {event.messageBody && (
                      <p className="text-text-primary leading-relaxed">{event.messageBody}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {prospect.notes && (
            <Card>
              <h2 className="text-sm font-semibold text-text-primary mb-3">Notes</h2>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {prospect.notes}
              </p>
            </Card>
          )}
        </div>
      </div>
    </motion.div>
  );
}
