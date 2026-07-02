# What’s Next Product Patterns

## Topic

Designing FutureMe around "What’s Next".

## Why It Matters

The core product is not notification delivery. The core product is helping the user understand the next useful focus.

## Findings

- Daily focus apps work best when task state drives the experience.
- The app should distinguish active, upcoming, overdue, and completed tasks.
- Overdue/missed tasks can stay active, roll forward, soften, or require a user decision.
- FutureMe should gently guide the user instead of presenting a harsh queue.
- Notifications should support the app but not drive it.

## Implications For FutureMe

The What’s Next Engine should become a central service used by the dashboard and notification layer.

## Implementation Notes

Start with deterministic rules:

- Fixed tasks stay anchored.
- Flexible tasks may suggest movement.
- Capacity affects urgency and pressure.
- Completion state removes tasks from active focus.

## Risks

- If notifications become the source of truth, the app fails when notifications are off.
- If missed tasks are too aggressive, the app may feel punitive.
- If missed tasks disappear, users lose trust.

## Next Questions

- Should the first What’s Next version include reschedule suggestions or only classification?
- What should the dashboard say when nothing urgent exists?
