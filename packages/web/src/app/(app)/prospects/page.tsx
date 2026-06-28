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

import { useEffect, useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { Button, StatusBadge, Avatar, ProgressBar, SkeletonRow } from '@/components/ui';
import { api } from '@/lib/api';
import type { Prospect } from '@/lib/api';

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

export default function ProspectsPage() {
  const { token } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

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

  return (
    <div className="flex flex-col h-[calc(100vh-48px)]">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-xl font-bold text-text-primary">Prospects</h1>
          <p className="text-sm text-text-secondary mt-0.5">{prospects.length} total</p>
        </div>
        <Button size="sm">+ Add Prospect</Button>
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
            <Button size="sm" variant="secondary">Add to Sequence</Button>
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
    </div>
  );
}
