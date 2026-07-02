# FutureMe Known Bugs

## PWA Caching Issues

- Status: Open.
- Area: PWA.
- Description: Stale service worker or manifest assets can make deployed changes appear missing.
- Steps to reproduce: Deploy a PWA/manifest change, then open an older installed Home Screen app.
- Expected behaviour: Latest app shell loads after deploy.
- Current behaviour: iPhone may keep stale cached assets.
- Priority: Medium.
- Next suggested action: Add a clearer cache-busting/reinstall test note before PWA releases.

## iPhone Standalone Mode Issues

- Status: Watch.
- Area: iOS PWA.
- Description: Push only works from installed Home Screen PWA, not normal Safari tab.
- Steps to reproduce: Try to enable push from Safari tab.
- Expected behaviour: User is guided to install first.
- Current behaviour: Flow may be confusing for normal users.
- Priority: Medium.
- Next suggested action: Keep guidance, but avoid changing UI until requested.

## Production Reminder Scheduler Not Configured

- Status: Partially fixed.
- Area: Backend reminders.
- Description: The protected due reminder endpoint exists, but production scheduler setup still needs to be configured.
- Steps to reproduce: Create scheduled reminders and wait without a scheduler calling the endpoint.
- Expected behaviour: Due reminders are sent automatically.
- Current behaviour: Endpoint is ready, but external cron setup is still required.
- Priority: High.
- Next suggested action: Wire Supabase cron/pg_net, Vercel Cron, or protected scheduler to `POST /api/reminders/send-due` with `Authorization: Bearer <CRON_SECRET>`.

## Debug Reminder Buttons Visible To Normal Users

- Status: Fixed in app code.
- Area: UI/admin controls.
- Description: Test/debug reminder actions are useful for development but should not be normal-user controls.
- Steps to reproduce: Open reminders UI as a normal production user.
- Expected behaviour: Admin/debug controls hidden or gated.
- Current behaviour: Debug controls are hidden unless running in dev or `localStorage.futuremeDebug = "true"`.
- Priority: Low.
- Next suggested action: Verify production build on device.

## Schedule Quality Improvements Needed

- Status: Open.
- Area: Scheduling.
- Description: Flexible task placement needs more polish around realistic timing and load balancing.
- Steps to reproduce: Generate busy weeks with multiple routines.
- Expected behaviour: Plan feels realistic and gentle.
- Current behaviour: Some placements may feel awkward.
- Priority: Medium.
- Next suggested action: Add focused scheduler tests before changing placement logic.

## Daily Display Default Time Cleanup

- Status: Open.
- Area: Daily dashboard.
- Description: Untimed/defaulted commitments need clear, non-confusing presentation.
- Steps to reproduce: Add untimed social/deadline inputs and view day.
- Expected behaviour: Defaulted times feel intentional.
- Current behaviour: Some defaulted time display needs cleanup.
- Priority: Medium.
- Next suggested action: Improve display logic later without restyling.

## Bottom Nav Overlap/Padding Checks

- Status: Watch.
- Area: Mobile UI.
- Description: Bottom navigation and daily content need padding checks on small screens.
- Steps to reproduce: Use mobile viewport with long task list.
- Expected behaviour: Content remains reachable and readable.
- Current behaviour: Needs verification.
- Priority: Low.
- Next suggested action: Run mobile screenshot review before UI work.

## What's Next Engine Needs Tests And Deeper Rules

- Status: Partially fixed.
- Area: Product logic.
- Description: A first deterministic engine exists, but missed-task decisions, rescheduling suggestions, and overload handling need deeper rules/tests.
- Steps to reproduce: Inspect `src/services/whatsNext.ts`.
- Expected behaviour: One deterministic engine powers dashboard and nudges with test coverage.
- Current behaviour: Engine powers dashboard/reminder copy, but logic needs dedicated tests and richer task decisions.
- Priority: High.
- Next suggested action: Add focused What's Next tests and overdue/reschedule product rules.

## Missed/Overdue Task Behaviour Not Finalised

- Status: Open.
- Area: Task state.
- Description: Missed tasks need clear rules for active, overdue, rolled forward, softened, or completed.
- Steps to reproduce: Let flexible tasks pass without completion.
- Expected behaviour: FutureMe gives a gentle next action.
- Current behaviour: Behaviour needs product definition and implementation beyond basic missed flags.
- Priority: High.
- Next suggested action: Define rules in What's Next loop before changing scheduling.

## Weekly Capacity Loop Not Fully Automated

- Status: Open.
- Area: Capacity.
- Description: Weekly check-in should adjust pressure and routine frequency.
- Steps to reproduce: Move from one week to another with changed capacity.
- Expected behaviour: Plan softens or expands appropriately.
- Current behaviour: Monthly capacity exists but weekly loop is not complete.
- Priority: Medium.
- Next suggested action: Design weekly capacity data model and loop.
