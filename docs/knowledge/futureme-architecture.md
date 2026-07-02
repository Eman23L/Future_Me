# FutureMe Architecture

## Frontend

- Vite.
- React.
- TypeScript.
- PWA manifest.
- Service worker.
- Local storage persistence through a repository pattern.
- Mobile-first UI.

## Hosting

- Vercel deployment.
- Custom domain.
- Cloudflare DNS.

## Backend

- Vercel API routes under `api/`.
- Supabase database for push subscriptions and scheduled reminders.
- Web Push/VAPID for push notification delivery.

## Core Logic Layers

- Input layer: onboarding, setup, fixed commitments, routines, rules, capacity.
- Scheduling engine: generates monthly task plan.
- Rules engine: constrains task placement.
- Capacity system: changes routine frequency and pressure.
- Completion system: records completed tasks.
- What’s Next Engine: determines current task, next task, overdue work, and recommended action.
- Daily dashboard: primary user experience.
- Optional notification layer: nudges the user back to the app.

## Notification Infrastructure

- Push subscriptions stored in Supabase.
- Scheduled reminders stored in Supabase.
- Send test reminder endpoint.
- Send due reminders endpoint.
- Production cron endpoint protected by `CRON_SECRET`.
- Future cron job through Vercel Cron, Supabase cron/pg_net, or another scheduler.

## Architecture Principle

Notifications are not the product architecture centre. The What’s Next Engine is the product architecture centre.

Notifications should be derived from schedule state and What’s Next state. They should never directly control task state.
