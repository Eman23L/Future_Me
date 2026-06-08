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

## Data Architecture

- `src/models/types.ts` contains typed interfaces for settings, inputs, routines, rules, and planned tasks.
- `src/data/PlannerRepository.ts` defines the repository contract.
- `src/data/LocalPlannerRepository.ts` implements the contract with Local Storage.
- `src/services/PlannerService.ts` is the central app-facing data service.
- `src/planner/autoPlanner.ts` contains the V1 planning algorithm.

To replace Local Storage with Supabase later, implement `PlannerRepository` with Supabase methods and inject it into `PlannerService`.
