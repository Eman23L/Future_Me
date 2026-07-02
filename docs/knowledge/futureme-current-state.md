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
- Test reminders working.
- Pending scheduled reminders working.
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
- Cron endpoint: `api/cron/send-reminders.js`, protected by `CRON_SECRET` in production.
- Auth identity: browser Supabase auth can provide an account `user_id` for reminder ownership, but auth is not the main user experience yet.

## What Still Needs Work

- Automatic scheduled backend job for due reminders.
- Hide debug reminder buttons from normal users.
- Build proper What’s Next Engine.
- Improve missed and overdue task handling.
- Improve rescheduling logic.
- Improve daily schedule display quality.
- Improve schedule quality.
- Add weekly capacity loop.
- Add edit/reschedule task flow.
- Later: AI chat, auth/accounts if needed, and deeper research-backed planning rules.

## Product Correction

FutureMe is not push-notification-first. Notifications are optional nudges. The app must still work when notifications are off.

The source of truth is:

- Generated schedule.
- Task state.
- Completion status.
- Capacity state.
- Rules.
- Current time.
- What’s Next logic.
