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
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useAuth } from '@/context/AuthContext';
import { Badge, Button, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import type { Sequence, SequenceStep, MessageTemplate } from '@/lib/api';

const BLANK_STEP = {
  type: 'connection_request' as SequenceStep['type'],
  delayDays: 0,
  templateId: '',
  condition: 'always' as SequenceStep['condition'],
  skipIfReplied: true,
};

function StepCard({ step, templates, onRemove }: { step: SequenceStep; templates: MessageTemplate[]; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: step.stepNumber,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const typeColor = {
    connection_request: 'border-accent bg-accent-subtle',
    message: 'border-status-question/30 bg-status-question/5',
    follow_up: 'border-status-neutral/30 bg-status-neutral/5',
  }[step.type];

  const typeLabel = {
    connection_request: 'Connection Request',
    message: 'Message',
    follow_up: 'Follow-up',
  }[step.type];

  return (
    <div ref={setNodeRef} style={style} className={`flex items-start gap-3 p-4 rounded-lg border ${typeColor}`}>
      <button
        {...attributes}
        {...listeners}
        className="mt-0.5 text-text-muted hover:text-text-primary cursor-grab active:cursor-grabbing"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
        </svg>
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-text-primary">Step {step.stepNumber}</span>
          <Badge>{typeLabel}</Badge>
          {step.delayDays > 0 && (
            <Badge variant="muted">+{step.delayDays}d delay</Badge>
          )}
          {step.condition && step.condition !== 'always' && (
            <Badge variant="info">{step.condition}</Badge>
          )}
          {step.skipIfReplied && (
            <Badge variant="warning">skip if replied</Badge>
          )}
        </div>
        <p className="text-xs text-text-muted font-mono">
          {templates.find((t) => t.id === step.templateId)?.name ?? step.templateId}
        </p>
      </div>
      <button onClick={onRemove} className="text-text-muted hover:text-status-error transition-colors ml-2 shrink-0">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export default function SequenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { toast } = useToast();
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newStep, setNewStep] = useState(BLANK_STEP);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!token || !id) return;
    void Promise.all([
      api.sequences.get(token, id),
      api.templates.list(token),
    ]).then(([seqRes, tplRes]) => {
      if (seqRes.data) {
        setSequence(seqRes.data);
        setSteps(seqRes.data.steps);
      }
      if (tplRes.data) setTemplates(tplRes.data);
      setIsLoading(false);
    });
  }, [token, id]);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSteps((prev) => {
      const oldIdx = prev.findIndex((s) => s.stepNumber === active.id);
      const newIdx = prev.findIndex((s) => s.stepNumber === over.id);
      const reordered = arrayMove(prev, oldIdx, newIdx);
      return reordered.map((s, i) => ({ ...s, stepNumber: i + 1 }));
    });
  }

  function handleAddStep() {
    if (!newStep.templateId) return;
    const step: SequenceStep = {
      ...newStep,
      stepNumber: steps.length + 1,
      skipIfReplied: newStep.skipIfReplied,
    };
    setSteps((prev) => [...prev, step]);
    setIsAddOpen(false);
    setNewStep(BLANK_STEP);
  }

  async function removeStep(stepNumber: number) {
    setSteps((prev) =>
      prev
        .filter((s) => s.stepNumber !== stepNumber)
        .map((s, i) => ({ ...s, stepNumber: i + 1 })),
    );
  }

  async function saveSteps() {
    if (!token || !id) return;
    setIsSaving(true);
    const res = await api.sequences.update(token, id, { steps });
    if (res.success) toast('Sequence saved.', 'success');
    else toast('Failed to save.', 'error');
    setIsSaving(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!sequence) return <p className="text-text-muted text-sm">Sequence not found.</p>;

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Link href="/sequences" className="text-xs text-text-muted hover:text-accent transition-colors">
          ← Sequences
        </Link>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-text-primary">{sequence.name}</h1>
          {sequence.description && (
            <p className="text-sm text-text-secondary mt-1">{sequence.description}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" isLoading={isSaving} onClick={() => void saveSteps()}>
            Save Order
          </Button>
          <Button size="sm" onClick={() => setIsAddOpen(true)}>+ Add Step</Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={steps.map((s) => s.stepNumber)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {steps.map((step, i) => (
              <div key={step.stepNumber}>
                <StepCard step={step} templates={templates} onRemove={() => void removeStep(step.stepNumber)} />
                {i < steps.length - 1 && (
                  <div className="flex justify-center my-1">
                    <div className="w-px h-4 bg-bg-border" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {steps.length === 0 && (
        <div className="card p-10 text-center text-text-muted text-sm">
          No steps yet. Add a step to build your sequence.
        </div>
      )}

      <AnimatePresence>
        {isAddOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={(e) => { if (e.target === e.currentTarget) setIsAddOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card w-full max-w-md mx-4 flex flex-col gap-4"
            >
              <h2 className="text-base font-semibold text-text-primary">Add Step</h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Step Type</label>
                  <select className="input w-full" value={newStep.type}
                    onChange={(e) => setNewStep((s) => ({ ...s, type: e.target.value as SequenceStep['type'] }))}>
                    <option value="connection_request">Connection Request</option>
                    <option value="message">Message</option>
                    <option value="follow_up">Follow-up</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Template *</label>
                  {templates.length === 0 ? (
                    <p className="text-xs text-status-warning">No templates yet — create one first on the Templates page.</p>
                  ) : (
                    <select className="input w-full" value={newStep.templateId}
                      onChange={(e) => setNewStep((s) => ({ ...s, templateId: e.target.value }))}>
                      <option value="">Select a template…</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>{t.name} ({t.type})</option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Delay (days after previous step)</label>
                  <input type="number" className="input w-full" min={0} max={30}
                    value={newStep.delayDays}
                    onChange={(e) => setNewStep((s) => ({ ...s, delayDays: Number(e.target.value) }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Condition</label>
                  <select className="input w-full" value={newStep.condition}
                    onChange={(e) => setNewStep((s) => ({ ...s, condition: e.target.value as SequenceStep['condition'] }))}>
                    <option value="always">Always send</option>
                    <option value="if_no_reply">Only if no reply</option>
                    <option value="if_accepted">Only if accepted</option>
                  </select>
                </div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" className="accent-accent"
                    checked={newStep.skipIfReplied}
                    onChange={(e) => setNewStep((s) => ({ ...s, skipIfReplied: e.target.checked }))} />
                  <span className="text-xs text-text-secondary">Skip if prospect has replied</span>
                </label>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button size="sm" onClick={handleAddStep} disabled={!newStep.templateId}>
                  Add Step
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
