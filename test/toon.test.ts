// Unit tests for TOON value escaping in status/error output.

import { describe, expect, it } from "vitest";
import { emitKV, emitList } from "../src/output/toon.js";

describe("emitKV", () => {
  it("quotes and escapes values containing commas, quotes, or newlines", () => {
    expect(emitKV([["error", "line one\nline two"]])).toBe('error: "line one\\nline two"');
    expect(emitKV([["error", "a, b"]])).toBe('error: "a, b"');
    expect(emitKV([["error", 'say "hi"']])).toBe('error: "say ""hi"""');
  });

  it("keeps a value with an embedded newline on one physical line", () => {
    const out = emitKV([["description", "first\r\nsecond"]]);
    expect(out.split("\n")).toHaveLength(1);
    expect(out).toBe('description: "first\\r\\nsecond"');
  });

  it("leaves plain values unquoted", () => {
    expect(emitKV([["status", "completed"]])).toBe("status: completed");
  });
});

describe("emitList", () => {
  it("emits exactly one body line per row even when a value spans lines", () => {
    const out = emitList(
      "models",
      [{ job_type: "m1", description: "line one\nline two" }, { job_type: "m2", description: "ok" }],
      ["job_type", "description"],
    );
    const lines = out.split("\n");
    expect(lines[0]).toBe("models[2]{job_type,description}:");
    expect(lines).toHaveLength(3);
  });
});
