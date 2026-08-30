---
name: higgsfield-axi
description: "Generate images and video via the Higgsfield API and get local file paths back"
---

# higgsfield-axi

Generate images and video via the Higgsfield API and get local file paths back (built against AXI spec axi/1.0-2026-07). Run the commands below with npx — no install needed.

Credentials: set `HF_API_KEY_ID` and `HF_API_KEY_SECRET` (keys from https://cloud.higgsfield.ai), or write them as KEY=VALUE lines to `~/.config/higgsfield-axi/credentials`.

```
catalog: "48 models (11 image, 37 video)"
defaults: image=soul/standard video=veo3.1/fast out=./higgsfield-out
help[4]:
  npx -y higgsfield-axi image "<prompt>" --aspect 16:9
  npx -y higgsfield-axi video "<prompt>" --image <file-or-url>
  npx -y higgsfield-axi models --kind image
  npx -y higgsfield-axi wait <request-id>
```

`image`/`video` submit a generation, poll to completion, download outputs, and print local file paths (`--no-wait` to just get the request id). `--ref`/`--image` accept local files (uploaded automatically) or URLs. `models <model-id>` shows every parameter a model accepts; pass extras with `--params '{...}'`.

Every command supports `--help`. Exit codes: 0 success/no-op, 1 error, 2 usage error. All output is TOON on stdout.
