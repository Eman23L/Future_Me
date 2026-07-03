# FutureMe Night Shift

Night shift means the repo can be reviewed while the user is away.

For now, night shift should:

- Read docs/knowledge.
- Read known bugs.
- Read next actions.
- Read active loop.
- Read the latest committed handoff in `latest-report.md`.
- Run build/tests.
- Generate `latest-report.md`.
- Suggest the next Codex prompt.
- Not make risky changes automatically.

## Handoff Rule

Every completed FutureMe loop should update repo memory before the final commit/push. The minimum handoff is:

- `docs/night-shift/latest-report.md`: what changed, what passed, what is still risky, and the next best loop.
- `docs/knowledge/futureme-next-actions.md`: current priority order.
- `docs/loops/active-loop.md`: current loop status and next recommended loop.

This is required so night shift can pick up from the real repo state without the user re-explaining context.

Later, night shift may:

- Open GitHub issues.
- Create pull requests.
- Run research loops.
- Improve docs.
- Propose code changes.

Night shift should review:

- Whether the What’s Next logic is clear.
- Whether overdue tasks are handled.
- Whether missed tasks roll forward.
- Whether today’s dashboard makes sense.
- Whether the next task is realistic.
- Whether reminders match the plan.
- Whether notifications support the plan rather than drive it.
