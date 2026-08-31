// `image` and `video` - build a `higgsfield generate create` invocation,
// wait for completion by default, download outputs, and print local paths.

import type { CommandModule } from "../cli/router.js";
import type { Parsed } from "../cli/args.js";
import type { FlagSpec } from "../cli/spec.js";
import { emitKV, emitList, print } from "../output/toon.js";
import { helpBlock, waitSuggestion } from "../output/suggest.js";
import { HfExitError, hf } from "../hf/exec.js";
import { UsageError } from "../output/errors.js";
import { downloadOutputs } from "../hf/download.js";
import { DEFAULT_MODELS } from "../hf/defaults.js";
import { isFailureStatus, parseJobOutput } from "../hf/job.js";

export const DEFAULT_OUT_DIR = "higgsfield-out";

const PASSTHROUGH_HINT =
  "any other --flag value is forwarded to `higgsfield generate create <model>` (e.g. --aspect_ratio, --resolution, --duration, --image-references, --start-image, --end-image); inspect a model's accepted parameters with `higgsfield-axi models <model-id>`";

const COMMON_FLAGS: FlagSpec[] = [
  { name: "wait-timeout", type: "string", description: "max wait duration while polling, e.g. 20m (default 10m)" },
  { name: "wait-interval", type: "string", description: "poll interval while waiting, e.g. 5s (default 3s)" },
  { name: "no-wait", type: "boolean", description: "submit only; print the job id without waiting" },
  { name: "out", type: "string", default: DEFAULT_OUT_DIR, description: "directory for downloaded outputs" },
];

const WAIT_TUNING_FLAGS = ["wait-timeout", "wait-interval"];

// Flags this command sets itself on the `generate create` argv; forwarding a
// second copy would leave the vendor to pick a winner, and for --prompt that
// means billing a generation the caller did not ask for.
const RESERVED_PASSTHROUGH = ["prompt", "wait", "json"];

function buildCreateArgs(model: string, prompt: string, parsed: Parsed): string[] {
  const args = ["generate", "create", model, "--prompt", prompt];
  for (const { name, value } of parsed.passthrough) {
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

const CREATE_RECOVERY =
  "the job may already have been created and billed - do not resubmit the same prompt; find it with `higgsfield generate list`, then run `higgsfield-axi wait <job-id>` or `higgsfield-axi status <job-id>`";

function nextStepsAfterSubmit(jobId: string, outDir: string): string[] {
  return [waitSuggestion(jobId, outDir), `higgsfield-axi status ${jobId}`];
}

/** Shared by image/video submission and the `wait` command's terminal report. */
export function renderJobResult(
  job: { jobId: string; status: string },
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
  const parts = [emitKV(kv), emitList("files", files, ["path", "bytes"])];
  return { text: parts.join("\n"), exitCode: 0 };
}

/**
 * `generate create --wait` submits the job before it blocks polling, so a
 * failure from that call - a wait timeout above all - can leave a job that
 * exists and is billed. The vendor error carries no id, so the caller is told
 * how to find the job instead of being left to resubmit it.
 */
async function submitJob(model: string, prompt: string, parsed: Parsed): Promise<string> {
  try {
    return await hf(buildCreateArgs(model, prompt, parsed));
  } catch (err) {
    if (parsed.flags["no-wait"] || !(err instanceof HfExitError)) throw err;
    err.suggestion = err.suggestion ? `${err.suggestion}; ${CREATE_RECOVERY}` : CREATE_RECOVERY;
    throw err;
  }
}

async function submitAndReport(kind: "image" | "video", model: string, parsed: Parsed): Promise<number> {
  if (parsed.positionals.length > 1) {
    throw new UsageError(
      `<prompt> must be a single argument for '${kind}', got ${parsed.positionals.length}`,
      `quote the whole prompt: higgsfield-axi ${kind} "${parsed.positionals.join(" ")}"`,
    );
  }
  const prompt = parsed.positionals[0]!;
  const reserved = parsed.passthrough.filter((f) => RESERVED_PASSTHROUGH.includes(f.name)).map((f) => `--${f.name}`);
  if (reserved.length > 0) {
    throw new UsageError(
      `${reserved.join(", ")} ${reserved.length > 1 ? "are" : "is"} set by higgsfield-axi and cannot be forwarded to '${kind}'`,
      `pass the prompt as the first argument and control waiting with --no-wait/--wait-timeout/--wait-interval: higgsfield-axi ${kind} "<prompt>"`,
    );
  }
  if (parsed.flags["no-wait"]) {
    const tuning = WAIT_TUNING_FLAGS.filter((name) => parsed.flags[name] !== undefined);
    if (tuning.length > 0) {
      throw new UsageError(
        `${tuning.map((name) => `--${name}`).join(" and ")} cannot be combined with --no-wait`,
        `drop --no-wait to wait with that tuning, or drop ${tuning.map((name) => `--${name}`).join("/")} to submit without waiting`,
      );
    }
  }
  const outDir = String(parsed.flags["out"]);
  const stdout = await submitJob(model, prompt, parsed);
  const job = parseJobOutput(stdout, { malformedSuggestion: CREATE_RECOVERY });

  if (parsed.flags["no-wait"]) {
    print(emitKV([["job", job.jobId], ["model", model], ["status", job.status]]));
    print(helpBlock(nextStepsAfterSubmit(job.jobId, outDir)));
    return 0;
  }

  const files = !isFailureStatus(job.status) && job.urls.length > 0 ? await downloadOutputs(job.jobId, job.urls, outDir) : [];
  const { text, exitCode } = renderJobResult(job, files, model);
  print(text);
  if (exitCode !== 0) {
    print(helpBlock([`higgsfield-axi models ${model}`, `higgsfield-axi ${kind} "<prompt>" --model ${model}`]));
    return exitCode;
  }
  print(
    helpBlock(
      files.length === 0
        ? nextStepsAfterSubmit(job.jobId, outDir)
        : [`higgsfield-axi ${kind} "<prompt>" --model ${model}`, "higgsfield-axi models --kind " + kind],
    ),
  );
  return exitCode;
}

export const imageCommand: CommandModule = {
  spec: {
    name: "image",
    summary: "Generate images via the Higgsfield CLI (downloads results by default)",
    args: [{ name: "prompt", required: true, description: "text prompt for the image; give it first, before any flags" }],
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
    args: [{ name: "prompt", required: true, description: "text prompt for the video; give it first, before any flags" }],
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
