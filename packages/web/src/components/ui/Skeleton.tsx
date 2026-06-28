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

interface SkeletonProps {
  className?: string;
  width?: string;
  height?: string;
}

export function Skeleton({ className = '', width, height }: SkeletonProps) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{ width, height: height ?? '1rem' }}
    />
  );
}

export function SkeletonStatCard() {
  return (
    <div className="card p-5 flex flex-col gap-3">
      <Skeleton width="60%" height="0.75rem" />
      <Skeleton width="40%" height="2rem" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-bg-border">
      <Skeleton className="rounded-full" width="2rem" height="2rem" />
      <div className="flex-1 flex flex-col gap-1.5">
        <Skeleton width="30%" />
        <Skeleton width="50%" height="0.75rem" />
      </div>
      <Skeleton width="5rem" />
      <Skeleton width="4rem" />
    </div>
  );
}
