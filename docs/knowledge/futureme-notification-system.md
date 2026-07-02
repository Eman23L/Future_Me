# FutureMe Notification System

## Product Role

Notifications are optional nudges. Notifications are not the product.

The app must work if notifications are disabled. The daily dashboard and What’s Next Engine are the source of truth.

Push notifications should be generated from schedule state and What’s Next state. Notifications should never directly control task state.

## iPhone PWA Requirements

- The app must be added to the iPhone Home Screen.
- The app must be opened in standalone PWA mode.
- A service worker is required.
- Notification permission must be granted from the installed app.
- VAPID keys are required for Web Push.

## Current Flow

- Frontend registers the service worker.
- Frontend subscribes through PushManager.
- `/api/push/subscribe` stores the subscription in Supabase.
- Schedule generation syncs planned reminders through `/api/reminders/sync`.
- Test reminder verifies delivery.
- Due reminders can be sent through the due reminder endpoint.
- Production cron route exists for automatic sending.

## Supabase Tables

- `push_subscriptions`: stores browser push endpoints.
- `scheduled_reminders`: stores pending, sent, failed, or cancelled reminder rows.

## Environment Variables

Frontend:

- `VITE_SUPABASE_URL`.
- `VITE_SUPABASE_ANON_KEY`.
- `VITE_VAPID_PUBLIC_KEY`.

Server:

- `SUPABASE_SERVICE_ROLE_KEY`.
- `VAPID_PUBLIC_KEY`.
- `VAPID_PRIVATE_KEY`.
- `VAPID_SUBJECT`.
- `CRON_SECRET`.

## Current Work Needed

- Automate due reminder sending with a scheduled backend job.
- Hide debug reminder buttons from normal users.
- Ensure reminder state follows schedule and What’s Next state.
- Keep the app useful when reminders are disabled.
