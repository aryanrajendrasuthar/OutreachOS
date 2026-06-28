# Deployment Guide

## Production Stack

| Service | Provider | Notes |
|---------|----------|-------|
| Web frontend | Vercel / Railway | Next.js — auto-deploys from `main` |
| API server | Railway / Fly.io / Render | Node.js container |
| Queue worker | Railway / Fly.io | Separate process, needs Xvfb for Playwright |
| PostgreSQL | Supabase | Managed, with connection pooling via PgBouncer |
| Redis | Upstash | Serverless Redis, BullMQ-compatible |
| Email | Resend | Transactional email |
| CDN | Cloudflare | DNS + HTTPS termination |

## Environment Variables

All secrets must be set in your deployment platform's secret manager. **Never commit `.env` to the repository.**

See [`.env.example`](../.env.example) for the full list with descriptions.

## Deployment Steps

### 1. Set up Supabase

1. Create a new Supabase project
2. Copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
3. Enable Row Level Security on all tables (runs automatically via migration)
4. Enable email auth in Supabase Auth settings

### 2. Set up Upstash Redis

1. Create a Redis database at upstash.com
2. Copy `REDIS_URL` and `REDIS_TOKEN`

### 3. Generate secrets

```bash
# ENCRYPTION_KEY — 256-bit base64 key
openssl rand -base64 32

# JWT_SECRET, SESSION_SECRET
openssl rand -base64 64
```

### 4. Run database migrations

```bash
npm run db:migrate --workspace=@outreachos/shared
```

### 5. Deploy API

```bash
# Railway example
railway up --service api
```

### 6. Deploy Queue Worker

The queue worker requires Playwright with a real browser. On Linux:

```bash
# Install Xvfb for virtual display
apt-get install -y xvfb

# Start with virtual display
Xvfb :99 -screen 0 1920x1080x24 &
DISPLAY=:99 node packages/queue/dist/index.js
```

### 7. Deploy Frontend

```bash
# Vercel example
vercel --prod
```

## Health Checks

- API health: `GET /health` → `{ "status": "ok" }`
- Queue worker: monitor via BullMQ dashboard or logs

## Rollback

Tag the previous release and redeploy:
```bash
git checkout v1.0.0
railway up --service api
```
