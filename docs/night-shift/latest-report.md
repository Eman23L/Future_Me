# Night Shift Report

## Date

Updated after notification accountability loop work.

## Repo State

FutureMe has a working mobile-first PWA architecture with Vite, React, service worker support, Vercel API routes, Supabase reminder storage, Web Push infrastructure, account-scoped identity support, and a first deterministic What's Next engine.

## Build Status

Latest local build passed during this loop.

## Test Status

Run `npm run test:scheduler` before closing the loop.

## Recent Changes

- Notifications are documented as a core V1 accountability feature.
- Reminder generation is centralized in `src/services/whatsNext.ts`.
- Notification copy variation is centralized in `src/services/notificationCopy.ts`.
- Dashboard reminder copy uses the What's Next state.
- Pending reminders older than 24 hours are cancelled and counted as stale by the due sender.
- Completion triggers reminder resync so completed tasks stop producing future pending reminders.
- Manual send-due/test controls are debug/dev only.
- `POST /api/reminders/send-due` is protected by `CRON_SECRET` in production.
- Reminder sync cancels stale pending reminders instead of cancelling every pending month reminder before upsert.

## Bugs Noticed

- Production scheduler still needs to be configured for due reminders.
- Need API-level due sender tests if route mocking is added.
- Production may need one-time cleanup SQL for old June pending reminders.
- Need missed/overdue task handling.
- Need schedule quality cleanup.
- Need daily display cleanup.

## Docs That Need Updating

Update docs when production cron is configured, What’s Next tests are added, schema changes, or missed-task rules change.

## What's Next Logic Review

The first deterministic What's Next engine exists in `src/services/whatsNext.ts` and powers reminder/dashboard copy. It still needs deeper missed-task and reschedule rules.

## Notification Logic Review

Notifications are a core V1 accountability feature. They are generated from schedule/What's Next task state, use seeded variation banks for human copy, and must never replace completion/task state.

## Schedule Quality Review

Current scheduler has capacity-based routine placement and checks. More work is needed for missed tasks, overload handling, and rescheduling.

## Suggested Next Loop

Configure production scheduler and clean up any existing old pending reminders.

## Suggested Codex Prompt

Use `docs/codex/codex-loop-prompt.md` with the goal: "Configure production due-reminder scheduling and add focused tests for What's Next reminder generation."

## Risk Level

Medium. Reminder automation touches production infrastructure and secrets.

## Human Approval Needed?

Yes, for choosing and configuring the production scheduler.
