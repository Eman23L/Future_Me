# FutureMe Next Actions

1. Configure production scheduler for `POST /api/reminders/send-due` with `CRON_SECRET`.
2. Run one-time cleanup SQL for old pending reminders if production has stale June rows.
3. Add API-level tests for due reminder sending when route mocking is practical.
4. Improve missed/overdue task handling.
5. Improve daily schedule display.
6. Improve schedule quality.
7. Add weekly capacity loop.
8. Add edit/reschedule task flow.
9. Add AI chat later.
10. Add research-backed planning rules later.
11. Add auth/user accounts later if needed.

## Auth/Identity Follow-Up

Account-scoped local storage and auth-based reminder ownership now exist as infrastructure. Before making auth a user-facing feature, validate magic-link flows, signed-out fallback, reminder ownership, and how local/device data should move if a user later signs in.

## Current Recommended Active Loop

Make notifications work from the next upcoming task/activity.

The goal is to keep notifications as a core V1 accountability feature while ensuring every reminder is generated from real task state, uses varied human copy, avoids stale late sends, and keeps the dashboard useful without notifications.
