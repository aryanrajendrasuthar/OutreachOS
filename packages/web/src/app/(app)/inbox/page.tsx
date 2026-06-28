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
import { useAuth } from '@/context/AuthContext';
import { Avatar, Badge, Button, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import type { OutreachEvent } from '@/lib/api';

const INTENT_BADGE: Record<string, { label: string; variant: 'success' | 'warning' | 'danger' | 'info' }> = {
  interested: { label: 'Interested', variant: 'success' },
  neutral: { label: 'Neutral', variant: 'warning' },
  declined: { label: 'Declined', variant: 'danger' },
  question: { label: 'Question', variant: 'info' },
};

export default function InboxPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<OutreachEvent[]>([]);
  const [selected, setSelected] = useState<OutreachEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClassifying, setIsClassifying] = useState(false);
  const [filter, setFilter] = useState<'all' | 'hot'>('all');

  useEffect(() => {
    if (!token) return;
    const fn = filter === 'hot' ? api.inbox.hotLeads : api.inbox.messages;
    void fn(token).then((res) => {
      if (res.data) setMessages(res.data);
      setIsLoading(false);
    });
  }, [token, filter]);

  async function classify(id: string) {
    if (!token) return;
    setIsClassifying(true);
    const res = await api.inbox.classify(token, id);
    if (res.success) toast('Classification queued.', 'success');
    else toast('Failed to classify.', 'error');
    setIsClassifying(false);
  }

  function getIntent(event: OutreachEvent): string | null {
    return (event.metadata?.['intent'] as string | undefined) ?? null;
  }

  return (
    <div className="flex h-[calc(100vh-48px)] gap-0">
      <div className="w-72 border-r border-bg-border flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-bg-border">
          <h1 className="text-base font-bold text-text-primary mb-3">Inbox</h1>
          <div className="flex gap-1">
            <button
              className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${filter === 'all' ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}
              onClick={() => setFilter('all')}
            >
              All
            </button>
            <button
              className={`text-xs px-3 py-1.5 rounded font-medium transition-colors ${filter === 'hot' ? 'bg-accent text-bg-primary' : 'text-text-secondary hover:text-text-primary hover:bg-bg-elevated'}`}
              onClick={() => setFilter('hot')}
            >
              🔥 Hot Leads
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 border-b border-bg-border flex gap-3">
                <div className="skeleton w-8 h-8 rounded-full" />
                <div className="flex-1 flex flex-col gap-1.5">
                  <div className="skeleton w-3/4" />
                  <div className="skeleton w-full" style={{ height: '0.75rem' }} />
                </div>
              </div>
            ))
          ) : messages.length === 0 ? (
            <div className="p-6 text-center text-text-muted text-sm">No messages.</div>
          ) : (
            messages.map((msg) => {
              const intent = getIntent(msg);
              const intentConfig = intent ? INTENT_BADGE[intent] : null;
              return (
                <button
                  key={msg.id}
                  onClick={() => setSelected(msg)}
                  className={`w-full text-left p-4 border-b border-bg-border hover:bg-bg-elevated transition-colors ${selected?.id === msg.id ? 'bg-accent-subtle border-l-2 border-l-accent' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <Avatar name={msg.prospectId} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-text-primary truncate">
                        {msg.eventType.replace(/_/g, ' ')}
                      </p>
                      <p className="text-xs text-text-muted line-clamp-2 mt-0.5">
                        {msg.messageBody ?? 'No content'}
                      </p>
                      {intentConfig && (
                        <Badge variant={intentConfig.variant} className="mt-1.5">
                          {intentConfig.label}
                        </Badge>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex items-center justify-center h-full text-text-muted text-sm">
            Select a message to read
          </div>
        ) : (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col h-full"
          >
            <div className="p-5 border-b border-bg-border flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-text-primary">
                  {selected.eventType.replace(/_/g, ' ')}
                </h2>
                {selected.sentAt && (
                  <p className="text-xs text-text-muted mt-0.5">
                    {new Date(selected.sentAt).toLocaleString()}
                  </p>
                )}
              </div>
              <Button
                size="sm"
                variant="secondary"
                isLoading={isClassifying}
                onClick={() => void classify(selected.id)}
              >
                Classify Intent
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-5">
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">
                {selected.messageBody ?? 'No message body.'}
              </p>
            </div>

            <div className="p-4 border-t border-bg-border">
              <textarea
                className="input resize-none h-24"
                placeholder="Write a reply..."
              />
              <div className="flex items-center justify-between mt-3">
                <Button size="sm" variant="ghost">Use AI Draft</Button>
                <Button size="sm">Send Reply</Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {selected && (
        <div className="w-64 border-l border-bg-border p-4 flex-shrink-0 overflow-y-auto">
          <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
            AI Draft Options
          </h3>
          <div className="flex flex-col gap-3">
            {['Enthusiastic reply', 'Professional reply', 'Brief reply'].map((label, i) => (
              <button
                key={i}
                className="text-left text-xs p-3 rounded-lg border border-bg-border hover:border-accent/40 hover:bg-accent-subtle transition-colors text-text-secondary"
              >
                <span className="font-medium text-accent block mb-1">{label}</span>
                <span>Click to generate with AI...</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
