-- OutreachOS — LinkedIn Management & Automation Platform
-- Copyright (c) 2026 Aryan Suthar. All Rights Reserved.
--
-- PROPRIETARY AND CONFIDENTIAL
-- Unauthorized copying, distribution, modification, or use of this file,
-- via any medium, is strictly prohibited without the express written
-- permission of the copyright owner.

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── Users ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "users" (
  "id"                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email"                   TEXT NOT NULL UNIQUE,
  "name"                    TEXT NOT NULL,
  "linkedin_profile_url"    TEXT,
  "linkedin_session_cookie" TEXT,
  "totp_secret"             TEXT,
  "totp_enabled"            BOOLEAN NOT NULL DEFAULT FALSE,
  "daily_request_cap"       INTEGER NOT NULL DEFAULT 20,
  "hitl_enabled"            BOOLEAN NOT NULL DEFAULT TRUE,
  "plan"                    TEXT NOT NULL DEFAULT 'free' CHECK ("plan" IN ('free', 'pro', 'enterprise')),
  "created_at"              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Prospects ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "prospects" (
  "id"                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"             UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "full_name"           TEXT NOT NULL,
  "linkedin_url"        TEXT NOT NULL,
  "headline"            TEXT,
  "company"             TEXT,
  "seniority_level"     TEXT CHECK ("seniority_level" IN ('intern', 'junior', 'mid', 'senior', 'staff', 'principal', 'director', 'vp', 'c_suite', 'founder')),
  "industry"            TEXT,
  "location"            TEXT,
  "mutual_connections"  INTEGER NOT NULL DEFAULT 0,
  "ai_fit_score"        INTEGER CHECK ("ai_fit_score" BETWEEN 0 AND 100),
  "profile_snapshot"    JSONB,
  "status"              TEXT NOT NULL DEFAULT 'not_contacted'
                        CHECK ("status" IN ('not_contacted', 'connection_sent', 'connected', 'messaged', 'replied', 'interested', 'declined', 'meeting_booked', 'archived')),
  "tags"                TEXT[] NOT NULL DEFAULT '{}',
  "notes"               TEXT,
  "created_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "prospects_user_id_idx" ON "prospects"("user_id");
CREATE INDEX IF NOT EXISTS "prospects_status_idx" ON "prospects"("user_id", "status");
CREATE INDEX IF NOT EXISTS "prospects_ai_fit_score_idx" ON "prospects"("user_id", "ai_fit_score" DESC NULLS LAST);

-- ─── Sequences ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "sequences" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"          UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name"             TEXT NOT NULL,
  "description"      TEXT,
  "steps"            JSONB NOT NULL DEFAULT '[]',
  "is_active"        BOOLEAN NOT NULL DEFAULT FALSE,
  "target_criteria"  JSONB,
  "created_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "sequences_user_id_idx" ON "sequences"("user_id");

-- ─── Outreach Events ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "outreach_events" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "prospect_id"   UUID NOT NULL REFERENCES "prospects"("id") ON DELETE CASCADE,
  "sequence_id"   UUID REFERENCES "sequences"("id") ON DELETE SET NULL,
  "user_id"       UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "event_type"    TEXT NOT NULL CHECK ("event_type" IN ('connection_request', 'message', 'follow_up', 'reply_received', 'error')),
  "message_body"  TEXT,
  "ai_generated"  BOOLEAN NOT NULL DEFAULT FALSE,
  "scheduled_at"  TIMESTAMPTZ,
  "sent_at"       TIMESTAMPTZ,
  "status"        TEXT NOT NULL DEFAULT 'pending'
                  CHECK ("status" IN ('pending', 'awaiting_approval', 'approved', 'rejected', 'sent', 'failed', 'skipped')),
  "error_message" TEXT,
  "metadata"      JSONB,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "outreach_events_user_id_idx"    ON "outreach_events"("user_id");
CREATE INDEX IF NOT EXISTS "outreach_events_prospect_id_idx" ON "outreach_events"("prospect_id");
CREATE INDEX IF NOT EXISTS "outreach_events_status_idx"     ON "outreach_events"("user_id", "status");
CREATE INDEX IF NOT EXISTS "outreach_events_scheduled_idx"  ON "outreach_events"("scheduled_at") WHERE "status" = 'pending';

-- ─── Message Templates ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "message_templates" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name"        TEXT NOT NULL,
  "type"        TEXT NOT NULL CHECK ("type" IN ('connection_request', 'message', 'follow_up', 'reply')),
  "body"        TEXT NOT NULL,
  "is_default"  BOOLEAN NOT NULL DEFAULT FALSE,
  "ab_variant"  TEXT CHECK ("ab_variant" IN ('A', 'B')),
  "performance" JSONB,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "message_templates_user_id_idx" ON "message_templates"("user_id");

-- ─── Analytics Snapshots ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "analytics_snapshots" (
  "id"                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"                UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "date"                   DATE NOT NULL,
  "connection_requests_sent" INTEGER NOT NULL DEFAULT 0,
  "connections_accepted"   INTEGER NOT NULL DEFAULT 0,
  "messages_sent"          INTEGER NOT NULL DEFAULT 0,
  "replies_received"       INTEGER NOT NULL DEFAULT 0,
  "meetings_booked"        INTEGER NOT NULL DEFAULT 0,
  "acceptance_rate"        NUMERIC(5,2),
  "reply_rate"             NUMERIC(5,2),
  "created_at"             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE("user_id", "date")
);

CREATE INDEX IF NOT EXISTS "analytics_snapshots_user_date_idx" ON "analytics_snapshots"("user_id", "date" DESC);

-- ─── Audit Log ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "audit_log" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"        UUID REFERENCES "users"("id") ON DELETE SET NULL,
  "action"         TEXT NOT NULL,
  "resource_type"  TEXT NOT NULL,
  "resource_id"    UUID,
  "ip_address"     INET,
  "user_agent"     TEXT,
  "timestamp"      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "audit_log_user_id_idx"   ON "audit_log"("user_id");
CREATE INDEX IF NOT EXISTS "audit_log_timestamp_idx" ON "audit_log"("timestamp" DESC);
CREATE INDEX IF NOT EXISTS "audit_log_resource_idx"  ON "audit_log"("resource_type", "resource_id");

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE "users"                ENABLE ROW LEVEL SECURITY;
ALTER TABLE "prospects"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "sequences"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "outreach_events"      ENABLE ROW LEVEL SECURITY;
ALTER TABLE "message_templates"    ENABLE ROW LEVEL SECURITY;
ALTER TABLE "analytics_snapshots"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_log"            ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_row" ON "users"
  USING (auth.uid() = id);

CREATE POLICY "prospects_owner_only" ON "prospects"
  USING (auth.uid() = user_id);

CREATE POLICY "sequences_owner_only" ON "sequences"
  USING (auth.uid() = user_id);

CREATE POLICY "outreach_events_owner_only" ON "outreach_events"
  USING (auth.uid() = user_id);

CREATE POLICY "message_templates_owner_only" ON "message_templates"
  USING (auth.uid() = user_id);

CREATE POLICY "analytics_snapshots_owner_only" ON "analytics_snapshots"
  USING (auth.uid() = user_id);

CREATE POLICY "audit_log_owner_read" ON "audit_log"
  FOR SELECT USING (auth.uid() = user_id);

-- ─── Triggers: updated_at auto-refresh ───────────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_updated_at_users
  BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

CREATE TRIGGER set_updated_at_prospects
  BEFORE UPDATE ON "prospects"
  FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
