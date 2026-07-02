# FutureMe Decisions Log

## Decisions Made

- Use Vercel for hosting.
- Use Supabase for database/reminders.
- Use Web Push/VAPID for notifications.
- Use mobile-first PWA.
- Use capacity-based routine frequency.
- Keep fixed commitments manually inputted.
- Let FutureMe place flexible tasks.
- Use softer capacity labels.
- Use personality-based notifications.
- Keep "Send due reminders now" as debug/admin only.
- Treat notifications as nudges, not the main product.
- Treat What’s Next Engine as the core product logic.
- Preserve current UI style unless explicitly changed.
- Support account-scoped planner storage when a Supabase auth identity exists.
- Keep signed-out/local mode supported while auth remains an optional infrastructure layer.
- Use auth identity for reminder ownership when signed in, without making auth the primary user experience yet.

## Decision Principles

- Fixed commitments are anchors.
- Flexible activities can move.
- Capacity should reduce pressure, not shame the user.
- Daily dashboard is the primary product surface.
- Notifications should point back to the app.
- Logic changes should be tested before UI changes.
