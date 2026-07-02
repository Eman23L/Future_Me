# FutureMe Supabase Schema

## Current Tables

`user_id` is currently nullable so signed-out/local mode can remain supported. When a Supabase auth session exists, FutureMe may use the account user id for push subscription and scheduled reminder ownership.

### `push_subscriptions`

- `id`.
- `user_id`.
- `endpoint`.
- `p256dh`.
- `auth`.
- `user_agent`.
- `created_at`.
- `updated_at`.

### `scheduled_reminders`

- `id`.
- `task_id`.
- `user_id`.
- `title`.
- `body`.
- `scheduled_for`.
- `status`.
- `sent_at`.
- `notification_vibe`.
- `task_date`.
- `task_category`.
- `created_at`.
- `updated_at`.

## Current SQL

The repo source of truth is `supabase.sql`. The core shape is:

```sql
create extension if not exists pgcrypto;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id text nullable,
  endpoint text unique not null,
  p256dh text not null,
  auth text not null,
  user_agent text nullable,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.scheduled_reminders (
  id uuid primary key default gen_random_uuid(),
  task_id text not null,
  user_id text nullable,
  title text not null,
  body text not null,
  scheduled_for timestamptz not null,
  status text default 'pending',
  sent_at timestamptz nullable,
  notification_vibe text nullable,
  task_date date nullable,
  task_category text nullable,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint scheduled_reminders_status_check check (status in ('pending', 'sent', 'failed', 'cancelled'))
);

grant usage on schema public to service_role;
grant select, insert, update, delete on public.scheduled_reminders to service_role;
```

## Future Schema Considerations

Do not implement these yet. They are planning notes:

- `users`.
- `plans`.
- `tasks`.
- `completions`.
- `weekly_capacity_checks`.
- `what_next_events`.
- `task_reschedules`.
- `missed_task_actions`.

Future tables should support What’s Next logic, completion persistence, rescheduling history, missed task decisions, and account/device strategy.

Auth is not the main FutureMe user experience yet. Any future account tables should preserve the ability for the app to work in signed-out/local mode unless a deliberate product decision changes that.
