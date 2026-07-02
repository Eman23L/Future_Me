# FutureMe Current State

## What Exists Now

- Vite and React PWA.
- Mobile-first onboarding and setup flow.
- Monthly setup for fixed commitments.
- Fixed commitments for work, appointments, deadlines, and social plans.
- Flexible routines and activity toggles.
- Capacity-based scheduling.
- Daily dashboard.
- Completion buttons and local task completion state.
- PWA install support.
- iPhone standalone PWA support.
- iPhone push notification permission flow working when installed from Home Screen.
- Supabase `push_subscriptions` table.
- Supabase `scheduled_reminders` table.
- Test reminders working in debug/dev mode.
- Pending scheduled reminders working.
- Deterministic `src/services/whatsNext.ts` exists for current/next/upcoming/overdue/completed task state.
- Reminder generation is based on actual incomplete planned tasks.
- Personality-based notification copy is generated from the selected notification vibe.
- Manual send-due/test reminder controls are hidden from normal users and remain debug/dev only.
- Completion resyncs scheduled reminders so future pending reminders for completed tasks are cancelled or omitted.
- Vercel deployment.
- Custom domain with Cloudflare DNS.
- Approved soft wellness UI style.
- Account-scoped local storage support exists when a Supabase auth identity is present.
- Signed-out/local mode remains supported and should continue using the existing local storage flow.

## Current Technical Shape

- Frontend: Vite, React, TypeScript, service worker, local storage repository.
- Planner logic: `src/planner/autoPlanner.ts`.
- Scheduler checks: `npm run test:scheduler`.
- API routes: Vercel-style functions under `api/`.
- Push reminders: Web Push and VAPID with Supabase persistence.
- Protected due reminder endpoint: `api/reminders/send-due.js`, protected by `CRON_SECRET` in production.
- Cron endpoint: `api/cron/send-reminders.js`, protected by `CRON_SECRET` in production.
- Auth identity: browser Supabase auth can provide an account `user_id` for reminder ownership, but auth is not the main user experience yet.

## What Still Needs Work

- Production scheduler setup for due reminders.
- Add focused tests for What's Next/reminder generation.
- Improve missed and overdue task handling.
- Improve rescheduling logic.
- Improve daily schedule display quality.
- Improve schedule quality.
- Add weekly capacity loop.
- Add edit/reschedule task flow.
- Later: AI chat, auth/accounts if needed, and deeper research-backed planning rules.

## Product Correction

FutureMe is not push-notification-first, but personality-based notifications are a core V1 feature. Notifications are the accountability/nudge layer. The app must still work when notifications are off.

The source of truth is:

- Generated schedule.
- Task state.
- Completion status.
- Capacity state.
- Rules.
- Current time.
- What's Next logic.
