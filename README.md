# higgsfield-axi

An AXI (Agent eXperience Interface) compliant CLI (spec `axi/1.0-2026-07`) for the [Higgsfield generation API](https://docs.higgsfield.ai/docs). Generate images and video from the terminal - by hand or from an agent - and get local file paths back.

- Structured, token-efficient TOON output on stdout; exit codes `0` success / `1` error / `2` usage error; no interactive prompts.
- `image` / `video` submit a request, poll with backoff to a terminal state, download the outputs, and print local paths.
- Local input files (`--ref`, `--image`) upload automatically through Higgsfield's presigned-URL flow.
- The model catalog (48 models at the time of writing) is generated from Higgsfield's OpenAPI spec and checked in, so the CLI works offline and stays reviewable.

## Install

Requires Node.js >= 20.

```sh
# from GitHub (builds on install)
npm install -g github:ardaatahan/higgsfield-axi

# or from a clone
git clone https://github.com/ardaatahan/higgsfield-axi
cd higgsfield-axi && npm install && npm run build && npm link
```

## Credentials

Create an API key at [cloud.higgsfield.ai](https://cloud.higgsfield.ai), then either:

```sh
export HF_API_KEY_ID=...
export HF_API_KEY_SECRET=...
```

or write a config file at `~/.config/higgsfield-axi/credentials` (respects `XDG_CONFIG_HOME`):

```
HF_API_KEY_ID=...
HF_API_KEY_SECRET=...
```

Environment variables take precedence over the file. Credentials are only ever sent to `api.higgsfield.ai` in the `Authorization` header; the CLI never prints them.

Running `higgsfield-axi` with no arguments shows whether credentials are configured, the catalog summary, and example commands.

## Commands

### `higgsfield-axi models [model-id]`

List the catalog, or show every parameter one model accepts.

```sh
higgsfield-axi models --kind image        # filter by kind; --fields adds columns
higgsfield-axi models soul/standard       # parameter detail: types, defaults, valid values
```

Model ids mirror the API paths (minus the `higgsfield-ai/` prefix): `soul/standard`, `nano-banana`, `veo3.1/fast/image-to-video`, `kling-video/v2.5-turbo/pro/image-to-video`, ...

### `higgsfield-axi image <prompt>`

```sh
higgsfield-axi image "minimal hero banner, pastel gradients" --aspect 16:9
higgsfield-axi image "same scene at night" --ref ./day.jpg          # defaults to soul/reference
higgsfield-axi image "product shot" --model nano-banana --n 4
higgsfield-axi image "editorial portrait" --resolution 4K --seed 42 --no-wait
```

Flags: `--model` (default `soul/standard`; `soul/reference` when `--ref` is set), `--ref` (file or URL; comma-separate several for models that accept a list), `--aspect`, `--resolution`, `--n`, `--seed`, `--params`, `--out`, `--no-wait`, `--timeout`.

### `higgsfield-axi video <prompt>`

```sh
higgsfield-axi video "slow dolly-in on a sunlit desk" --aspect 16:9 --audio
higgsfield-axi video "animate this hero image" --image ./hero.png   # defaults to veo3.1/fast/image-to-video
higgsfield-axi video "orbit shot" --model kling-video/v2.5-turbo/pro/image-to-video --image ./shot.jpg
```

Flags: `--model` (default `veo3.1/fast`; `veo3.1/fast/image-to-video` when `--image` is set), `--image` (input/first frame), `--end-image` (last frame), `--ref` (reference-to-video models), `--duration`, `--aspect`, `--resolution`, `--audio`, `--seed`, `--params`, `--out`, `--no-wait`, `--timeout`.

Any parameter a model accepts but no flag covers can be passed as JSON: `--params '{"style_id": "...", "enhance_prompt": false}'`. Parameters are validated against the catalog (names, enums, ranges) before anything is sent.

### `higgsfield-axi status | wait | cancel <request-id>`

```sh
higgsfield-axi status <request-id>          # state + output URLs, no download
higgsfield-axi wait <request-id> --out ./assets   # poll to terminal state, download outputs
higgsfield-axi cancel <request-id>          # queued requests only; terminal ones are a no-op
```

## Output downloads

By default `image`, `video`, and `wait` poll until the request finishes and download every output to `./higgsfield-out/` (override with `--out <dir>`), named `<request-id>.<ext>` (`-1`, `-2`, ... suffixes when there are several). The printed TOON includes the request id, final status, and each local path with its byte size. With `--no-wait` you get the request id immediately and resume later with `wait`.

Polling follows [Higgsfield's guidance](https://docs.higgsfield.ai/docs/concepts/polling): 2 s initial interval growing 1.5x to a 10 s cap with jitter; transient 5xx/network failures are retried, hard failures (401/404) stop immediately. `--timeout` (default 900 s) bounds the wait; on timeout the request keeps running server-side and `wait <request-id>` resumes it. A `failed`/`nsfw` terminal state exits `1` (failed and NSFW requests are not charged).

## Regenerating the model catalog

`src/catalog/models.generated.ts` is derived from the [OpenAPI spec](https://docs.higgsfield.ai/docs/openapi.json):

```sh
npm run catalog:gen        # fetches the live spec (or: node scripts/gen-catalog.mjs ./openapi.json)
npm run build
npm test
```

Commit the diff. If Higgsfield adds a model family with a new OpenAPI tag, the generator fails until the tag is classified as image or video in `scripts/gen-catalog.mjs`.

## Development

```sh
npm install
npm test           # builds, then runs the offline suite (mocked Higgsfield API - no credentials needed)
npm run skill:gen  # regenerate skills/higgsfield-axi/SKILL.md after changing src/skill/content.ts
npx -y axi-axi validate "node bin/higgsfield-axi.js" --dir .   # AXI compliance checks
```

The test suite covers request construction, auth-header formatting, upload/download flows, polling/backoff, cancel semantics, and error mapping against a local mock server. A live-API smoke test (needs real credentials and spends credits) is the one thing not covered; after configuring credentials, verify with:

```sh
higgsfield-axi image "a red apple on a white table" --n 1
```

Test-only environment hooks: `HIGGSFIELD_BASE_URL` overrides the API base URL, and `HIGGSFIELD_AXI_POLL_BASE_MS` / `HIGGSFIELD_AXI_POLL_CAP_MS` shrink the polling schedule so tests run fast.

## License

[MIT](LICENSE)
