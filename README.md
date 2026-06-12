# Plan My Month

Version 1 of a local-first PWA monthly planner for neurodivergent users, shift workers, and people managing executive-function overload.

## Features

- Installable PWA shell with manifest, service worker, offline app shell caching, theme colour, and placeholder icon.
- Mobile-first purple and white responsive UI.
- Local storage persistence through a repository pattern.
- Typed data models and central `PlannerService` so Local Storage can later be swapped for Supabase.
- Settings for wake time, bedtime, and notification personality.
- Monthly inputs for work shifts, deadlines, appointments, and social events.
- Repeating routines with frequency, preferred day/time, effort level, category, and active toggle.
- Preset personal rules plus custom rule text.
- Capacity mode before generation: high, normal, tired, or survival.
- Basic auto-planner that blocks sleep first, adds fixed commitments, applies recovery/prep rules, then places routines around conflicts.
- Daily dashboard with time blocks, category colours, completion tracking, missed tasks, and rescheduling.

## Run Locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Vite.

## Build

```bash
npm run build
```

## Level 2 Push Reminders

FutureMe supports real Web Push reminders through Vercel API routes, a service worker, VAPID keys, Supabase storage, and a Vercel Cron sender.

### Supabase Setup

1. Create a Supabase project.
2. Open the SQL editor.
3. Run the schema in `supabase.sql`.

This creates:

- `push_subscriptions`
- `scheduled_reminders`

### Generate VAPID Keys

```bash
npm run generate:vapid
```

Copy the printed values into your local `.env` file and into Vercel.

### Environment Variables

Frontend-safe:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VAPID_PUBLIC_KEY=
```

`VAPID_PUBLIC_KEY` is returned to the browser by `/api/push/public-key`; the private VAPID key is never exposed.

Server-only:

```bash
SUPABASE_SERVICE_ROLE_KEY=
VAPID_PRIVATE_KEY=
VAPID_SUBJECT=mailto:your-email@example.com
CRON_SECRET=
```

Do not expose `SUPABASE_SERVICE_ROLE_KEY` or `VAPID_PRIVATE_KEY` in frontend code.

### Vercel Deployment

1. Add all environment variables in Vercel project settings.
2. Deploy the app.
3. `vercel.json` runs `/api/cron/send-reminders` every 5 minutes.
4. Set `CRON_SECRET` and make sure cron requests include `Authorization: Bearer <CRON_SECRET>`.

### iPhone Setup

On iPhone/iPad, Web Push only works from the installed Home Screen web app.

After changing manifest or iOS meta tags:

1. Delete the old FutureMe Home Screen icon.
2. Clear Safari website data for the domain.
3. Open the site in Safari again.
4. Add it to Home Screen again.
5. Open from the new Home Screen icon.

To enable reminders:

1. Open FutureMe in Safari.
2. Tap the Share button.
3. Tap Add to Home Screen.
4. Open FutureMe from the Home Screen.
5. Tap Enable reminders.
6. Use Send test reminder to confirm push delivery.

### Reminder Flow

- The frontend registers the service worker and subscribes through PushManager.
- `/api/push/subscribe` stores the subscription in Supabase.
- Schedule generation syncs planned reminders through `/api/reminders/sync`.
- `/api/cron/send-reminders` checks pending reminders and sends Web Push notifications with `web-push`.
- Notification clicks open FutureMe and navigate to the task date when available.

## Data Architecture

- `src/models/types.ts` contains typed interfaces for settings, inputs, routines, rules, and planned tasks.
- `src/data/PlannerRepository.ts` defines the repository contract.
- `src/data/LocalPlannerRepository.ts` implements the contract with Local Storage.
- `src/services/PlannerService.ts` is the central app-facing data service.
- `src/planner/autoPlanner.ts` contains the V1 planning algorithm.

To replace Local Storage with Supabase later, implement `PlannerRepository` with Supabase methods and inject it into `PlannerService`.
