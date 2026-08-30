// `status`, `wait`, `cancel` - request lifecycle commands.

import type { CommandModule } from "../cli/router.js";
import { UsageError } from "../output/errors.js";
import { emitKV, emitList, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";
import { apiRequest, HttpStatusError } from "../api/http.js";
import { getStatus, pollUntilTerminal } from "../api/poll.js";
import { isTerminal, outputUrls } from "../api/status.js";
import { downloadOutputs } from "../api/download.js";
import { DEFAULT_OUT_DIR, renderTerminal } from "./generate.js";

function requireRequestId(positionals: string[]): string {
  const id = positionals[0];
  if (!id) throw new UsageError("missing required argument <request-id>");
  return id;
}

export const statusCommand: CommandModule = {
  spec: {
    name: "status",
    summary: "Show a request's current state and output URLs (no download)",
    args: [{ name: "request-id", required: true, description: "id returned when the request was submitted" }],
    flags: [],
    examples: ["higgsfield-axi status d7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff"],
  },
  async run(parsed) {
    const id = requireRequestId(parsed.positionals);
    const status = await getStatus(id);
    const kv: Array<[string, unknown]> = [
      ["request", status.request_id],
      ["status", status.status],
    ];
    if (status.error) kv.push(["error", status.error]);
    print(emitKV(kv));
    const urls = outputUrls(status);
    if (urls.length > 0) {
      print(emitList("outputs", urls.map((url) => ({ url })), ["url"]));
    }
    const next = isTerminal(status.status)
      ? [`higgsfield-axi wait ${id} --out ${DEFAULT_OUT_DIR}`]
      : [`higgsfield-axi wait ${id} --out ${DEFAULT_OUT_DIR}`, `higgsfield-axi cancel ${id}`];
    print(helpBlock(next));
    return 0;
  },
};

export const waitCommand: CommandModule = {
  spec: {
    name: "wait",
    summary: "Poll a request to a terminal state and download its outputs",
    args: [{ name: "request-id", required: true, description: "id returned when the request was submitted" }],
    flags: [
      { name: "out", type: "string", default: DEFAULT_OUT_DIR, description: "directory for downloaded outputs" },
      { name: "timeout", type: "string", default: "900", description: "max seconds to wait" },
    ],
    examples: [
      "higgsfield-axi wait d7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff",
      "higgsfield-axi wait d7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff --out ./assets",
    ],
  },
  async run(parsed) {
    const id = requireRequestId(parsed.positionals);
    const timeoutSec = Number(parsed.flags["timeout"]);
    if (!Number.isFinite(timeoutSec) || timeoutSec <= 0) {
      throw new UsageError("--timeout must be a positive number of seconds", "example: --timeout 600");
    }
    const outDir = String(parsed.flags["out"]);
    const status = await pollUntilTerminal(id, timeoutSec * 1000);
    const files = status.status === "completed" ? await downloadOutputs(status, outDir) : [];
    const { text, exitCode } = renderTerminal(status, files);
    print(text);
    return exitCode;
  },
};

export const cancelCommand: CommandModule = {
  spec: {
    name: "cancel",
    summary: "Cancel a queued request (started requests can no longer be canceled)",
    args: [{ name: "request-id", required: true, description: "id returned when the request was submitted" }],
    flags: [],
    examples: ["higgsfield-axi cancel d7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff"],
  },
  async run(parsed) {
    const id = requireRequestId(parsed.positionals);
    try {
      await apiRequest("POST", `/requests/${id}/cancel`, { expectBody: false });
    } catch (err) {
      // Idempotent no-op: a request that already reached a terminal state
      // cannot be canceled; report the actual state instead of failing.
      if (err instanceof HttpStatusError && err.status === 400) {
        const status = await getStatus(id);
        if (isTerminal(status.status)) {
          print(
            emitKV([
              ["request", id],
              ["status", status.status],
              ["note", "already terminal; nothing to cancel"],
            ]),
          );
          return 0;
        }
        throw new HttpStatusError(
          400,
          `request ${id} has already started and can no longer be canceled`,
          `watch it finish with: higgsfield-axi wait ${id}`,
        );
      }
      throw err;
    }
    print(
      emitKV([
        ["request", id],
        ["status", "canceled"],
      ]),
    );
    print(helpBlock([`higgsfield-axi status ${id}`]));
    return 0;
  },
};
