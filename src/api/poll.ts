// Polling per docs/concepts/polling: start at 2s, grow 1.5x to a 10s cap,
// add jitter, stop on terminal states. Transient failures (5xx, network)
// retry with the same backoff; hard failures (401/404) stop immediately.

import { AxiError } from "../output/errors.js";
import { apiRequest, HttpStatusError } from "./http.js";
import { asRequestStatus, isTerminal, type RequestStatus } from "./status.js";

const MAX_TRANSIENT_FAILURES = 5;

function envMs(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Backoff schedule: grow 1.5x per poll up to the cap (docs/concepts/polling). */
export function nextDelay(delayMs: number, capMs: number): number {
  return Math.min(delayMs * 1.5, capMs);
}

/** Jitter scaled to the base interval so tests with tiny bases stay fast. */
export function jitter(baseMs: number): number {
  return Math.random() * 500 * (baseMs / 2000);
}

export async function getStatus(requestId: string): Promise<RequestStatus> {
  const data = await apiRequest("GET", `/requests/${requestId}/status`);
  return asRequestStatus(data);
}

export async function pollUntilTerminal(
  requestId: string,
  timeoutMs: number,
): Promise<RequestStatus> {
  // Test hooks: shrink the pacing without touching the backoff logic.
  const base = envMs("HIGGSFIELD_AXI_POLL_BASE_MS", 2000);
  const cap = envMs("HIGGSFIELD_AXI_POLL_CAP_MS", 10_000);
  const deadline = Date.now() + timeoutMs;
  let delay = base;
  let transientFailures = 0;

  for (;;) {
    let status: RequestStatus | null = null;
    try {
      status = await getStatus(requestId);
      transientFailures = 0;
    } catch (err) {
      const transient =
        (err instanceof HttpStatusError && err.status >= 500) ||
        (err instanceof AxiError && !(err instanceof HttpStatusError) && err.message.startsWith("network error"));
      if (!transient) throw err;
      transientFailures++;
      if (transientFailures >= MAX_TRANSIENT_FAILURES) {
        throw new AxiError(
          `polling failed ${transientFailures} times in a row for request ${requestId}`,
          `retry: higgsfield-axi wait ${requestId}`,
        );
      }
    }
    if (status && isTerminal(status.status)) return status;
    if (Date.now() + delay > deadline) {
      throw new AxiError(
        `timed out waiting for request ${requestId} (last status: ${status?.status ?? "unknown"})`,
        `the request keeps running server-side; resume with: higgsfield-axi wait ${requestId}`,
      );
    }
    await sleep(delay + jitter(base));
    delay = nextDelay(delay, cap);
  }
}
