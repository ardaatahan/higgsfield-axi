// `image` and `video` - build a `higgsfield generate create` invocation,
// wait for completion by default, download outputs, and print local paths.

import type { CommandModule } from "../cli/router.js";
import type { Parsed } from "../cli/args.js";
import type { FlagSpec } from "../cli/spec.js";
import { emitKV, emitList, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { hf } from "../hf/exec.js";
import { downloadOutputs } from "../hf/download.js";
import { DEFAULT_MODELS } from "../hf/defaults.js";
import { isFailureStatus, parseJob, parseJsonLoose } from "../hf/job.js";

export const DEFAULT_OUT_DIR = "higgsfield-out";

const PASSTHROUGH_HINT =
  "any other --flag value is forwarded to `higgsfield generate create <model>` (e.g. --aspect_ratio, --resolution, --duration, --image-references, --start-image, --end-image); inspect a model's accepted parameters with `higgsfield-axi models <model-id>`";

const COMMON_FLAGS: FlagSpec[] = [
  { name: "wait-timeout", type: "string", description: "max wait duration while polling, e.g. 20m (default 10m)" },
  { name: "wait-interval", type: "string", description: "poll interval while waiting, e.g. 5s (default 3s)" },
  { name: "no-wait", type: "boolean", description: "submit only; print the job id without waiting" },
  { name: "out", type: "string", default: DEFAULT_OUT_DIR, description: "directory for downloaded outputs" },
];

function buildCreateArgs(model: string, prompt: string, parsed: Parsed): string[] {
  const args = ["generate", "create", model, "--prompt", prompt];
  for (const [name, value] of Object.entries(parsed.passthrough)) {
    args.push(`--${name}`);
    if (typeof value === "string") args.push(value);
  }
  if (!parsed.flags["no-wait"]) {
    args.push("--wait");
    if (parsed.flags["wait-timeout"]) args.push("--wait-timeout", String(parsed.flags["wait-timeout"]));
    if (parsed.flags["wait-interval"]) args.push("--wait-interval", String(parsed.flags["wait-interval"]));
  }
  args.push("--json");
  return args;
}

function nextStepsAfterSubmit(jobId: string): string[] {
  return [`higgsfield-axi wait ${jobId}`, `higgsfield-axi status ${jobId}`];
}

/** Shared by image/video submission and the `wait` command's terminal report. */
export function renderJobResult(
  job: { jobId: string; status: string; urls: string[] },
  files: Array<{ path: string; bytes: number }>,
  model?: string,
): { text: string; exitCode: number } {
  const kv: Array<[string, unknown]> = [["job", job.jobId]];
  if (model) kv.push(["model", model]);
  kv.push(["status", job.status]);

  if (isFailureStatus(job.status)) {
    kv.push(["error", job.status]);
    return { text: emitKV(kv), exitCode: 1 };
  }
  const parts = [emitKV(kv)];
  if (files.length > 0) {
    parts.push(emitList("files", files, ["path", "bytes"]));
  } else if (job.urls.length > 0) {
    parts.push(emitList("outputs", job.urls.map((url) => ({ url })), ["url"]));
  }
  return { text: parts.join("\n"), exitCode: 0 };
}

async function submitAndReport(kind: "image" | "video", model: string, parsed: Parsed): Promise<number> {
  const prompt = parsed.positionals[0]!;
  const outDir = String(parsed.flags["out"]);
  const stdout = await hf(buildCreateArgs(model, prompt, parsed));
  const job = parseJob(parseJsonLoose(stdout));

  if (parsed.flags["no-wait"]) {
    print(emitKV([["job", job.jobId], ["model", model], ["status", job.status]]));
    print(helpBlock(nextStepsAfterSubmit(job.jobId)));
    return 0;
  }

  const files = !isFailureStatus(job.status) && job.urls.length > 0 ? await downloadOutputs(job.jobId, job.urls, outDir) : [];
  const { text, exitCode } = renderJobResult(job, files, model);
  print(text);
  if (exitCode === 0) {
    print(
      helpBlock([
        `higgsfield-axi ${kind} "<prompt>" --model ${model}`,
        "higgsfield-axi models --kind " + kind,
      ]),
    );
  }
  return exitCode;
}

export const imageCommand: CommandModule = {
  spec: {
    name: "image",
    summary: "Generate images via the Higgsfield CLI (downloads results by default)",
    args: [{ name: "prompt", required: true, description: "text prompt for the image" }],
    flags: [
      { name: "model", type: "string", description: `image model job_type (default ${DEFAULT_MODELS.image})` },
      ...COMMON_FLAGS,
    ],
    passthrough: true,
    passthroughHint: PASSTHROUGH_HINT,
    examples: [
      'higgsfield-axi image "minimal hero banner, pastel gradients" --aspect_ratio 16:9',
      'higgsfield-axi image "same scene at night" --image-references ./day.jpg',
      'higgsfield-axi image "product shot" --model gpt_image_2 --no-wait',
    ],
  },
  async run(parsed) {
    const model = (parsed.flags["model"] as string | undefined) ?? DEFAULT_MODELS.image;
    return submitAndReport("image", model, parsed);
  },
};

export const videoCommand: CommandModule = {
  spec: {
    name: "video",
    summary: "Generate video via the Higgsfield CLI (downloads results by default)",
    args: [{ name: "prompt", required: true, description: "text prompt for the video" }],
    flags: [
      { name: "model", type: "string", description: `video model job_type (default ${DEFAULT_MODELS.video})` },
      ...COMMON_FLAGS,
    ],
    passthrough: true,
    passthroughHint: PASSTHROUGH_HINT,
    examples: [
      'higgsfield-axi video "slow dolly-in on a sunlit desk" --aspect_ratio 16:9',
      'higgsfield-axi video "animate this hero image" --start-image ./hero.png',
      'higgsfield-axi video "orbit shot" --model kling3_0 --duration 5 --mode pro',
    ],
  },
  async run(parsed) {
    const model = (parsed.flags["model"] as string | undefined) ?? DEFAULT_MODELS.video;
    return submitAndReport("video", model, parsed);
  },
};
