# FutureMe Night-Shift Prompts

## Run A Night-Shift Review

Read the FutureMe knowledge base, known bugs, next actions, active loop, and knowledge graph. Do not change app code. Run `npm run build` and `npm run test:scheduler` if safe. Update `docs/night-shift/latest-report.md` with repo state, build/test status, risks, and the next best Codex prompt.

## Start Next Loop

Read `docs/loops/active-loop.md`, `docs/knowledge/futureme-current-state.md`, `docs/knowledge/futureme-product-vision.md`, and relevant architecture/rules docs. Make one focused change only. Preserve the approved UI. Run build/tests. Summarise changed files and recommend the next loop.

## Update Knowledge Graph

Read `docs/knowledge-graph/nodes.json`, `docs/knowledge-graph/edges.json`, and related knowledge docs. Add or update nodes/edges only for major product, logic, database, or workflow changes. Validate JSON.

## Review Schedule Quality

Review scheduler rules, scheduler tests, and generated task behaviour. Look for overloaded days, unrealistic task times, missed fixed commitments, and capacity mismatches. Do not redesign UI.

## Review Notification System

Review subscription, scheduled reminder, test reminder, and due reminder flows. Confirm notifications remain optional nudges and do not control task state.

## Review What’s Next Logic

Review whether current task, next task, overdue tasks, completed tasks, capacity, and reschedule suggestions are clearly represented. Recommend one focused implementation loop.

## Prepare Release Notes

Summarise user-facing changes, technical changes, test status, known risks, and any PWA/iPhone reinstall notes.
