# AI Scheduling Agent Design

## Topic

Future AI planner direction.

## Why It Matters

FutureMe may eventually accept messy input and help adjust plans through chat, but AI must not randomly schedule tasks.

## Findings

- AI should respect rules, capacity, sleep, fixed commitments, and task states.
- AI should explain why tasks are placed.
- AI should distinguish fixed commitments from flexible activities.
- AI should eventually support messy input.
- AI should eventually adjust schedules from chat, with user-visible reasoning.

## Implications For FutureMe

The deterministic scheduling engine and What’s Next Engine should remain the core source of truth. AI can assist, explain, or suggest, but should not bypass tested rules.

## Implementation Notes

Build structured task/schedule state first. Add AI after clear schemas and tests exist.

## Risks

- Unchecked AI could overload days.
- AI could move fixed commitments incorrectly.
- AI explanations could imply certainty where a suggestion is needed.

## Next Questions

- What schema should represent user edits and AI suggestions?
- When should AI make a change automatically versus ask first?
