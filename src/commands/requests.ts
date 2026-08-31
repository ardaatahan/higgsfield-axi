// `status` and `wait` - job lifecycle commands mapped onto the Higgsfield
// CLI's `generate get` / `generate wait`. There is no `cancel`: the upstream
// CLI does not expose one (verified via `higgsfield generate --help`).

import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitKV, emitList, print } from "../output/toon.js";
import { helpBlock, waitSuggestion } from "../output/suggest.js";
import { hf } from "../hf/exec.js";
import { downloadOutputs } from "../hf/download.js";
import { isFailureStatus, parseJobOutput } from "../hf/job.js";
import { DEFAULT_OUT_DIR, renderJobResult } from "./generate.js";

function requireJobId(positionals: string[]): string {
  const id = positionals[0];
  if (!id) throw new UsageError("missing required argument <job-id>");
  return id;
}

export const statusCommand: CommandModule = {
  spec: {
    name: "status",
    summary: "Show a job's current state and output URLs (no download)",
    args: [{ name: "job-id", required: true, description: "id returned when the job was submitted" }],
    flags: [],
    examples: ["higgsfield-axi status d7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff"],
  },
  async run(parsed) {
    const id = requireJobId(parsed.positionals);
    const stdout = await hf(["generate", "get", id, "--json"]);
    const job = parseJobOutput(stdout, { knownId: id });
    const failed = isFailureStatus(job.status);
    const kv: Array<[string, unknown]> = [["job", job.jobId], ["status", job.status]];
    if (failed) kv.push(["job_error", job.status]);
    print(emitKV(kv));
    if (job.urls.length > 0) {
      print(emitList("outputs", job.urls.map((url) => ({ url })), ["url"]));
    }
    print(
      helpBlock(
        failed
          ? ['higgsfield-axi image "<prompt>" --model <model-id>', 'higgsfield-axi video "<prompt>" --model <model-id>']
          : [waitSuggestion(id, DEFAULT_OUT_DIR)],
      ),
    );
    return 0;
  },
};

export const waitCommand: CommandModule = {
  spec: {
    name: "wait",
    summary: "Poll a job until it finishes and download its outputs",
    args: [{ name: "job-id", required: true, description: "id returned when the job was submitted" }],
    flags: [
      { name: "out", type: "string", default: DEFAULT_OUT_DIR, description: "directory for downloaded outputs" },
      { name: "timeout", type: "string", description: "max duration to wait, e.g. 20m (default 10m)" },
      { name: "interval", type: "string", description: "poll interval, e.g. 5s (default 3s)" },
    ],
    examples: [
      "higgsfield-axi wait d7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff",
      "higgsfield-axi wait d7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff --out ./assets",
    ],
  },
  async run(parsed) {
    const id = requireJobId(parsed.positionals);
    const args = ["generate", "wait", id];
    if (parsed.flags["timeout"]) args.push("--timeout", String(parsed.flags["timeout"]));
    if (parsed.flags["interval"]) args.push("--interval", String(parsed.flags["interval"]));
    args.push("--quiet", "--json");
    const stdout = await hf(args);
    const job = parseJobOutput(stdout, { knownId: id });
    const outDir = String(parsed.flags["out"]);
    const files = !isFailureStatus(job.status) && job.urls.length > 0 ? await downloadOutputs(job.jobId, job.urls, outDir) : [];
    const { text, exitCode } = renderJobResult(job, files);
    print(text);
    return exitCode;
  },
};
