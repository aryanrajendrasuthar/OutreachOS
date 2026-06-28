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
import { Badge, Button, Card, Modal, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import type { MessageTemplate } from '@/lib/api';

const TEMPLATE_TYPES = ['connection_note', 'welcome', 'job_inquiry', 'follow_up', 'custom'] as const;

export default function TemplatesPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    type: 'connection_note' as typeof TEMPLATE_TYPES[number],
    body: '',
    abVariant: '' as 'A' | 'B' | '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    void api.templates.list(token).then((res) => {
      if (res.data) setTemplates(res.data);
      setIsLoading(false);
    });
  }, [token]);

  async function handleCreate() {
    if (!token || !newTemplate.name || !newTemplate.body) return;
    setIsSaving(true);
    const res = await api.templates.create(token, {
      ...newTemplate,
      abVariant: newTemplate.abVariant || undefined,
    });
    if (res.success && res.data) {
      setTemplates((prev) => [...prev, res.data!]);
      setIsCreateOpen(false);
      setNewTemplate({ name: '', type: 'connection_note', body: '', abVariant: '' });
      toast('Template created.', 'success');
    } else {
      toast('Failed to create template.', 'error');
    }
    setIsSaving(false);
  }

  async function handleDelete(id: string) {
    if (!token) return;
    const res = await api.templates.delete(token, id);
    if (res.success) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast('Template deleted.', 'success');
    }
  }

  async function handleClone(id: string) {
    if (!token) return;
    const res = await api.templates.clone(token, id);
    if (res.success && res.data) {
      setTemplates((prev) => [...prev, res.data!]);
      toast('Template cloned.', 'success');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-text-primary">Templates</h1>
        <Button size="sm" onClick={() => setIsCreateOpen(true)}>+ New Template</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-5 h-40 skeleton" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="card p-12 text-center text-text-muted text-sm">
          No templates yet. Create your first one.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
            >
              <Card>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-text-primary">{t.name}</h3>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <Badge variant="muted">{t.type}</Badge>
                      {t.abVariant && <Badge variant="accent">{t.abVariant}</Badge>}
                      {t.isDefault && <Badge variant="info">Default</Badge>}
                    </div>
                  </div>
                </div>

                <p className="text-xs text-text-secondary font-mono bg-bg-elevated border border-bg-border rounded p-3 line-clamp-3 leading-relaxed">
                  {t.body}
                </p>

                {t.performance && (
                  <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
                    <span>Sent: <strong className="text-text-primary">{t.performance.sent}</strong></span>
                    <span>Reply rate: <strong className="text-status-interested">
                      {(t.performance.replyRate * 100).toFixed(1)}%
                    </strong></span>
                  </div>
                )}

                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-bg-border">
                  <Button size="sm" variant="ghost" onClick={() => void handleClone(t.id)}>
                    Clone
                  </Button>
                  <Button size="sm" variant="danger" onClick={() => void handleDelete(t.id)}>
                    Delete
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Template" size="lg">
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Name</label>
            <input
              className="input"
              placeholder="e.g. Warm Connection Note"
              value={newTemplate.name}
              onChange={(e) => setNewTemplate((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">Type</label>
              <select
                className="input"
                value={newTemplate.type}
                onChange={(e) => setNewTemplate((p) => ({ ...p, type: e.target.value as typeof TEMPLATE_TYPES[number] }))}
              >
                {TEMPLATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1.5">A/B Variant</label>
              <select
                className="input"
                value={newTemplate.abVariant}
                onChange={(e) => setNewTemplate((p) => ({ ...p, abVariant: e.target.value as 'A' | 'B' | '' }))}
              >
                <option value="">None</option>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Body <span className="text-text-muted">(use {'{{first_name}}'}, {'{{company}}'}, {'{{role}}'})</span>
            </label>
            <textarea
              className="input resize-none font-mono text-xs"
              rows={8}
              placeholder="Hi {{first_name}}, I came across your work at {{company}}..."
              value={newTemplate.body}
              onChange={(e) => setNewTemplate((p) => ({ ...p, body: e.target.value }))}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button size="sm" isLoading={isSaving} onClick={() => void handleCreate()}>
              Create Template
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
