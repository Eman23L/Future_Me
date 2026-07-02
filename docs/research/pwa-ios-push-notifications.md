# PWA iOS Push Notifications

## Topic

iPhone Web Push support for FutureMe.

## Why It Matters

FutureMe supports optional reminder nudges. iPhone support requires a specific install and permission path, so docs must preserve that knowledge.

## Findings

- iPhone requires Add to Home Screen for Web Push.
- Standalone mode matters.
- A service worker is required.
- Push permission is required.
- VAPID keys are required.
- Notification clicks should bring the user back into FutureMe.

## Implications For FutureMe

Notifications are optional nudges, not the product core. FutureMe must still work when notifications are disabled or unavailable.

## Implementation Notes

Keep service worker, manifest, VAPID env vars, and push subscription storage intact. When debugging iPhone issues, reinstall the Home Screen PWA after manifest/service worker changes.

## Risks

- Stale PWA cache can hide changes.
- Users may try enabling notifications from Safari instead of installed PWA.
- Push permission can be denied and should not block the app.

## Next Questions

- How should the app guide users when iPhone push prerequisites are missing?
- Should reminders be hidden, softened, or shown as optional when unsupported?
