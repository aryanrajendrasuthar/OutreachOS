# OutreachOS API Reference

Base URL: `http://localhost:3001` (dev) / `https://outreachos.com/api` (prod)

All endpoints return: `{ success: boolean, data?: T, error?: string, meta?: { total, page, limit } }`

Authentication: `Authorization: Bearer <access_token>` header required on all routes except `/api/auth/signup`, `/api/auth/login`, `/api/auth/refresh`.

---

## Auth

### `POST /api/auth/signup`
```json
Body: { "email": "string", "password": "string (min 8)", "name": "string" }
Response 201: { "success": true, "data": { "userId": "uuid" } }
```

### `POST /api/auth/login`
```json
Body: { "email": "string", "password": "string" }
Response 200: { "data": { "accessToken": "string", "expiresAt": number, "user": {...} } }
Sets HttpOnly cookie: refresh_token
```

### `POST /api/auth/logout`
Clears refresh_token cookie. Requires auth.

### `POST /api/auth/refresh`
Reads refresh_token cookie. Returns new accessToken.

### `GET /api/auth/me`
Returns `{ id, email }` of authenticated user.

---

## Prospects

### `GET /api/prospects`
Query: `page`, `limit`, `status`, `sortBy`, `sortOrder`

### `POST /api/prospects`
```json
Body: { "fullName", "linkedinUrl", "headline?", "company?", "seniorityLevel?", "industry?", "location?", "tags?", "notes?" }
```

### `POST /api/prospects/bulk`
```json
Body: { "prospects": [<ProspectInput>] }  // max 500
```

### `GET /api/prospects/:id`
### `PATCH /api/prospects/:id`
```json
Body: { "status?", "notes?", "tags?", "aiFitScore?" }
```

### `DELETE /api/prospects/:id`
Soft-deletes (sets status = 'archived').

### `POST /api/prospects/:id/score`
Enqueues AI fit scoring job.

---

## Sequences

### `GET /api/sequences`
### `POST /api/sequences`
```json
Body: { "name", "description?", "steps": [SequenceStep], "isActive?", "targetCriteria?" }
```

### `GET /api/sequences/:id`
### `PATCH /api/sequences/:id`
### `DELETE /api/sequences/:id`

### `POST /api/sequences/:id/start`
Enqueues all prospect jobs for this sequence.

### `POST /api/sequences/:id/pause`
Sets `is_active = false`.

### `POST /api/sequences/:id/resume`
Sets `is_active = true`.

---

## Outreach

### `GET /api/outreach/queue`
Returns pending events awaiting HITL approval.

### `POST /api/outreach/approve/:eventId`
Marks event sent immediately.

### `POST /api/outreach/reject/:eventId`
```json
Body: { "reason?": "string" }
```
Marks event skipped.

### `GET /api/outreach/history`
Full send history for authenticated user.

---

## Inbox

### `GET /api/inbox/messages`
All received messages (`reply_received` events).

### `GET /api/inbox/messages/:id`
### `POST /api/inbox/messages/:id/reply`
Enqueues reply job.

### `POST /api/inbox/messages/:id/classify`
Enqueues intent classification job.

### `GET /api/inbox/hot-leads`
Messages classified as `interested`.

---

## Analytics

### `GET /api/analytics/overview`
Last 30 days: requests_sent, accepted, messages_sent, replies_received, positive_replies, interviews_booked.

### `GET /api/analytics/funnel`
Conversion funnel: sent → accepted → replied → interviews.

### `GET /api/analytics/templates`
A/B performance per template.

### `GET /api/analytics/daily`
Time-series data for last 30 days.

---

## Templates

### `GET /api/templates`
### `POST /api/templates`
```json
Body: { "name", "type": "connection_note|welcome|job_inquiry|follow_up|custom", "body", "isDefault?", "abVariant?": "A"|"B" }
```
### `PATCH /api/templates/:id`
### `DELETE /api/templates/:id`
### `POST /api/templates/:id/clone`
