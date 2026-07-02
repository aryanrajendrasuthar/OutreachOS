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
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import type { OutreachEvent } from '@/lib/api';

function QueueCard({
  event,
  onApprove,
  onReject,
}: {
  event: OutreachEvent;
  onApprove: (id: string, body: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [editedBody, setEditedBody] = useState(event.messageBody ?? '');
  const [isEditing, setIsEditing] = useState(false);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -16, scale: 0.96 }}
      className="card p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div>
            <p className="text-sm font-semibold text-text-primary">
              {event.prospectName ?? 'Unknown prospect'}
            </p>
            {event.prospectHeadline && (
              <p className="text-xs text-text-muted mt-0.5 truncate max-w-xs">{event.prospectHeadline}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="warning">{event.eventType.replace(/_/g, ' ')}</Badge>
          {event.aiGenerated && <Badge variant="accent">AI</Badge>}
        </div>
      </div>

      {event.scheduledAt && (
        <p className="text-xs text-text-muted mb-3">
          Scheduled: {new Date(event.scheduledAt).toLocaleString()}
        </p>
      )}

      <div className="bg-bg-elevated border border-bg-border rounded-lg p-4 mb-4">
        {isEditing ? (
          <textarea
            className="w-full bg-transparent text-sm text-text-primary resize-none focus:outline-none"
            rows={6}
            value={editedBody}
            onChange={(e) => setEditedBody(e.target.value)}
          />
        ) : (
          <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap font-mono">
            {editedBody || 'No message body.'}
          </p>
        )}
      </div>

      {isEditing && (
        <p className="text-xs text-text-muted mb-3">
          {editedBody.length}/300 chars — your edits will be sent as-is
        </p>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          isLoading={isApproving}
          onClick={async () => {
            setIsApproving(true);
            await onApprove(event.id, editedBody);
          }}
        >
          ✓ Approve
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setIsEditing((v) => !v)}>
          {isEditing ? 'Preview' : 'Edit'}
        </Button>
        <Button
          size="sm"
          variant="danger"
          isLoading={isRejecting}
          onClick={async () => {
            setIsRejecting(true);
            await onReject(event.id);
          }}
        >
          ✗ Reject
        </Button>
        {event.prospectLinkedinUrl && (
          <a
            href={event.prospectLinkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-xs text-accent hover:text-accent-hover"
          >
            View profile →
          </a>
        )}
      </div>
    </motion.div>
  );
}

export default function QueuePage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [events, setEvents] = useState<OutreachEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    void api.outreach.queue(token).then((res) => {
      if (res.data) setEvents(res.data);
      setIsLoading(false);
    });
  }, [token]);

  async function handleApprove(id: string, body: string) {
    if (!token) return;
    const res = await api.outreach.approve(token, id, body || undefined);
    if (res.success) {
      toast('Approved — sending now.', 'success');
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } else {
      toast('Failed to approve.', 'error');
    }
  }

  async function handleReject(id: string) {
    if (!token) return;
    const res = await api.outreach.reject(token, id);
    if (res.success) {
      toast('Message rejected.', 'info');
      setEvents((prev) => prev.filter((e) => e.id !== id));
    } else {
      toast('Failed to reject.', 'error');
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Approval Queue</h1>
          <p className="text-sm text-text-secondary mt-0.5">
            Review and approve messages before they&apos;re sent
          </p>
        </div>
        <Badge variant={events.length > 0 ? 'warning' : 'muted'}>
          {events.length} pending
        </Badge>
      </div>

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-5 h-48 skeleton" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="text-3xl mb-3">✓</div>
          <p className="text-sm text-text-muted">Queue is empty — no messages pending approval.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <AnimatePresence mode="popLayout">
            {events.map((event) => (
              <QueueCard
                key={event.id}
                event={event}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
