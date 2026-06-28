# Outreach Sequences

## Overview

A **sequence** is an ordered series of automated outreach steps applied to a pool of prospects. Each step has a type, a delay, a template, and an optional condition.

## SequenceStep Schema

```ts
interface SequenceStep {
  stepNumber: number;          // 1-based, must be sequential
  type: 'connection_request' | 'message' | 'follow_up';
  delayDays: number;           // days after the previous step (0 = same day)
  templateId: string;          // UUID of a MessageTemplate
  condition?: 'always' | 'if_no_reply' | 'if_accepted';
  skipIfReplied: boolean;      // always set to true for follow_up steps
}
```

## Default Sequence (created on signup)

| Step | Day | Type               | Condition      | Skip If Replied |
|------|-----|--------------------|----------------|-----------------|
| 1    | 0   | connection_request | always         | false           |
| 2    | +1  | message            | if_accepted    | false           |
| 3    | +7  | message            | if_no_reply    | true            |
| 4    | +14 | follow_up          | if_no_reply    | true            |

## Worker Rules

1. **Reply check first** — Before processing any step, the worker queries `outreach_events` for `reply_received` events from this prospect. If found, the sequence enters `active_conversation` state and all future automated steps are skipped.

2. **Daily cap** — Connection requests are capped at `user.daily_request_cap` (default: 20) per calendar day. If the cap is reached, the job is delayed by 24 hours and retried.

3. **Human timing** — A random delay of 90–480 seconds is applied before every send action. The delay is applied inside the worker, not the automation service.

4. **HITL mode** — If `user.hitl_enabled = true`, the worker creates an `outreach_event` with `status = 'pending'` and stops. The event enters the approval queue at `/outreach/queue`. No send happens until the user explicitly approves via `POST /api/outreach/approve/:eventId`.

5. **Retry policy** — On Playwright errors, the BullMQ job is retried up to 3 times with exponential backoff (5s base). After 3 failures, the event is marked `failed` and a notification email is sent to the user.

6. **Logging** — Every action (success or failure) is logged to `outreach_events`. The `sent_at`, `error_message`, and `status` fields are always populated on completion.

## Condition Evaluation

- `always` — step fires regardless of previous state
- `if_accepted` — only fires if the prospect's status is `connected`
- `if_no_reply` — only fires if no `reply_received` event exists for this prospect
