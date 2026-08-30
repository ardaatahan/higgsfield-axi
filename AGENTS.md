# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Golden path: `npm test` (builds, then runs the fully offline suite - no credentials needed); `npx -y axi-axi validate "node bin/higgsfield-axi.js" --dir .` for AXI compliance. Both run in CI.
- `src/catalog/models.generated.ts` is generated from Higgsfield's OpenAPI spec - never edit it by hand; see "Regenerating the model catalog" in README.md.
- `skills/higgsfield-axi/SKILL.md` is generated from `src/skill/content.ts` via `npm run skill:gen`; CI fails if it drifts.
- Tests must not assert wall-clock timing: local fetch latency in sandboxed environments is erratic (up to ~500ms per request). Backoff logic is tested via the pure `nextDelay`/`jitter` functions in `src/api/poll.ts`.
- In tests, never `spawnSync` the CLI while the in-process mock server must answer it - that deadlocks the event loop. Use the async `exec` helper in `test/api.test.ts`.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
