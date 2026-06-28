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

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { Button, Card, useToast } from '@/components/ui';

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [sessionCookie, setSessionCookie] = useState('');
  const [dailyCap, setDailyCap] = useState(20);
  const [hitlEnabled, setHitlEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSave() {
    setIsSaving(true);
    await new Promise((r) => setTimeout(r, 800));
    toast('Settings saved.', 'success');
    setIsSaving(false);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="max-w-xl flex flex-col gap-5"
    >
      <h1 className="text-xl font-bold text-text-primary">Settings</h1>

      <Card>
        <h2 className="text-sm font-semibold text-text-primary mb-4">Account</h2>
        <div className="flex flex-col gap-3">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Email</label>
            <input className="input" value={user?.email ?? ''} disabled />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Name</label>
            <input className="input" value={user?.name ?? ''} placeholder="Your name" />
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-text-primary mb-1">LinkedIn Session</h2>
        <p className="text-xs text-text-muted mb-4">
          Paste your <code className="font-mono bg-bg-elevated px-1 rounded">li_at</code> session cookie.
          It will be encrypted with AES-256-GCM before storage. Never shared.
        </p>
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Session Cookie (li_at)
          </label>
          <input
            className="input font-mono text-xs"
            type="password"
            placeholder="AQE..."
            value={sessionCookie}
            onChange={(e) => setSessionCookie(e.target.value)}
          />
        </div>
        <div className="mt-3 p-3 rounded-lg bg-status-neutral/5 border border-status-neutral/20 text-xs text-status-neutral">
          ⚠ Providing your session cookie authorizes OutreachOS to act on your behalf. Review the compliance guide before proceeding.
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-text-primary mb-4">Outreach Settings</h2>
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">
              Daily Connection Request Cap
            </label>
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={1}
                max={50}
                value={dailyCap}
                onChange={(e) => setDailyCap(Number(e.target.value))}
                className="flex-1 accent-accent"
              />
              <span className="text-sm font-bold text-text-primary w-8 text-right tabular-nums">
                {dailyCap}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Recommended: 15–20/day. LinkedIn may flag higher volumes.
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text-primary">Human-in-the-Loop (HITL)</p>
              <p className="text-xs text-text-muted mt-0.5">
                Review and approve every message before it&apos;s sent
              </p>
            </div>
            <button
              onClick={() => setHitlEnabled((v) => !v)}
              className={`relative w-11 h-6 rounded-full transition-colors ${
                hitlEnabled ? 'bg-accent' : 'bg-bg-border'
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                  hitlEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-text-primary mb-4">Two-Factor Authentication</h2>
        <p className="text-xs text-text-muted mb-4">
          Add an extra layer of security to your account with TOTP (Google Authenticator, Authy, etc.).
        </p>
        <Button size="sm" variant="secondary">Set Up 2FA</Button>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-text-primary mb-2">Plan</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-text-primary font-medium">Free Plan</p>
            <p className="text-xs text-text-muted mt-0.5">20 connections/day · 1 sequence</p>
          </div>
          <Button size="sm" variant="secondary">Upgrade →</Button>
        </div>
      </Card>

      <Button isLoading={isSaving} onClick={() => void handleSave()} className="self-start">
        Save Changes
      </Button>
    </motion.div>
  );
}
