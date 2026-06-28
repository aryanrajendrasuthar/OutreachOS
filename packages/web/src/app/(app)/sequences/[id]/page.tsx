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
import type { Sequence, SequenceStep } from '@/lib/api';

function StepCard({ step }: { step: SequenceStep }) {
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
        <p className="text-xs text-text-muted font-mono">Template ID: {step.templateId}</p>
      </div>
    </div>
  );
}

export default function SequenceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { token } = useAuth();
  const { toast } = useToast();
  const [sequence, setSequence] = useState<Sequence | null>(null);
  const [steps, setSteps] = useState<SequenceStep[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  useEffect(() => {
    if (!token || !id) return;
    void api.sequences.get(token, id).then((res) => {
      if (res.data) {
        setSequence(res.data);
        setSteps(res.data.steps);
      }
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
          <Button size="sm">+ Add Step</Button>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={steps.map((s) => s.stepNumber)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-3">
            {steps.map((step, i) => (
              <div key={step.stepNumber}>
                <StepCard step={step} />
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
    </div>
  );
}
