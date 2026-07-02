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

import { useEffect, useRef, useState, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button, StatusBadge, Avatar, ProgressBar, SkeletonRow, useToast } from '@/components/ui';
import { api } from '@/lib/api';
import type { Prospect, Sequence } from '@/lib/api';

const STATUS_OPTIONS = ['queued', 'requested', 'connected', 'replied', 'warm', 'interview', 'hired', 'archived', 'declined'];

const columnHelper = createColumnHelper<Prospect>();

const columns = [
  columnHelper.accessor('fullName', {
    header: 'Name',
    cell: (info) => (
      <div className="flex items-center gap-3">
        <Avatar name={info.getValue()} size="sm" />
        <div className="min-w-0">
          <Link
            href={`/prospects/${info.row.original.id}`}
            className="text-sm font-medium text-text-primary hover:text-accent transition-colors truncate block"
          >
            {info.getValue()}
          </Link>
          <p className="text-xs text-text-muted truncate">{info.row.original.headline ?? ''}</p>
        </div>
      </div>
    ),
  }),
  columnHelper.accessor('company', {
    header: 'Company',
    cell: (info) => <span className="text-sm text-text-secondary">{info.getValue() ?? '—'}</span>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('aiFitScore', {
    header: 'Fit Score',
    cell: (info) => {
      const score = info.getValue();
      if (score == null) return <span className="text-xs text-text-muted">—</span>;
      return (
        <div className="flex items-center gap-2 w-24">
          <ProgressBar value={score} max={100} height="4px" />
          <span className="text-xs text-text-secondary tabular-nums">{score}</span>
        </div>
      );
    },
  }),
  columnHelper.accessor('updatedAt', {
    header: 'Last Activity',
    cell: (info) => (
      <span className="text-xs text-text-muted">
        {new Date(info.getValue()).toLocaleDateString()}
      </span>
    ),
  }),
];

const BLANK_PROSPECT = { fullName: '', linkedinUrl: '', headline: '', company: '', location: '' };

export default function ProspectsPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newProspect, setNewProspect] = useState(BLANK_PROSPECT);
  const [isSaving, setIsSaving] = useState(false);
  const [isEnrollOpen, setIsEnrollOpen] = useState(false);
  const [sequences, setSequences] = useState<Sequence[]>([]);
  const [enrollSeqId, setEnrollSeqId] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) return;
    setIsLoading(true);
    const params: Record<string, string> = { limit: '500' };
    if (statusFilter) params['status'] = statusFilter;
    void api.prospects.list(token, params).then((res) => {
      if (res.data) setProspects(res.data);
      setIsLoading(false);
    });
  }, [token, statusFilter]);

  const openEnroll = useCallback(() => {
    if (!token) return;
    void api.sequences.list(token).then((res) => {
      if (res.data) setSequences(res.data);
    });
    setEnrollSeqId('');
    setIsEnrollOpen(true);
  }, [token]);

  const table = useReactTable({
    data: prospects,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  const rows = table.getRowModel().rows;

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 10,
  });

  const virtualRows = virtualizer.getVirtualItems();
  const totalSize = virtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? (virtualRows[0]?.start ?? 0) : 0;
  const paddingBottom = virtualRows.length > 0
    ? totalSize - (virtualRows[virtualRows.length - 1]?.end ?? 0)
    : 0;

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleEnroll() {
    if (!token || !enrollSeqId || selectedIds.size === 0) return;
    setIsEnrolling(true);
    const res = await api.outreach.enroll(token, {
      prospectIds: Array.from(selectedIds),
      sequenceId: enrollSeqId,
    });
    if (res.success) {
      toast(`${selectedIds.size} prospect(s) added to sequence.`, 'success');
      setIsEnrollOpen(false);
      setSelectedIds(new Set());
    } else {
      toast('Failed to enroll prospects.', 'error');
    }
    setIsEnrolling(false);
  }

  async function handleAdd() {
    if (!token || !newProspect.fullName || !newProspect.linkedinUrl) return;
    setIsSaving(true);
    const res = await api.prospects.create(token, newProspect);
    if (res.success && res.data) {
      setProspects((prev) => [res.data!, ...prev]);
      setIsAddOpen(false);
      setNewProspect(BLANK_PROSPECT);
      toast('Prospect added.', 'success');
    } else {
      toast('Failed to add prospect.', 'error');
    }
    setIsSaving(false);
  }

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Prospects</h1>
          <p className="text-sm text-text-secondary mt-0.5">{prospects.length} total</p>
        </div>
        <Button size="sm" onClick={() => setIsAddOpen(true)}>+ Add Prospect</Button>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input w-44"
        >
          <option value="">All statuses</option>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        {selectedIds.size > 0 && (
          <motion.div
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 ml-auto"
          >
            <span className="text-xs text-text-secondary">{selectedIds.size} selected</span>
            <Button size="sm" variant="secondary">Archive</Button>
            <Button size="sm" variant="secondary" onClick={openEnroll}>Add to Sequence</Button>
          </motion.div>
        )}
      </div>

      <div className="card flex-1 overflow-hidden flex flex-col">
        <div className="grid border-b border-bg-border bg-bg-elevated"
          style={{ gridTemplateColumns: '40px 2fr 1.5fr 1fr 1fr 1fr' }}>
          <div className="px-3 py-2.5">
            <input type="checkbox" className="accent-accent" onChange={() => {
              if (selectedIds.size === rows.length) setSelectedIds(new Set());
              else setSelectedIds(new Set(rows.map((r) => r.original.id)));
            }} checked={selectedIds.size === rows.length && rows.length > 0} />
          </div>
          {table.getFlatHeaders().map((header) => (
            <div
              key={header.id}
              className="px-3 py-2.5 text-xs font-medium text-text-muted uppercase tracking-wider cursor-pointer select-none hover:text-text-primary transition-colors"
              onClick={header.column.getToggleSortingHandler()}
            >
              {flexRender(header.column.columnDef.header, header.getContext())}
              {header.column.getIsSorted() === 'asc' && ' ↑'}
              {header.column.getIsSorted() === 'desc' && ' ↓'}
            </div>
          ))}
        </div>

        <div ref={parentRef} className="flex-1 overflow-y-auto">
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-text-muted text-sm">No prospects found.</div>
          ) : (
            <div style={{ height: totalSize }}>
              {paddingTop > 0 && <div style={{ height: paddingTop }} />}
              {virtualRows.map((vRow) => {
                const row = rows[vRow.index]!;
                const isSelected = selectedIds.has(row.original.id);
                return (
                  <div
                    key={row.id}
                    className={`grid border-b border-bg-border hover:bg-bg-elevated transition-colors ${isSelected ? 'bg-accent-subtle' : ''}`}
                    style={{ gridTemplateColumns: '40px 2fr 1.5fr 1fr 1fr 1fr', height: vRow.size }}
                  >
                    <div className="flex items-center px-3">
                      <input
                        type="checkbox"
                        className="accent-accent"
                        checked={isSelected}
                        onChange={() => toggleSelect(row.original.id)}
                      />
                    </div>
                    {row.getVisibleCells().map((cell) => (
                      <div key={cell.id} className="flex items-center px-3 py-2">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </div>
                    ))}
                  </div>
                );
              })}
              {paddingBottom > 0 && <div style={{ height: paddingBottom }} />}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isEnrollOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            onClick={(e) => { if (e.target === e.currentTarget) setIsEnrollOpen(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="card w-full max-w-sm mx-4 flex flex-col gap-4"
            >
              <h2 className="text-base font-semibold text-text-primary">Add to Sequence</h2>
              <p className="text-xs text-text-secondary">{selectedIds.size} prospect(s) selected</p>
              {sequences.length === 0 ? (
                <p className="text-xs text-status-warning">No sequences yet — create one on the Sequences page first.</p>
              ) : (
                <select className="input w-full" value={enrollSeqId}
                  onChange={(e) => setEnrollSeqId(e.target.value)}>
                  <option value="">Select a sequence…</option>
                  {sequences.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setIsEnrollOpen(false)}>Cancel</Button>
                <Button size="sm" isLoading={isEnrolling}
                  onClick={() => void handleEnroll()}
                  disabled={!enrollSeqId}>
                  Enroll
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
              <h2 className="text-base font-semibold text-text-primary">Add Prospect</h2>
              <div className="flex flex-col gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Full Name *</label>
                  <input className="input w-full" placeholder="Jane Smith" value={newProspect.fullName}
                    onChange={(e) => setNewProspect((p) => ({ ...p, fullName: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">LinkedIn URL *</label>
                  <input className="input w-full" placeholder="https://linkedin.com/in/janesmith"
                    value={newProspect.linkedinUrl}
                    onChange={(e) => setNewProspect((p) => ({ ...p, linkedinUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Headline</label>
                  <input className="input w-full" placeholder="Engineering Manager at Acme"
                    value={newProspect.headline}
                    onChange={(e) => setNewProspect((p) => ({ ...p, headline: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Company</label>
                  <input className="input w-full" placeholder="Acme Corp"
                    value={newProspect.company}
                    onChange={(e) => setNewProspect((p) => ({ ...p, company: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-secondary mb-1.5">Location</label>
                  <input className="input w-full" placeholder="San Francisco, CA"
                    value={newProspect.location}
                    onChange={(e) => setNewProspect((p) => ({ ...p, location: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="secondary" size="sm" onClick={() => setIsAddOpen(false)}>Cancel</Button>
                <Button size="sm" isLoading={isSaving}
                  onClick={() => void handleAdd()}
                  disabled={!newProspect.fullName || !newProspect.linkedinUrl}>
                  Add Prospect
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
