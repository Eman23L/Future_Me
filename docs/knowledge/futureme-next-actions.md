# FutureMe Next Actions

1. Configure production scheduler for `POST /api/reminders/send-due` with `CRON_SECRET`.
2. Add focused What's Next/reminder-generation tests.
3. Improve missed/overdue task handling.
4. Improve daily schedule display.
5. Improve schedule quality.
6. Add weekly capacity loop.
7. Add edit/reschedule task flow.
8. Add AI chat later.
9. Add research-backed planning rules later.
10. Add auth/user accounts later if needed.

## Auth/Identity Follow-Up

Account-scoped local storage and auth-based reminder ownership now exist as infrastructure. Before making auth a user-facing feature, validate magic-link flows, signed-out fallback, reminder ownership, and how local/device data should move if a user later signs in.

## Current Recommended Active Loop

Make notifications work from the next upcoming task/activity.

The goal is to keep notifications as a core V1 accountability feature while ensuring every reminder is generated from real task state and the dashboard remains useful without notifications.
