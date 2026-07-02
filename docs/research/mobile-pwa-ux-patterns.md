# Mobile PWA UX Patterns

## Topic

Mobile-first UX for FutureMe.

## Why It Matters

FutureMe is primarily a mobile planning companion. The approved UI should stay calm, readable, and touch-friendly.

## Findings

- Mobile-first app flow matters.
- Bottom navigation can work well for repeated daily use.
- Large touch targets reduce friction.
- Avoid calendar overload.
- Keep daily focus clear.
- Preserve current UI unless explicitly changed.

## Implications For FutureMe

The daily dashboard should stay the first useful surface. Logic improvements should happen behind the existing UI before any redesign.

## Implementation Notes

When UI work is requested, verify small mobile viewports, bottom nav padding, task cards, and button text fit.

## Risks

- Dense calendar views can overwhelm.
- Debug controls can clutter normal flows.
- Styling changes can break the approved soft wellness feel.

## Next Questions

- Should the dashboard eventually separate "now", "next", and "later today" more clearly?
- How should admin/debug controls be hidden without adding clutter?
