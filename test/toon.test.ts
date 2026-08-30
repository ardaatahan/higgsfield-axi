// Unit tests for TOON value escaping in status/error output.

import { describe, expect, it } from "vitest";
import { emitKV } from "../src/output/toon.js";

describe("emitKV", () => {
  it("quotes and escapes values containing commas, quotes, or newlines", () => {
    expect(emitKV([["error", "line one\nline two"]])).toBe('error: "line one\nline two"');
    expect(emitKV([["error", "a, b"]])).toBe('error: "a, b"');
    expect(emitKV([["error", 'say "hi"']])).toBe('error: "say ""hi"""');
  });

  it("leaves plain values unquoted", () => {
    expect(emitKV([["status", "completed"]])).toBe("status: completed");
  });
});
