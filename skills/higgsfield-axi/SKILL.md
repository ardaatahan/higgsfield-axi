---
name: higgsfield-axi
description: "Generate images, video, and more by wrapping the official Higgsfield CLI, and get local file paths back"
---

# higgsfield-axi

Generate images, video, and more by wrapping the official Higgsfield CLI, and get local file paths back (built against AXI spec axi/1.0-2026-07). This tool shells out to the official [Higgsfield CLI](https://github.com/higgsfield-ai/cli) - it does not call the Higgsfield API directly.

Install and authenticate the official CLI first (one-time setup this tool depends on):

```sh
npm install -g @higgsfield/cli   # or: brew install higgsfield-ai/tap/higgsfield
higgsfield auth login
```

Then run higgsfield-axi with npx - no separate install needed:

```
higgsfield-axi: Generate images, video, and more by wrapping the official Higgsfield CLI, and get local file paths back
catalog: "55+ models across image, video, 3D, and audio - see `higgsfield-axi models` or MODELS.md upstream"
help[4]:
  npx -y higgsfield-axi image "<prompt>" --model nano_banana_2
  npx -y higgsfield-axi video "<prompt>" --model veo3_1
  npx -y higgsfield-axi models --kind image
  npx -y higgsfield-axi wait <job-id>
```

`image`/`video` shell out to `higgsfield generate create <model> --prompt ...`, wait for completion by default, download outputs, and print local file paths (`--no-wait` to just get the job id back). Any flag not shown in `--help` is forwarded verbatim to that underlying call (e.g. `--aspect_ratio`, `--resolution`, `--image-references`, `--duration`) - inspect a model's accepted parameters with `higgsfield-axi models <model-id>` or `higgsfield model get <model-id>`.

Every command supports `--help`. Exit codes: 0 success/no-op, 1 error, 2 usage error. All output is TOON on stdout. There is no `cancel` command - the underlying Higgsfield CLI does not expose one.
