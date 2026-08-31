# Project agent memory

This file is the project's committed home for project-intrinsic agent knowledge: build, test, release, architecture, and sharp-edge notes that should travel with the code.

- Golden path: `npm test` (builds, then runs the fully offline suite - no credentials or real `higgsfield` CLI needed); `npx -y axi-axi validate "node bin/higgsfield-axi.js" --dir .` for AXI compliance. Both run in CI.
- This tool wraps the official Higgsfield CLI (`higgsfield`, package `@higgsfield/cli`, https://github.com/higgsfield-ai/cli) by shelling out to it - see `src/hf/exec.ts`. It never calls `api.higgsfield.ai` directly and keeps no model catalog of its own; `models` always reads `higgsfield model list`/`model get` live.
- `HIGGSFIELD_AXI_BIN` (test-only) overrides the `higgsfield` binary path; offline tests point it at `test/helpers/mock-hf.mjs`, a scripted stand-in controlled by env vars (see its header comment) rather than the real CLI.
- `skills/higgsfield-axi/SKILL.md` is generated from `src/skill/content.ts` via `npm run skill:gen`; CI fails if it drifts.
- The `higgsfield` CLI's job JSON shape (`job_id`, `status`, `result_url`/`urls`) is undocumented upstream; `src/hf/job.ts` is defensive about field names and the url shape, but a job result must carry a recognizable job id - from the payload, or from the caller-supplied id that `status`/`wait` pass in - or it raises a malformed-response error rather than degrading to a `status: unknown` success.
- In tests, never `spawnSync` the CLI while an in-process asset server (`test/helpers/asset-server.ts`) must answer its download requests - that deadlocks the event loop. Use the async `exec` helper in `test/hf.test.ts`.

## Maintaining this file

Keep this file for knowledge useful to almost every future agent session in this project.
Do not repeat what the codebase already shows; point to the authoritative file or command instead.
Prefer rewriting or pruning existing entries over appending new ones.
When updating this file, preserve this bar for all agents and keep entries concise.
