# FutureMe What’s Next Engine

## Purpose

The What’s Next Engine is the central product logic that determines what the user should focus on now.

It is more important than notifications. Notifications are just nudges from the What’s Next system. The daily dashboard is the primary user experience.

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
- `recommendedAction`.
- `suggestedReschedules`.
- `shouldNotify`.
- `notificationReason`.
- `dashboardMessage`.

## Product Rules

- The dashboard should work without notifications.
- Notifications should be triggered from What’s Next, not the other way around.
- If a task is missed, the engine should decide whether it stays active, rolls forward, or is softened.
- If the user is in a softer week, the engine should reduce pressure.
- If a task is fixed, do not move it automatically.
- If a task is flexible, FutureMe may suggest moving it.
- If the day is overloaded, the engine should highlight the most important next action.
- If nothing urgent exists, the engine should show a calming next step or recovery message.
- Notifications should never directly change completion, overdue, or reschedule state.

## Future Implementation Shape

Create a central service/function:

```ts
getWhatsNext({
  schedule,
  now,
  completionState,
  capacity,
  rules,
  notificationSettings
})
```

Returns:

```ts
{
  currentTask,
  nextTask,
  upcomingTasks,
  overdueTasks,
  completedTasks,
  recommendedAction,
  shouldNotify,
  notificationReason,
  rescheduleSuggestions,
  dashboardMessage
}
```

## Implementation Notes

The first implementation should be deterministic and testable. AI can help later, but the core state transitions should be clear code with scheduler tests. Build the logic behind the existing UI first.
