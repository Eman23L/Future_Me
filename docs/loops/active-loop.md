# Strengthen Notification Accountability Loop

## Goal

Make notifications work from the next upcoming activity/task while keeping task state as the source of truth.

## Why This Matters

Notifications are a core V1 feature. They are the accountability/nudge layer that brings the user back to active tasks. The daily dashboard and task state must still work without notifications.

## Current State

- `scheduled_reminders` rows exist.
- Test reminder works in debug/dev mode.
- Pending reminders exist.
- `src/services/whatsNext.ts` centralizes current/next/upcoming/overdue/completed state.
- Reminder generation uses incomplete planned tasks and personality-based copy.
- Completion resyncs reminders.
- Debug send-due/test controls are hidden from normal users.
- `api/reminders/send-due.js` is protected by `CRON_SECRET` in production.
- `api/cron/send-reminders.js` exists and is protected by `CRON_SECRET` in production.

## Files Likely Involved

- `src/services/whatsNext.ts`.
- `src/App.tsx`.
- `api/reminders/sync.js`.
- `api/reminders/send-due.js`.
- `api/cron/send-reminders.js`.
- Vercel/Supabase cron configuration docs.

## Constraints

- Keep current UI design.
- Protect due reminder sending with `CRON_SECRET`.
- Keep debug/admin sending controls hidden from normal users.
- Treat notifications as core V1 accountability nudges generated from task state.
- Do not make the app dependent on notifications.
- Do not change colours, fonts, spacing, cards, or buttons.

## Acceptance Criteria

- Due reminders can be sent automatically by a safe scheduler.
- Manual/debug sending is not required for normal users.
- Completed tasks do not continue to create future pending reminders.
- Missed/incomplete tasks stay active or overdue.
- Private keys remain server-only.
- Build passes.
- Scheduler checks pass.

## Test Commands

```bash
npm run build
npm run test:scheduler
```

## Next Recommended Loop

Configure production scheduler and add focused What's Next/reminder tests.
