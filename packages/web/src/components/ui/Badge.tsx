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

type BadgeVariant =
  | 'default'
  | 'accent'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-bg-elevated text-text-secondary border border-bg-border',
  accent: 'bg-accent-subtle text-accent border border-accent-muted',
  success: 'bg-status-interested/10 text-status-interested border border-status-interested/20',
  warning: 'bg-status-neutral/10 text-status-neutral border border-status-neutral/20',
  danger: 'bg-status-declined/10 text-status-declined border border-status-declined/20',
  info: 'bg-status-question/10 text-status-question border border-status-question/20',
  muted: 'bg-bg-primary text-text-muted border border-bg-border',
};

const STATUS_MAP: Record<string, BadgeVariant> = {
  queued: 'muted',
  requested: 'info',
  connected: 'accent',
  replied: 'success',
  warm: 'accent',
  interview: 'success',
  hired: 'success',
  archived: 'muted',
  declined: 'danger',
  interested: 'success',
  neutral: 'warning',
  question: 'info',
  pending: 'warning',
  sent: 'accent',
  failed: 'danger',
  skipped: 'muted',
};

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
        ${variantClasses[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const variant = STATUS_MAP[status] ?? 'default';
  return <Badge variant={variant}>{status}</Badge>;
}
