# FutureMe What's Next Engine

## Purpose

The What's Next Engine is the central product logic that determines what the user should focus on now.

Notifications are a core V1 feature, but they are generated from task state and must not replace task state. The What's Next Engine powers both the daily dashboard and the notification/accountability layer.

## Inputs

- Generated schedule.
- Current date/time.
- Completion state.
- Capacity state.
- Task priority.
- Task effort level.
- Task category.
- Fixed vs flexible task type.
- Rules.
- Sleep window.
- Missed/overdue status.
- User edits.
- Notification permission status.

## Outputs

- `currentTask`.
- `nextTask`.
- `upcomingTasks`.
- `overdueTasks`.
- `completedTasks`.
- `activeTasks`.
- `shouldNotify`.
- `notificationReason`.
- `notificationTiming`.
- `notificationBody`.
- `targetUrl`.
- `targetDate`.

## Product Rules

- The dashboard should work without notifications.
- Notifications should be triggered from What's Next/task state, not the other way around.
- If a notification is sent, the task must remain active until completed.
- Completed tasks should not continue to send future reminders.
- If a task is missed, the engine should decide whether it stays active, rolls forward, or is softened.
- If the user is in a softer week, the engine should reduce pressure.
- If a task is fixed, do not move it automatically.
- If a task is flexible, FutureMe may suggest moving it.
- If the day is overloaded, the engine should highlight the most important next action.
- If nothing urgent exists, the engine should show a calming next step or recovery message.
- Notifications should never directly change completion, overdue, or reschedule state.

## Current Implementation Shape

`src/services/whatsNext.ts` contains a deterministic first version:

```ts
getWhatsNext(state, now)
```

Returns:

```ts
{
  currentTask,
  nextTask,
  upcomingTasks,
  overdueTasks,
  completedTasks,
  activeTasks,
  shouldNotify,
  notificationReason,
  notificationTiming,
  notificationBody,
  targetUrl,
  targetDate
}
```

The same module builds scheduled reminder payloads from incomplete planned tasks and selected notification personality. Notification wording itself lives in `src/services/notificationCopy.ts`, which uses seeded variation banks so reminders feel human without changing unpredictably on every sync.

## Implementation Notes

The first implementation is deterministic and uses current planner state. Notification service checks now cover variation counts, seeded stability, different wording for different task/reminder combinations, completed-task filtering, and stale-window calculation. Future loops should deepen missed-task decisions, reschedule suggestions, overload handling, and API-level route tests.
