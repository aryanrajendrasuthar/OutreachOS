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

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  positive?: boolean;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, change, positive, icon }: StatCardProps) {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-text-secondary uppercase tracking-wider">
          {label}
        </span>
        {icon && (
          <span className="text-accent opacity-70">{icon}</span>
        )}
      </div>
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-text-primary tabular-nums">{value}</span>
        {change && (
          <span
            className={`text-xs font-medium ${
              positive ? 'text-status-interested' : 'text-status-declined'
            }`}
          >
            {change}
          </span>
        )}
      </div>
    </div>
  );
}
