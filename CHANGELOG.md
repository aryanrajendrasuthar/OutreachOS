# Changelog

All notable changes to OutreachOS are documented in this file.

Format: [Keep a Changelog](https://keepachangelog.com/en/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/spec/v2.0.0.html)

---

## [1.0.0] — 2026-06-28

### Added

**Foundation (Sprint 1)**
- Monorepo structure with Turborepo and npm workspaces
- Six packages: `shared`, `api`, `automation`, `ai`, `queue`, `web`
- Docker Compose for local PostgreSQL 16 + Redis 7
- Drizzle ORM schema: `users`, `prospects`, `sequences`, `outreach_events`, `message_templates`, `analytics_snapshots`, `audit_log`
- AES-256-GCM encryption utility for LinkedIn session cookies
- Environment variable validation via Zod at startup
- Supabase Auth integration (JWT, refresh tokens, TOTP 2FA stub)
- Security middleware: Helmet headers, Redis-backed rate limiting, IDOR ownership checks

**Core API (Sprint 2)**
- `POST/GET /api/auth/*` — signup, login, logout, refresh, me
- `GET/POST/PATCH/DELETE /api/prospects/*` — CRUD + bulk import + AI scoring trigger
- `GET/POST/PATCH/DELETE /api/sequences/*` — CRUD + start/pause/resume
- `GET/POST /api/outreach/*` — HITL approval queue, history
- `GET/POST /api/inbox/*` — inbox messages, reply, classify, hot-leads
- `GET /api/analytics/*` — overview, funnel, templates A/B, daily time-series
- `GET/POST/PATCH/DELETE /api/templates/*` — template library + clone

**Automation Engine (Sprint 3)**
- `LinkedInAutomationService` with Playwright + stealth plugin
- `sendConnectionRequest`, `sendMessage`, `scrapeProfile`, `searchProspects`, `checkInbox`, `isSessionValid`
- Human-like mouse movement, randomized viewport, human-typed messages

**AI Integration (Sprint 4)**
- `scoreProspect` — 0–100 fit score via Claude
- `generateConnectionNote` — 150–280 char personalized notes
- `generateMessage` — sequence step messages with token injection
- `classifyReplyIntent` — interested / neutral / declined / question
- `draftReply` — 3 reply options with varied tone

**Infrastructure**
- `Dockerfile.api`, `Dockerfile.web`, `nginx.conf`
- GitHub Actions: `ci.yml`, `security-scan.yml`, `release.yml`
- `.env.example` with all variables documented

**Documentation**
- `README.md` with setup guide and architecture diagram
- `SECURITY.md` with vulnerability disclosure policy
- `CONTRIBUTING.md` with internal development guidelines
- `docs/architecture.md`, `docs/api-reference.md`, `docs/outreach-sequences.md`
- `docs/compliance-guide.md`, `docs/deployment.md`
