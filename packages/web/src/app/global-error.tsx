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

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#0D0D0D] flex items-center justify-center">
        <div className="text-center max-w-sm px-6">
          <p className="text-4xl mb-4">⚠</p>
          <h1 className="text-lg font-semibold text-white mb-2">Something went wrong</h1>
          <p className="text-sm text-[#9A9A9A] mb-6">
            An unexpected error occurred. The team has been notified.
          </p>
          <button
            onClick={reset}
            className="bg-[#6BBF3A] text-[#0D0D0D] font-semibold px-5 py-2 rounded text-sm hover:bg-[#7DD44A] transition-colors"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
