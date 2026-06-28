# OutreachOS

**Intelligent LinkedIn outreach automation for job seekers and recruiters.**

OutreachOS automates personalized LinkedIn outreach through a full-stack platform — from profile discovery and AI-generated messages to sequence management and inbox classification. Built for high signal-to-noise: every message is crafted by AI, approved by you, and sent with human-like timing.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Browser (User)                         │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS
                    ┌────▼────┐
                    │  Next.js │  packages/web
                    │ Frontend │
                    └────┬─────┘
                         │ REST
                    ┌────▼─────┐
                    │  Express  │  packages/api
                    │    API    │
                    └──┬───┬───┘
                       │   │
          ┌────────────┘   └────────────────┐
          │                                 │
    ┌─────▼──────┐                   ┌──────▼──────┐
    │ PostgreSQL  │                   │    Redis     │
    │ (Supabase) │                   │  (Upstash)  │
    └─────────────┘                   └──────┬──────┘
                                             │
                                      ┌──────▼──────┐
                                      │   BullMQ    │  packages/queue
                                      │   Worker    │
                                      └──────┬──────┘
                                             │
                              ┌──────────────┼────────────────┐
                              │              │                │
                        ┌─────▼──────┐ ┌────▼───┐    ┌───────▼──────┐
                        │ Playwright  │ │ Claude │    │   Resend     │
                        │ Automation │ │   AI   │    │  (Emails)    │
                        └────────────┘ └────────┘    └──────────────┘
```

**Data flow:** User triggers search → Playwright scrapes profiles → Prospect created → Sequence assigned → BullMQ job created → Worker sends via Playwright → Event logged → Analytics updated.

---

## Prerequisites

- Node.js 20 LTS
- Docker & Docker Compose (for local PostgreSQL + Redis)
- A Supabase project (free tier works for dev)
- Anthropic API key
- Resend API key (optional for local dev)

---

## Local Development Setup

### 1. Clone the repository

```bash
git clone https://github.com/aryanrajendrasuthar/OutreachOS.git
cd OutreachOS/outreachos
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

```bash
cp .env.example .env
# Fill in all required values in .env
```

### 4. Start local services

```bash
cd infra && docker compose up -d
```

### 5. Run database migrations

```bash
npm run db:migrate
```

### 6. Start the development servers

```bash
# In separate terminals (or use turbo):
npm run dev --workspace=@outreachos/api
npm run dev --workspace=@outreachos/web
npm run dev --workspace=@outreachos/queue
```

---

## Running Tests

```bash
# Unit + integration tests
npm run test

# E2E tests (requires running app)
npm run test:e2e
```

---

## Environment Variables

See [.env.example](.env.example) for all variables with descriptions.

---

## Deployment

See [docs/deployment.md](docs/deployment.md) for the production deployment runbook.

---

## License

Proprietary — All Rights Reserved © 2026 Aryan Suthar.
Unauthorized use, copying, or distribution is strictly prohibited.

Contact: aryanrajendrasuthar@gmail.com
