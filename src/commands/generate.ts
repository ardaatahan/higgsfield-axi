// `image` and `video` - submit a generation, then (by default) poll to a
// terminal state, download outputs, and print local file paths.

import type { CommandModule } from "../cli/router.js";
import type { Parsed } from "../cli/args.js";
import type { FlagSpec } from "../cli/spec.js";
import { AxiError, UsageError } from "../output/errors.js";
import { emitKV, emitList, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { DEFAULTS, buildBody, findModel, roleParam, type ModelEntry } from "../catalog/index.js";
import { apiRequest } from "../api/http.js";
import { pollUntilTerminal } from "../api/poll.js";
import { asRequestStatus, outputUrls, type RequestStatus } from "../api/status.js";
import { resolveMediaInput } from "../api/upload.js";
import { downloadOutputs } from "../api/download.js";

export const DEFAULT_OUT_DIR = "higgsfield-out";
const DEFAULT_TIMEOUT_SEC = 900;

const COMMON_FLAGS: FlagSpec[] = [
  { name: "params", type: "string", description: "extra model parameters as a JSON object" },
  { name: "out", type: "string", default: DEFAULT_OUT_DIR, description: "directory for downloaded outputs" },
  { name: "no-wait", type: "boolean", description: "submit only; print the request id without polling" },
  {
    name: "timeout",
    type: "string",
    default: String(DEFAULT_TIMEOUT_SEC),
    description: "max seconds to wait for completion",
  },
  { name: "seed", type: "string", description: "seed for reproducible generations (models that support it)" },
];

function parseParamsFlag(raw: unknown): Record<string, unknown> {
  if (raw === undefined) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(raw));
  } catch {
    throw new UsageError(
      "--params must be a JSON object",
      'example: --params \'{"style_id": "abc", "enhance_prompt": false}\'',
    );
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new UsageError("--params must be a JSON object", 'example: --params \'{"enhance_prompt": false}\'');
  }
  return parsed as Record<string, unknown>;
}

function parseTimeout(raw: unknown): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) {
    throw new UsageError("--timeout must be a positive number of seconds", "example: --timeout 600");
  }
  return n * 1000;
}

/** Map a CLI flag to the model parameter filling the given role. */
function setRole(
  model: ModelEntry,
  values: Record<string, unknown>,
  role: string,
  flag: string,
  value: unknown,
): void {
  if (value === undefined) return;
  const p = roleParam(model, role);
  if (!p) {
    throw new UsageError(
      `model ${model.id} does not support ${flag}`,
      `see its parameters with: higgsfield-axi models ${model.id}, or pick another model: higgsfield-axi models --kind ${model.kind}`,
    );
  }
  values[p.name] = value;
}

async function resolveMediaRole(
  model: ModelEntry,
  mediaLists: Record<string, string[]>,
  role: string,
  flag: string,
  raw: unknown,
): Promise<void> {
  if (raw === undefined) return;
  const p = roleParam(model, role);
  if (!p) {
    throw new UsageError(
      `model ${model.id} does not support ${flag}`,
      `see its parameters with: higgsfield-axi models ${model.id}, or pick another model: higgsfield-axi models --kind ${model.kind}`,
    );
  }
  const items = String(raw)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (p.type !== "array" && items.length > 1) {
    throw new UsageError(`model ${model.id} accepts a single ${flag} value`, `pass one file or URL`);
  }
  const urls: string[] = [];
  for (const item of items) urls.push(await resolveMediaInput(item));
  mediaLists[p.name] = urls;
}

function nextStepsAfterSubmit(status: RequestStatus, outDir: string): string[] {
  return [
    `higgsfield-axi wait ${status.request_id} --out ${outDir}`,
    `higgsfield-axi status ${status.request_id}`,
    `higgsfield-axi cancel ${status.request_id}`,
  ];
}

export function renderTerminal(
  status: RequestStatus,
  files: Array<{ path: string; bytes: number }>,
  model?: string,
): { text: string; exitCode: number } {
  const kv: Array<[string, unknown]> = [["request", status.request_id]];
  if (model) kv.push(["model", model]);
  kv.push(["status", status.status]);

  if (status.status === "completed") {
    const parts = [emitKV(kv)];
    if (files.length > 0) {
      parts.push(emitList("files", files, ["path", "bytes"]));
    } else {
      const urls = outputUrls(status);
      parts.push(emitList("outputs", urls.map((url) => ({ url })), ["url"]));
    }
    return { text: parts.join("\n"), exitCode: 0 };
  }
  if (status.status === "canceled") {
    return { text: emitKV(kv), exitCode: 0 };
  }
  const reason =
    status.status === "nsfw"
      ? "input or output was rejected by content moderation"
      : status.error || "generation failed";
  kv.push(["error", reason]);
  return { text: emitKV(kv), exitCode: 1 };
}

export async function submitAndReport(
  model: ModelEntry,
  body: Record<string, unknown>,
  parsed: Parsed,
): Promise<number> {
  const outDir = String(parsed.flags["out"]);
  const timeoutMs = parseTimeout(parsed.flags["timeout"]);
  const submitted = asRequestStatus(await apiRequest("POST", model.path, { body }));

  if (parsed.flags["no-wait"]) {
    print(
      emitKV([
        ["request", submitted.request_id],
        ["model", model.id],
        ["status", submitted.status],
      ]),
    );
    print(helpBlock(nextStepsAfterSubmit(submitted, outDir)));
    return 0;
  }

  const terminal = await pollUntilTerminal(submitted.request_id, timeoutMs);
  const files = terminal.status === "completed" ? await downloadOutputs(terminal, outDir) : [];
  const { text, exitCode } = renderTerminal(terminal, files, model.id);
  print(text);
  if (exitCode === 0 && terminal.status === "completed") {
    print(
      helpBlock([
        `higgsfield-axi ${model.kind} "<prompt>" --model ${model.id}`,
        `higgsfield-axi models ${model.id}`,
        "higgsfield-axi models --kind " + model.kind,
      ]),
    );
  }
  return exitCode;
}

