# FutureMe Next Actions

1. Automate due reminder sending with Supabase cron/pg_net or protected endpoint.
2. Hide debug reminder buttons from normal users.
3. Build What’s Next Engine.
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

Automate due reminder sending.

The goal is to turn reminder sending from manual/debug button into an automatic backend job while keeping notifications as optional nudges.
