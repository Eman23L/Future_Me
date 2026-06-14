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

create unique index if not exists scheduled_reminders_task_time_key on public.scheduled_reminders(task_id, scheduled_for);

create index if not exists push_subscriptions_user_id_idx on public.push_subscriptions(user_id);
create index if not exists scheduled_reminders_due_idx on public.scheduled_reminders(status, scheduled_for);
create index if not exists scheduled_reminders_user_month_idx on public.scheduled_reminders(user_id, task_date);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_push_subscriptions_updated_at on public.push_subscriptions;
create trigger set_push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_scheduled_reminders_updated_at on public.scheduled_reminders;
create trigger set_scheduled_reminders_updated_at
before update on public.scheduled_reminders
for each row execute function public.set_updated_at();
