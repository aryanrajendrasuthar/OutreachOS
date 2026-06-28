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

import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'OutreachOS — Intelligent LinkedIn Outreach Automation',
};

const FEATURES = [
  {
    title: 'AI-Personalized Messages',
    desc: 'Every connection note and follow-up is crafted by AI using real profile data — not generic templates.',
  },
  {
    title: 'Smart Sequences',
    desc: 'Drag-and-drop multi-step outreach sequences with conditional logic, daily caps, and human-like timing.',
  },
  {
    title: 'Human-in-the-Loop',
    desc: 'Review and approve every message before it goes out. Full control, zero spam risk.',
  },
  {
    title: 'Inbox Intelligence',
    desc: 'Automatic intent classification. Hot leads surface instantly. AI-drafted reply options in seconds.',
  },
  {
    title: 'Stealth Automation',
    desc: 'Playwright with stealth plugins, randomized viewports, and human-like mouse movement — built to stay under the radar.',
  },
  {
    title: 'Real Analytics',
    desc: 'Conversion funnel from sent → accepted → replied → interview. A/B template performance. Daily time-series.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-bg-primary">
      <nav className="border-b border-bg-border px-6 py-4 flex items-center justify-between max-w-6xl mx-auto">
        <span className="text-lg font-bold">
          Outreach<span className="text-accent">OS</span>
        </span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-text-secondary hover:text-text-primary transition-colors">
            Sign In
          </Link>
          <Link
            href="/signup"
            className="text-sm bg-accent text-bg-primary font-semibold px-4 py-2 rounded hover:bg-accent-hover transition-colors"
          >
            Get Started
          </Link>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6">
        <section className="pt-24 pb-20 text-center">
          <div className="inline-flex items-center gap-2 bg-accent-subtle border border-accent-muted rounded-full px-4 py-1.5 text-xs text-accent font-medium mb-8">
            <span className="w-1.5 h-1.5 bg-accent rounded-full animate-pulse" />
            Proprietary — Private Beta
          </div>
          <h1 className="text-5xl font-bold text-text-primary leading-tight mb-6">
            LinkedIn outreach
            <br />
            <span className="text-accent">at signal quality</span>
          </h1>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto mb-10">
            OutreachOS automates your LinkedIn outreach with AI-personalized messages, smart sequences,
            and human-in-the-loop control — so every message feels human, because it is.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 bg-accent text-bg-primary font-semibold px-8 py-4 rounded-lg text-base hover:bg-accent-hover transition-colors"
          >
            Start outreaching →
          </Link>
        </section>

        <section className="pb-24">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f) => (
              <div key={f.title} className="card p-5">
                <h3 className="text-sm font-semibold text-text-primary mb-2">{f.title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="border-t border-bg-border py-12 text-center">
          <p className="text-sm text-text-muted">
            © 2026 Aryan Suthar — All Rights Reserved
          </p>
        </section>
      </main>
    </div>
  );
}
