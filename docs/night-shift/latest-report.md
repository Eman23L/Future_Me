# Night Shift Report

## Date

Initial report created for FutureMe loop engineering setup.

## Repo State

FutureMe has a working mobile-first PWA architecture with Vite, React, service worker support, Vercel API routes, Supabase reminder storage, and Web Push infrastructure.

## Build Status

Not run at report creation time. Run `npm run build` during night-shift review.

## Test Status

Not run at report creation time. Run `npm run test:scheduler` during night-shift review.

## Recent Changes

- Push notifications now work.
- Scheduled reminders exist.
- Test reminder works.
- Pending reminders exist.
- PWA install and iPhone standalone support exist.

## Bugs Noticed

- Need cron automation for due reminders.
- Need debug buttons hidden from normal users.
- Need What’s Next Engine.
- Need missed/overdue task handling.
- Need schedule quality cleanup.
- Need daily display cleanup.

## Docs That Need Updating

Update docs when reminder automation, What’s Next logic, schema changes, or schedule rules change.

## What’s Next Logic Review

The What’s Next Engine is now documented as the core product logic, but it is not built yet.

## Notification Logic Review

Notifications are optional nudges. They should be generated from schedule and What’s Next state and should never control task state.

## Schedule Quality Review

Current scheduler has capacity-based routine placement and checks. More work is needed for missed tasks, overload handling, and rescheduling.

## Suggested Next Loop

Automate due reminder sending.

## Suggested Codex Prompt

Use `docs/codex/codex-loop-prompt.md` with the goal: "Automate due reminder sending without changing UI style or making notifications the source of truth."

## Risk Level

Medium. Reminder automation touches production infrastructure and secrets.

## Human Approval Needed?

Yes, for choosing and configuring the production scheduler.