export const imageCommand: CommandModule = {
  spec: {
    name: "image",
    summary: "Generate images from a prompt (downloads results by default)",
    args: [{ name: "prompt", required: true, description: "text prompt for the image" }],
    flags: [
      {
        name: "model",
        type: "string",
        description: `image model id (default ${DEFAULTS.image}, or ${DEFAULTS.imageWithRef} when --ref is set)`,
      },
      { name: "ref", type: "string", description: "reference image(s): local file or URL, comma-separated for models that take several" },
      { name: "aspect", type: "string", description: "aspect ratio, e.g. 16:9 (model-dependent)" },
      { name: "resolution", type: "string", description: "output resolution (model-dependent, e.g. 2K)" },
      { name: "n", type: "string", description: "number of images (models that support it)" },
      ...COMMON_FLAGS,
    ],
    examples: [
      'higgsfield-axi image "minimal hero banner, pastel gradients" --aspect 16:9',
      'higgsfield-axi image "same scene at night" --ref ./day.jpg',
      'higgsfield-axi image "product shot" --model nano-banana --n 4 --no-wait',
    ],
  },
  async run(parsed) {
    const modelId =
      (parsed.flags["model"] as string | undefined) ??
      (parsed.flags["ref"] !== undefined ? DEFAULTS.imageWithRef : DEFAULTS.image);
    const model = findModel(modelId);
    if (model.kind !== "image") {
      throw new UsageError(
        `${model.id} is a ${model.kind} model`,
        `use: higgsfield-axi ${model.kind} "<prompt>" --model ${model.id}`,
      );
    }
    const values: Record<string, unknown> = parseParamsFlag(parsed.flags["params"]);
    setRole(model, values, "aspect", "--aspect", parsed.flags["aspect"]);
    setRole(model, values, "resolution", "--resolution", parsed.flags["resolution"]);
    setRole(model, values, "n", "--n", parsed.flags["n"]);
    setRole(model, values, "seed", "--seed", parsed.flags["seed"]);
    const mediaLists: Record<string, string[]> = {};
    await resolveMediaRole(model, mediaLists, "ref", "--ref", parsed.flags["ref"]);
    const body = buildBody(model, { prompt: parsed.positionals[0]!, values, mediaLists });
    return submitAndReport(model, body, parsed);
  },
};

export const videoCommand: CommandModule = {
  spec: {
    name: "video",
    summary: "Generate video from a prompt (downloads results by default)",
    args: [{ name: "prompt", required: true, description: "text prompt for the video" }],
    flags: [
      {
        name: "model",
        type: "string",
        description: `video model id (default ${DEFAULTS.video}, or ${DEFAULTS.videoWithImage} when --image is set)`,
      },
      { name: "image", type: "string", description: "input image (local file or URL) for image-to-video / first frame" },
      { name: "end-image", type: "string", description: "last-frame image for models that support it" },
      { name: "ref", type: "string", description: "reference image(s) for reference-to-video models, comma-separated" },
      { name: "duration", type: "string", description: "clip duration (model-dependent, e.g. 6)" },
      { name: "aspect", type: "string", description: "aspect ratio, e.g. 16:9 (model-dependent)" },
      { name: "resolution", type: "string", description: "output resolution (model-dependent, e.g. 1080)" },
      { name: "audio", type: "boolean", description: "generate audio (models that support it)" },
      ...COMMON_FLAGS,
    ],
    examples: [
      'higgsfield-axi video "slow dolly-in on a sunlit desk" --aspect 16:9',
      'higgsfield-axi video "animate this hero image" --image ./hero.png',
      'higgsfield-axi video "orbit shot" --model kling-video/v2.5-turbo/pro/image-to-video --image ./shot.jpg',
    ],
  },
  async run(parsed) {
    const modelId =
      (parsed.flags["model"] as string | undefined) ??
      (parsed.flags["image"] !== undefined ? DEFAULTS.videoWithImage : DEFAULTS.video);
    const model = findModel(modelId);
    if (model.kind !== "video") {
      throw new UsageError(
        `${model.id} is a ${model.kind} model`,
        `use: higgsfield-axi ${model.kind} "<prompt>" --model ${model.id}`,
      );
    }
    const values: Record<string, unknown> = parseParamsFlag(parsed.flags["params"]);
    setRole(model, values, "duration", "--duration", parsed.flags["duration"]);
    setRole(model, values, "aspect", "--aspect", parsed.flags["aspect"]);
    setRole(model, values, "resolution", "--resolution", parsed.flags["resolution"]);
    setRole(model, values, "seed", "--seed", parsed.flags["seed"]);
    if (parsed.flags["audio"]) {
      const p = roleParam(model, "audio") ?? model.params.find((x) => x.name === "generate_audio");
      if (!p) {
        throw new UsageError(
          `model ${model.id} does not support --audio`,
          `see its parameters with: higgsfield-axi models ${model.id}`,
        );
      }
      values[p.name] = true;
    }
    const mediaLists: Record<string, string[]> = {};
    await resolveMediaRole(model, mediaLists, "image", "--image", parsed.flags["image"]);
    await resolveMediaRole(model, mediaLists, "endImage", "--end-image", parsed.flags["end-image"]);
    await resolveMediaRole(model, mediaLists, "ref", "--ref", parsed.flags["ref"]);
    const body = buildBody(model, { prompt: parsed.positionals[0]!, values, mediaLists });
    return submitAndReport(model, body, parsed);
  },
};
