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
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/lib/api';
import { Button, Card, useToast } from '@/components/ui';

export default function SettingsPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [dailyCap, setDailyCap] = useState(20);
  const [hitlEnabled, setHitlEnabled] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    if (!token) return;
    void Promise.all([
      api.auth.linkedinStatus(token),
      api.auth.me(token),
    ]).then(([status, me]) => {
      if (status.data?.connected) setConnected(true);
      if (me.data?.dailyRequestCap) setDailyCap(me.data.dailyRequestCap);
      if (me.data?.hitlEnabled !== undefined) setHitlEnabled(me.data.hitlEnabled);
    });
  }, [token]);

  async function handleSaveSettings() {
    if (!token) return;
    setIsSavingSettings(true);
    const res = await api.auth.updateSettings(token, { dailyRequestCap: dailyCap, hitlEnabled });
    if (res.success) toast('Settings saved.', 'success');
    else toast('Failed to save settings.', 'error');
    setIsSavingSettings(false);
  }

  async function handleConnectLinkedIn() {
    if (!token) return;
    setIsConnecting(true);
    toast('A browser window will open — log in to LinkedIn, then come back here.', 'info');
    try {
      // Long fetch: blocks until the user logs in (up to 5 min)
      const res = await api.auth.linkedinSetup(token);
      if (!res.success) throw new Error('Setup failed');
      setConnected(true);
      toast('LinkedIn connected! Automation is now fully autonomous.', 'success');
    } catch {
      toast('Connection failed or timed out. Please try again.', 'error');
    } finally {
      setIsConnecting(false);
    }
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
            <input className="input" value={user?.name ?? ''} placeholder="Your name" readOnly />
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold text-text-primary">LinkedIn Account</h2>
          {connected ? (
            <span className="text-xs font-medium text-status-success flex items-center gap-1">
              <span>●</span> Connected
            </span>
          ) : (
            <span className="text-xs font-medium text-status-warning flex items-center gap-1">
              <span>●</span> Not connected
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted mb-4">
          {connected
            ? 'Your LinkedIn session is active. The automation will run without any manual steps.'
            : 'Connect your LinkedIn account once — OutreachOS saves the session and handles everything automatically from then on.'}
        </p>
        {!connected ? (
          <Button size="sm" isLoading={isConnecting} onClick={() => void handleConnectLinkedIn()}>
            {isConnecting ? 'Waiting for login…' : 'Connect LinkedIn'}
          </Button>
        ) : (
          <Button size="sm" variant="secondary" isLoading={isConnecting} onClick={() => void handleConnectLinkedIn()}>
            {isConnecting ? 'Waiting for login…' : 'Reconnect LinkedIn'}
          </Button>
        )}
        {isConnecting && (
          <p className="mt-3 text-xs text-text-muted">
            Log in to LinkedIn in the browser window that just opened, then this page will update automatically.
          </p>
        )}
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

      <Button className="self-start" isLoading={isSavingSettings} onClick={() => void handleSaveSettings()}>
        Save Changes
      </Button>
    </motion.div>
  );
}
