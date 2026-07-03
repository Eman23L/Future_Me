# FutureMe Next Actions

1. Verify production PWA load after the latest legacy localStorage migration/display hardening deploy.
2. Configure production scheduler for `POST /api/reminders/send-due` with `CRON_SECRET`.
3. Run one-time cleanup SQL for old pending reminders if production has stale June rows.
4. Add API-level tests for due reminder sending when route mocking is practical.
5. Improve missed/overdue task handling.
6. Improve daily schedule display.
7. Improve schedule quality.
8. Add weekly capacity loop.
9. Add edit/reschedule task flow.
10. Add AI chat later.
11. Add research-backed planning rules later.
12. Add auth/user accounts later if needed.

## Auth/Identity Follow-Up

Account-scoped local storage and auth-based reminder ownership now exist as infrastructure. Before making auth a user-facing feature, validate magic-link flows, signed-out fallback, reminder ownership, and how local/device data should move if a user later signs in.

## Current Recommended Active Loop

Make notifications work from the next upcoming task/activity.

The goal is to keep notifications as a core V1 accountability feature while ensuring every reminder is generated from real task state, uses varied human copy, avoids stale late sends, and keeps the dashboard useful without notifications.
