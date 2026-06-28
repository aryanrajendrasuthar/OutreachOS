# OutreachOS — System Architecture

## Component Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  User Browser                                                    │
│  Next.js 14 (App Router) — packages/web                         │
│  Tailwind CSS · Framer Motion · TanStack Table · dnd-kit        │
│  Recharts · Supabase SSR auth client                            │
└────────────────────────────┬─────────────────────────────────────┘
                             │ HTTPS / JWT Bearer
┌────────────────────────────▼─────────────────────────────────────┐
│  Express 5 API Server — packages/api (port 3001)                │
│  Helmet · CORS · Pino · Rate Limiter · Zod · Drizzle ORM        │
│  Routes: /auth /prospects /sequences /outreach /inbox            │
│          /analytics /templates                                   │
└──────────────────┬──────────────────────┬────────────────────────┘
                   │                      │
      ┌────────────▼──────┐   ┌───────────▼───────────┐
      │  PostgreSQL 16     │   │  Redis 7 (Upstash)    │
      │  (Supabase)        │   │  BullMQ queues        │
      │  Row Level Security│   │  Rate limit counters  │
      │  6 tables          │   │  Session cache        │
      └────────────────────┘   └───────────┬───────────┘
                                           │
                              ┌────────────▼────────────┐
                              │  BullMQ Worker           │
                              │  packages/queue          │
                              │  concurrency: 1          │
                              │  retries: 3 (exponential)│
                              └──────────┬───────────────┘
                                         │
                    ┌────────────────────┼──────────────────────┐
                    │                    │                      │
         ┌──────────▼──────────┐ ┌──────▼──────┐ ┌────────────▼──┐
         │  Playwright Engine  │ │  Claude API  │ │  Resend Email  │
         │  packages/automation│ │  packages/ai │ │  Error alerts  │
         │  Stealth plugin     │ │  claude-sonnet│ └───────────────┘
         │  Human-like delays  │ │  Max 1000 tok │
         └─────────────────────┘ └──────────────┘
```

## Data Flow

### Outreach Sequence Flow

```
1. User creates Prospect (manually or via LinkedIn search)
2. User assigns Prospect to a Sequence
3. API enqueues BullMQ jobs for each sequence step with scheduled_at timestamps
4. BullMQ Worker picks up job when scheduled_at arrives:
   a. Checks if prospect has replied → if yes, mark active_conversation, skip
   b. Checks daily request cap → if exceeded, delay 24h
   c. If HITL enabled → set event status=pending, stop
   d. Generate AI message via Claude API
   e. Wait random 90–480s delay
   f. Execute action via Playwright (send connection / message)
   g. Log outreach_event (status=sent or failed)
   h. Update prospect status
5. If all steps complete → sequence_completed event logged
```

### HITL (Human-in-the-Loop) Flow

```
Worker → creates outreach_event (status=pending)
User → reviews pending events in /outreach/queue
User → approves (POST /api/outreach/approve/:eventId)
       → event sent immediately
     → rejects (POST /api/outreach/reject/:eventId)
       → event status=skipped
```

### AI Integration Flow

```
scoreProspect     → system prompt + prospect data → Claude → integer 0–100
generateNote      → system prompt + profile → Claude → 150–280 char string
generateMessage   → system prompt + template + prospect → Claude → <300 word string
classifyIntent    → system prompt + message body → Claude → enum string
draftReply        → system prompt + thread → Claude → JSON array[3]
```

## Security Architecture

```
Layers of defense:
1. TLS (nginx terminates, enforces HSTS)
2. CORS (only NEXT_PUBLIC_APP_URL allowed)
3. Helmet headers (CSP, X-Frame-Options, etc.)
4. JWT validation (Supabase Auth, 15-min access tokens)
5. Rate limiting (Redis, per-IP for auth, per-user for API)
6. Zod input validation (every endpoint)
7. Drizzle ORM parameterized queries (no SQL injection)
8. IDOR ownership assertions (every mutation)
9. Supabase Row Level Security (auth.uid() = user_id)
10. AES-256-GCM at-rest encryption (LinkedIn cookies)
11. Audit log (all write operations)
```

## Package Dependency Graph

```
web     → shared
api     → shared
queue   → shared, ai, automation
ai      → shared
automation → shared
shared  → (no internal deps)
```
