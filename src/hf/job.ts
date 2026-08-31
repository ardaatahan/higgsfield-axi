// Parses the job JSON the Higgsfield CLI prints with --json for
// `generate create`, `generate get`, and `generate wait`. The CLI's README
// does not document this shape; the field names below (job_id, status,
// result_url, urls) come from the compiled binary's own JSON tags.

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
  } else if (typeof obj["result_url"] === "string") {
    urls.push(obj["result_url"] as string);
  }
  return { jobId, status, urls };
}

// The CLI does not publish a status enum, so failure is detected by keyword
// rather than an exact match list.
const FAILURE_STATUS_PATTERN = /fail|error|nsfw|reject|cancel/i;

export function isFailureStatus(status: string): boolean {
  return FAILURE_STATUS_PATTERN.test(status);
}
