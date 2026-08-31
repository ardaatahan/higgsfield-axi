// Parses the job JSON the Higgsfield CLI prints with --json for
// `generate create`, `generate get`, and `generate wait`. The CLI's README
// does not document this shape; the field names below (job_id, status,
// result_url, urls) come from the compiled binary's own JSON tags.

import { AxiError, malformedResponse, retryHint } from "../output/errors.js";

export interface JobResult {
  jobId: string;
  status: string;
  urls: string[];
}

/** Parse the CLI's `--json` stdout, which is one JSON document or nothing. */
export function parseJsonLoose(text: string): unknown {
  try {
    return JSON.parse(text.trim());
  } catch {
    return undefined;
  }
}

// A job id ends up as a file name component and inside suggested commands, so
// it is only recognizable when it is a primitive (String() on anything else
// yields a truthy "[object Object]") whose characters cannot escape a
// directory or a shell word.
const SAFE_JOB_ID = /^[A-Za-z0-9._-]+$/;

export function isSafeJobId(value: string): boolean {
  return SAFE_JOB_ID.test(value) && value !== "." && value !== "..";
}

function idField(value: unknown): string {
  if (typeof value !== "string" && typeof value !== "number") return "";
  const id = String(value);
  return isSafeJobId(id) ? id : "";
}

export function parseJob(data: unknown): JobResult {
  const obj = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const jobId = idField(obj["job_id"]) || idField(obj["id"]);
  const status = typeof obj["status"] === "string" ? obj["status"] : "unknown";
  const urls: string[] = [];
  if (Array.isArray(obj["urls"])) {
    for (const u of obj["urls"] as unknown[]) if (typeof u === "string") urls.push(u);
  }
  if (urls.length === 0 && typeof obj["result_url"] === "string") {
    urls.push(obj["result_url"] as string);
  }
  return { jobId, status, urls };
}

/**
 * Parse a `--json` job payload, or fail loudly. A result must be tied to a job
 * id: either the payload's own, or - for `status`/`wait`, where the caller
 * already knows it - `knownId`, provided the payload at least reports a
 * status. Anything else is not smoothed into a plausible-looking "unknown"
 * success; the raw text travels in the error so the caller can see what came
 * back.
 */
export interface ParseJobOptions {
  /** The id `status`/`wait` already know, used when the payload omits its own. */
  knownId?: string;
  /**
   * Recovery when the payload cannot be read. Defaults to advising a retry,
   * which is wrong for a non-idempotent call like `generate create`.
   */
  malformedSuggestion?: string;
}

export function parseJobOutput(stdout: string, opts: ParseJobOptions = {}): JobResult {
  const { knownId, malformedSuggestion } = opts;
  const data = parseJsonLoose(stdout);
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const record = data as Record<string, unknown>;
    const job = parseJob(record);
    if (job.jobId) return job;
    const jobIds = Array.isArray(record["job_ids"]) ? (record["job_ids"] as unknown[]) : undefined;
    if (jobIds?.length === 1) {
      const onlyId = idField(jobIds[0]);
      if (onlyId) return { ...job, jobId: onlyId };
    }
    if (knownId && typeof record["status"] === "string") {
      return { ...job, jobId: knownId };
    }
    if (jobIds && jobIds.length > 1) {
      throw new AxiError(
        "higgsfield returned a job set: batch (multi-job) generation is not supported by higgsfield-axi yet",
        "run `higgsfield generate list` to see the jobs in the set, then `higgsfield generate get <job-id>` for each one",
      );
    }
  }
  throw malformedResponse(stdout, malformedSuggestion ?? retryHint("higgsfield generate"));
}

// The CLI does not publish a status enum, so failure is detected by keyword
// rather than an exact match list.
const FAILURE_STATUS_PATTERN = /fail|error|nsfw|reject|cancel/i;

export function isFailureStatus(status: string): boolean {
  return FAILURE_STATUS_PATTERN.test(status);
}
