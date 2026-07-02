# Automate Due Reminder Sending

## Goal

Turn reminder sending from manual/debug button into an automatic backend job.

## Why This Matters

Scheduled reminders already exist, but normal users should not have to manually send due reminders. Automation should make reminder nudges reliable without making notifications the product.

## Current State

- `scheduled_reminders` rows exist.
- Test reminder works.
- Pending reminders exist.
- `api/cron/send-reminders.js` exists.
- Production cron route is protected by `CRON_SECRET`.
- Debug/admin sending controls still need to be hidden from normal users.

## Files Likely Involved

- `api/cron/send-reminders.js`.
- `api/reminders/send-due.js`.
- Vercel/Supabase cron configuration docs.
- UI file only if hiding debug controls is explicitly in the loop.

## Constraints

- Keep current UI design.
- Protect endpoint with `CRON_SECRET`.
- Hide admin/debug sending button from normal users eventually.
- Keep notifications as nudges only.
- Do not make the app dependent on notifications.
- Do not change colours, fonts, spacing, cards, or buttons.

## Acceptance Criteria

- Due reminders can be sent automatically by a safe scheduler.
- Manual/debug sending is not required for normal users.
- Private keys remain server-only.
- Build passes.
- Scheduler checks pass.

## Test Commands

```bash
npm run build
npm run test:scheduler
```

## Next Recommended Loop

Hide debug reminder buttons from normal users after automation is confirmed.
