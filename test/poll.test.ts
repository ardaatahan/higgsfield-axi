// Deterministic tests for the polling backoff schedule. Wall-clock timing
// is not asserted anywhere - local fetch latency is too noisy for that.

import { describe, expect, it } from "vitest";
import { jitter, nextDelay } from "../src/api/poll.js";

describe("polling backoff", () => {
  it("grows 1.5x per poll and caps at the ceiling", () => {
    const delays: number[] = [];
    let delay = 2000;
    for (let i = 0; i < 8; i++) {
      delays.push(delay);
      delay = nextDelay(delay, 10_000);
    }
    expect(delays).toEqual([2000, 3000, 4500, 6750, 10_000, 10_000, 10_000, 10_000]);
  });

  it("jitter stays within 0-500ms at the documented 2s base", () => {
    for (let i = 0; i < 50; i++) {
      const j = jitter(2000);
      expect(j).toBeGreaterThanOrEqual(0);
      expect(j).toBeLessThan(500);
    }
  });

  it("jitter shrinks proportionally for tiny test bases", () => {
    for (let i = 0; i < 50; i++) {
      expect(jitter(10)).toBeLessThan(2.5);
    }
  });
});
