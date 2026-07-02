# FutureMe Knowledge Graph

The knowledge graph is repo-native memory for Codex and humans. It is not decorative.

Before planning major changes, read:

- `docs/knowledge-graph/nodes.json`.
- `docs/knowledge-graph/edges.json`.
- The `relatedFiles` for any node touched by the task.

Use the graph to understand relationships between product, logic, database, and UI. For example, notification work should trace through What’s Next, scheduled reminders, push subscriptions, Supabase, service worker, and the daily dashboard.

Update nodes and edges when new major systems are introduced or when relationships change. Keep ids stable and JSON valid.
