# Supabase Reminder Cron

## Topic

Automatic due reminder sending.

## Why It Matters

Scheduled reminders exist, but due reminders need a reliable backend job so normal users do not depend on debug/manual buttons.

## Findings

- Supabase cron/pg_net can call a protected endpoint.
- Vercel endpoint should use `CRON_SECRET`.
- `api/cron/send-reminders.js` exists and is protected by `CRON_SECRET` in production.
- `POST /api/reminders/send-due` is the current protected due-sending endpoint.
- Debug sending is only for testing.
- Normal users should not manually send due reminders.
- Old pending reminders should not be sent late; pending rows older than 24 hours are cancelled and counted as stale.

## Implications For FutureMe

The next backend loop should wire automation without changing app behaviour, scheduling logic, notification logic, or UI style.

## Implementation Notes

Potential options:

- Vercel Cron calls `/api/reminders/send-due`.
- Supabase cron/pg_net calls the Vercel endpoint with `Authorization: Bearer <CRON_SECRET>`.
- Another scheduler calls the same protected endpoint.

## Risks

- Misconfigured cron could silently stop reminders.
- Missing `CRON_SECRET` should fail closed in production.
- Reminder automation should not make the app notification-dependent.
- If cron is down for more than 24 hours, old reminders should be cancelled rather than sent late.

## Next Questions

- Which scheduler is safest for the current Vercel/Supabase plan?
- Should failed reminders retry or stay failed for inspection?
