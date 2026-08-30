// Thin fetch wrapper for the Higgsfield API. Maps HTTP failures to
// structured AxiErrors with actionable suggestions (per the docs'
// errors-and-retries guidance). Raw dependency errors never reach stdout.

import { AxiError } from "../output/errors.js";
import { authHeader, requireCreds } from "./creds.js";

export const DEFAULT_BASE_URL = "https://api.higgsfield.ai";

export function baseUrl(): string {
  return process.env["HIGGSFIELD_BASE_URL"] ?? DEFAULT_BASE_URL;
}

export class HttpStatusError extends AxiError {
  status: number;

  constructor(status: number, message: string, suggestion?: string) {
    super(message, suggestion);
    this.status = status;
  }
}

function describeStatus(status: number, detail: string): [string, string] {
  switch (status) {
    case 400:
      return [
        `request rejected: ${detail}`,
        "correct the parameters, or wait if the account concurrency limit was reached",
      ];
    case 401:
      return [
        "invalid or missing API credentials",
        "check HF_API_KEY_ID / HF_API_KEY_SECRET; create keys at https://cloud.higgsfield.ai",
      ];
    case 403:
      return [`insufficient credits: ${detail}`, "fund the account at https://cloud.higgsfield.ai"];
    case 404:
      return [`not found: ${detail}`, "verify the request id belongs to this account"];
    case 422:
      return [`request validation failed: ${detail}`, "run 'higgsfield-axi models <model-id>' to see valid parameters"];
    case 423:
      return [`model temporarily blocked: ${detail}`, "retry later"];
    case 503:
      return [`model disabled or not ready: ${detail}`, "retry later or pick another model with 'higgsfield-axi models'"];
    default:
      return [`API error (HTTP ${status}): ${detail}`, "retry with backoff; report if it persists"];
  }
}

function extractDetail(bodyText: string): string {
  try {
    const parsed = JSON.parse(bodyText) as { detail?: unknown };
    if (typeof parsed.detail === "string") return parsed.detail;
    if (parsed.detail !== undefined) return JSON.stringify(parsed.detail);
  } catch {
    // non-JSON error body; fall through
  }
  return bodyText.slice(0, 300) || "no detail provided";
}

export interface ApiRequestOptions {
  body?: unknown;
  /** Skip JSON parsing of the response (e.g. cancel returns no body). */
  expectBody?: boolean;
}

export async function apiRequest(
  method: "GET" | "POST",
  path: string,
  opts: ApiRequestOptions = {},
): Promise<unknown> {
  const creds = requireCreds();
  const headers: Record<string, string> = { Authorization: authHeader(creds) };
  let body: string | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  let res: Response;
  try {
    res = await fetch(baseUrl() + path, { method, headers, body });
  } catch (err) {
    const message = err instanceof Error ? (err.cause instanceof Error ? err.cause.message : err.message) : String(err);
    throw new AxiError(
      `network error reaching ${baseUrl()}: ${message}`,
      "check connectivity and retry",
    );
  }
  if (!res.ok) {
    const detail = extractDetail(await res.text());
    const [message, suggestion] = describeStatus(res.status, detail);
    throw new HttpStatusError(res.status, message, suggestion);
  }
  if (opts.expectBody === false) return undefined;
  try {
    return await res.json();
  } catch {
    throw new AxiError("API returned a malformed response body", "retry; report if it persists");
  }
}
