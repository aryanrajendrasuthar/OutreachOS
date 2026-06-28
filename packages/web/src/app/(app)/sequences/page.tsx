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
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, Card, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import type { Sequence } from '@/lib/api';

export default function SequencesPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    void api.sequences.list(token).then((res) => {
      if (res.data) setSequences(res.data);
      setIsLoading(false);
    });
  }, [token]);

  async function toggleActive(seq: Sequence) {
    if (!token) return;
    const fn = seq.isActive ? api.sequences.pause : api.sequences.resume;
    const res = await fn(token, seq.id);
    if (res.success) {
      setSequences((prev) => prev.map((s) => s.id === seq.id ? { ...s, isActive: !s.isActive } : s));
      toast(seq.isActive ? 'Sequence paused.' : 'Sequence resumed.', 'success');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-primary">Sequences</h1>
        <Button size="sm">+ New Sequence</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 h-36 skeleton" />
          ))}
        </div>
      ) : sequences.length === 0 ? (
        <div className="card p-12 text-center text-text-muted text-sm">
          No sequences yet. Create one to start automating your outreach.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sequences.map((seq, i) => (
            <motion.div
              key={seq.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card hover>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <Link href={`/sequences/${seq.id}`}>
                      <h3 className="text-sm font-semibold text-text-primary hover:text-accent transition-colors">
                        {seq.name}
                      </h3>
                    </Link>
                    {seq.description && (
                      <p className="text-xs text-text-muted mt-1 line-clamp-2">{seq.description}</p>
                    )}
                  </div>
                  <Badge variant={seq.isActive ? 'success' : 'muted'}>
                    {seq.isActive ? 'Active' : 'Paused'}
                  </Badge>
                </div>

                <div className="flex items-center gap-1.5 mb-4">
                  {seq.steps.map((step) => (
                    <div
                      key={step.stepNumber}
                      title={`Step ${step.stepNumber}: ${step.type} (Day +${step.delayDays})`}
                      className={`
                        text-[10px] px-2 py-0.5 rounded-full border font-medium
                        ${step.type === 'connection_request' ? 'bg-accent-subtle text-accent border-accent-muted' : ''}
                        ${step.type === 'message' ? 'bg-status-question/10 text-status-question border-status-question/20' : ''}
                        ${step.type === 'follow_up' ? 'bg-status-neutral/10 text-status-neutral border-status-neutral/20' : ''}
                      `}
                    >
                      {step.type === 'connection_request' ? 'Connect' : step.type === 'message' ? 'Msg' : 'Follow'}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <Button size="sm" variant="secondary" onClick={() => void toggleActive(seq)}>
                    {seq.isActive ? 'Pause' : 'Resume'}
                  </Button>
                  <Link href={`/sequences/${seq.id}`}>
                    <Button size="sm" variant="ghost">Edit →</Button>
                  </Link>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
