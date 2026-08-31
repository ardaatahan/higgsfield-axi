// Parses the job JSON the Higgsfield CLI prints with --json for
// `generate create`, `generate get`, and `generate wait`. The CLI's README
// does not document this shape; the field names below (job_id, status,
// result_url, urls) come from the compiled binary's own JSON tags.

import { AxiError } from "../output/errors.js";

export interface JobResult {
  jobId: string;
  status: string;
  urls: string[];
}

export function parseJsonLoose(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function parseJob(data: unknown): JobResult {
  const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const jobId = String(obj["job_id"] ?? obj["id"] ?? "");
  const status = String(obj["status"] ?? "unknown");
  const urls: string[] = [];
  if (Array.isArray(obj["urls"])) {
    for (const u of obj["urls"] as unknown[]) if (typeof u === "string") urls.push(u);
  }
  if (urls.length === 0 && typeof obj["result_url"] === "string") {
    urls.push(obj["result_url"] as string);
  }
  return { jobId, status, urls };
}

const RAW_PREVIEW_LIMIT = 300;

/**
 * Parse a `--json` job payload, or fail loudly. Output the CLI never meant as
 * job JSON must not be smoothed into a plausible-looking "unknown" success:
 * the raw text travels in the error so the caller can see what came back.
 */
export function parseJobOutput(stdout: string): JobResult {
  const data = parseJsonLoose(stdout);
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    const raw = stdout.trim().replace(/\s+/g, " ").slice(0, RAW_PREVIEW_LIMIT);
    throw new AxiError(
      `higgsfield returned a malformed response: ${raw || "(no output)"}`,
      "retry the command; if it persists, run the same `higgsfield generate` command directly to inspect its output",
    );
  }
  return parseJob(data);
}

// The CLI does not publish a status enum, so failure is detected by keyword
// rather than an exact match list.
const FAILURE_STATUS_PATTERN = /fail|error|nsfw|reject|cancel/i;

export function isFailureStatus(status: string): boolean {
  return FAILURE_STATUS_PATTERN.test(status);
}
