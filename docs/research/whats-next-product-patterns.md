# What's Next Product Patterns

## Topic

Designing FutureMe around "What's Next" and notification accountability.

## Why It Matters

FutureMe is not just a calendar, reminder app, or notification app. The product should help the user understand the next useful focus, then use personality-based notifications as a core V1 accountability layer.

## Findings

- Daily focus apps work best when task state drives the experience.
- The app should distinguish active, upcoming, overdue, and completed tasks.
- Overdue/missed tasks can stay active, roll forward, soften, or require a user decision.
- FutureMe should gently guide the user instead of presenting a harsh queue.
- Notifications should be generated from task state and should bring the user back to the app.
- Notification wording should be varied, human, and personality-specific so it does not feel like a repetitive alarm.
- Old pending reminders should not remain pending forever and should not be sent weeks late.

## Implications For FutureMe

The What's Next Engine should remain the source of task truth for the dashboard and notification layer. The notification copy engine should adapt to vibe, task category, and timing while keeping output deterministic for the same scheduled reminder.

## Implementation Notes

Start with deterministic rules:

- Fixed tasks stay anchored.
- Flexible tasks may suggest movement.
- Capacity affects urgency and pressure.
- Completion state removes tasks from future reminder payloads.
- Seeded copy variation uses task id, reminder type, and scheduled time.
- Stale pending reminders older than 24 hours are cancelled rather than sent.

## Risks

- If notifications become the source of truth, the app fails when notifications are off.
- If missed tasks are too aggressive, the app may feel punitive.
- If missed tasks disappear, users lose trust.
- If copy repeats too much, personality-based notifications stop feeling like a core feature.
- If stale reminders are sent late, the user may lose confidence in the plan.

## Next Questions

- Should overdue reminders have their own local app banner copy separate from push copy?
- What should the dashboard say when nothing urgent exists?
- Should stale reminder cleanup also be exposed in an admin report?
