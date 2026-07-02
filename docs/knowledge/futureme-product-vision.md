# FutureMe Product Vision

## What FutureMe is

FutureMe is a mobile-first PWA planning assistant for people who need their month to fit around real life. It helps the user turn fixed commitments, flexible routines, capacity, care needs, and current task state into a daily view of what matters now.

FutureMe is not just a calendar. FutureMe is not just a reminder app. FutureMe is an energy-aware planning companion that builds the user's month around real life, routines, rules, capacity, care, and what needs attention next.

Core product sentence:

> FutureMe helps the user understand what to focus on next, without having to manually rebuild their life every day.

## Who it is for

FutureMe is for people who can plan in theory but lose the thread when life changes. The main audience includes neurodivergent users, shift workers, students, carers, people with fluctuating energy, and anyone who needs planning support without a rigid productivity tone.

## Why it exists

Most calendars ask the user to decide everything manually. Most reminder apps only interrupt at a chosen time. FutureMe exists because many users need a companion that can hold the plan, notice what changed, and make today feel understandable.

## Core Promise

FutureMe answers: "What should I focus on next?"

The product promise is not constant notification. It is clear daily orientation:

- What matters today.
- What is active now.
- What is coming up next.
- What is overdue.
- What has already been completed.
- What should move, soften, or wait.

## Difference From A Calendar

A normal calendar displays events. FutureMe interprets the user's month. It respects fixed commitments, places flexible activities, checks weekly capacity, tracks completion, and presents the next useful action.

## Difference From A Reminder App

A reminder app mainly fires alerts. FutureMe uses notifications only as optional nudges back into the app. The source of truth is the generated schedule, task state, completion status, capacity state, rules, current time, and What’s Next logic.

## Why "What’s Next" Is Central

The daily dashboard should make the user's next step obvious even when notifications are disabled. The What’s Next Engine is the product logic that decides current task, next task, overdue work, completed work, and recommended action. Notifications should only point back to this state.

## V1 Focus

V1 focuses on a reliable mobile-first PWA that:

- Builds monthly plans from fixed commitments.
- Places flexible routines with capacity-aware rules.
- Shows a daily dashboard.
- Tracks completion.
- Stores push subscriptions and scheduled reminders through Supabase.
- Sends optional Web Push nudges.
- Preserves the approved soft wellness UI.

## V2/V3 Direction

Future versions should deepen the What’s Next Engine, improve missed and overdue handling, add weekly capacity loops, support edit/reschedule flows, and eventually add AI-assisted planning and chat. AI should respect schedule state, rules, capacity, sleep, fixed commitments, and user consent.
