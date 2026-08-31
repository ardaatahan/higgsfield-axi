# higgsfield-axi

An AXI (Agent eXperience Interface) compliant CLI (spec `axi/1.0-2026-07`) that wraps the official [Higgsfield CLI](https://github.com/higgsfield-ai/cli) (`higgsfield`, package `@higgsfield/cli`). Generate images and video from the terminal - by hand or from an agent - and get local file paths back.

- Structured, token-efficient TOON output on stdout; exit codes `0` success / `1` error / `2` usage error; no interactive prompts.
- Shells out to the official `higgsfield` CLI for every generation, listing, and job-lifecycle call - this tool never talks to `api.higgsfield.ai` directly.
- `image` / `video` build a `higgsfield generate create <model>` invocation, wait for completion by default, download outputs, and print local file paths.
- `models` reads the live catalog from `higgsfield model list` / `higgsfield model get <model-id>`, so it always reflects what your installed CLI version supports.

## Install

Requires Node.js >= 20, plus the official Higgsfield CLI on `PATH`:

```sh
# the official CLI this tool wraps - pick one
npm install -g @higgsfield/cli
brew install higgsfield-ai/tap/higgsfield
curl -fsSL https://raw.githubusercontent.com/higgsfield-ai/cli/main/install.sh | sh

higgsfield auth login
```

Then install higgsfield-axi itself:

```sh
# from GitHub (builds on install)
npm install -g github:ardaatahan/higgsfield-axi

# or from a clone
git clone https://github.com/ardaatahan/higgsfield-axi
cd higgsfield-axi && npm install && npm run build && npm link
```

Running `higgsfield-axi` with no arguments shows whether the `higgsfield` CLI is installed, whether it's authenticated, and example commands - it never crashes when the CLI is missing or logged out, it just tells you how to fix it.

## Credentials

Authentication is entirely delegated to the official CLI - higgsfield-axi does not read, store, or accept any credentials of its own:

```sh
higgsfield auth login    # opens a browser (OAuth 2.0 PKCE)
higgsfield auth token    # confirm you're logged in
higgsfield workspace set <workspace_id>   # most commands need an active workspace
```

higgsfield-axi never prints the access token or any other secret in its own output.

## Commands

### `higgsfield-axi models [model-id]`

```sh
higgsfield-axi models --kind video          # filter by media kind: image, video, audio, text
higgsfield-axi models nano_banana_2         # parameter detail for one model
```

Model ids are the CLI's own `job_type` values (`nano_banana_2`, `veo3_1`, `kling3_0`, `text2image_soul_v2`, ...). The full, current list always comes from `higgsfield model list` - see [MODELS.md](https://github.com/higgsfield-ai/cli/blob/main/MODELS.md) upstream for a browsable reference.

### `higgsfield-axi image <prompt>`

```sh
higgsfield-axi image "minimal hero banner, pastel gradients" --aspect_ratio 16:9
higgsfield-axi image "same scene at night" --image-references ./day.jpg
higgsfield-axi image "product shot" --model gpt_image_2 --quality high --no-wait
```

The prompt must come first, before any flags: an unrecognized flag is forwarded verbatim and takes the next token as its value, so `higgsfield-axi image --enhance_prompt "a red chair"` would forward the prompt as that flag's value and report a missing prompt.

Flags: `--model` (default `nano_banana_2`), `--wait-timeout`, `--wait-interval`, `--no-wait`, `--out`. Any other `--flag value` is forwarded verbatim to `higgsfield generate create <model>` - that covers per-model parameters like `--aspect_ratio`, `--resolution`, `--duration`, `--mode`, and media flags like `--image-references`, `--start-image`, `--end-image` (local file paths are uploaded automatically by the underlying CLI). `--prompt`, `--wait` and `--json` are the exception: higgsfield-axi sets those on the underlying call itself and rejects them as passthrough. Inspect what a model accepts with `higgsfield-axi models <model-id>`.

### `higgsfield-axi video <prompt>`

```sh
higgsfield-axi video "slow dolly-in on a sunlit desk" --aspect_ratio 16:9
higgsfield-axi video "animate this hero image" --start-image ./hero.png
higgsfield-axi video "orbit shot" --model kling3_0 --duration 5 --mode pro
```

Same flag model as `image`, defaulting `--model` to `veo3_1`.

### `higgsfield-axi status | wait <job-id>`

```sh
higgsfield-axi status <job-id>                     # state + output URLs, no download
higgsfield-axi wait <job-id> --out ./assets         # poll to completion, download outputs
```

There is no `cancel` command: the underlying `higgsfield` CLI does not expose job cancellation (verified against `higgsfield generate --help`).

Batch generation (one `generate create` call producing a set of jobs - some models take generation parameters that request several outputs per call, so inspect a model with `higgsfield-axi models <model-id>` before using them) is a known v1 limitation: `image`/`video` handle a single job per call, and a job-set response is reported as an explicit unsupported-shape error naming the vendor commands (`higgsfield generate list`, `higgsfield generate get <job-id>`) to drive the set directly.

## Output downloads

By default `image`, `video`, and `wait` wait for the job to finish (via the CLI's own `--wait` / `generate wait`) and download every output to `./higgsfield-out/` (override with `--out <dir>`), named `<job-id>.<ext>` (`-1`, `-2`, ... suffixes when there are several). With `--no-wait` you get the job id immediately and resume later with `wait`. A failed/rejected terminal status exits `1`.

## Development

```sh
npm install
npm test           # builds, then runs the offline suite (mocked `higgsfield` binary - no credentials needed)
npm run skill:gen  # regenerate skills/higgsfield-axi/SKILL.md after changing src/skill/content.ts
npx -y axi-axi validate "node bin/higgsfield-axi.js" --dir .   # AXI compliance checks
```

The test suite covers argv construction for every subcommand, `--json` output parsing, passthrough-flag forwarding, downloads, and error mapping against a mocked `higgsfield` binary (`test/helpers/mock-hf.mjs`). It does not need the real CLI installed. A live smoke test (needs the real `higgsfield` CLI installed and logged in) is the one thing not covered by CI; after installing and authenticating it, verify with:

```sh
higgsfield-axi image "a red apple on a white table"
```

Run it in the default waiting form, not with `--no-wait`: both bill the same generation, but only the waiting form exercises the whole contract - submit, wait, read the result URLs, download, print a local path. The exact JSON shape `generate create` returns is the one part of the vendor contract not verified against a live account. `generate create --wait` has no `--quiet` flag (unlike `generate wait`, which higgsfield-axi already passes it), so that one call tolerates a leading vendor progress prefix and parses the JSON document that follows it; every other call requires the whole stdout to be JSON. A job id under an unexpected key fails loudly (the tool reports a malformed response); a result URL under an unexpected key does not - watch for `status: completed` together with an empty `files[0]{path,bytes}:` block, which means the result-URL field is named something other than `urls`/`result_url`.

Test-only environment hook: `HIGGSFIELD_AXI_BIN` overrides the `higgsfield` binary higgsfield-axi shells out to, so tests can point it at a mock.

`axi-axi validate` passes all 12 checks with 4 advisory notes (VA1-VA4: idempotent no-ops, long-text truncation, zero-result messaging, list `--fields` escape hatch) - these are non-blocking suggestions, not failures, and are left as-is since `models`/`model` output already passes through the CLI's own `--json` shape faithfully rather than reshaping it.

## License

[MIT](LICENSE)
