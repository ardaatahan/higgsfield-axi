// Smoke tests for the AXI contract. Requires a build first (`pretest`
// runs it automatically via `npm test`). These never need a real or mocked
// `higgsfield` binary: HIGGSFIELD_AXI_BIN points at a nonexistent path so a
// stray subprocess call would fail loudly instead of hitting the real CLI.

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const bin = fileURLToPath(new URL("../bin/higgsfield-axi.js", import.meta.url));
const ALL_SUBCOMMANDS = ["models", "image", "video", "status", "wait"];
const STRICT_SUBCOMMANDS = ["models", "status", "wait"];
const PASSTHROUGH_SUBCOMMANDS = ["image", "video"];

function run(...args: string[]) {
  return spawnSync("node", [bin, ...args], {
    encoding: "utf8",
    env: { ...process.env, HIGGSFIELD_AXI_BIN: "/nonexistent/higgsfield-axi-test-missing-binary" },
  });
}

describe("higgsfield-axi AXI contract", () => {
  it("no-args shows content and exits 0 (principle 8)", () => {
    const r = run();
    expect(r.status).toBe(0);
    expect(r.stdout).not.toMatch(/^\s*usage[:\s]/i);
    expect(r.stdout).toContain("higgsfield-cli:");
    expect(r.stdout).toContain("not installed");
  });

  it("--help exits 0 and lists flags (principle 10)", () => {
    const r = run("--help");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("--");
    expect(r.stdout).toContain("commands[");
  });

  it("unknown flag exits 2 naming valid flags (principle 6)", () => {
    const r = run("--not-a-real-flag");
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("error:");
    expect(r.stdout).toContain("--");
  });

  it("stderr is silent on success (principle 6)", () => {
    const r = run();
    expect(r.stderr.trim()).toBe("");
  });

  it.each(ALL_SUBCOMMANDS)("%s --help exits 0 with flags and examples (principle 10)", (cmd) => {
    const r = run(cmd, "--help");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("flags[");
    expect(r.stdout).toContain("examples[");
    expect(r.stderr.trim()).toBe("");
  });

  it.each(STRICT_SUBCOMMANDS)("%s rejects unknown flags with exit 2 (principle 6)", (cmd) => {
    const r = run(cmd, "--bogus-flag");
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("error: unknown flag --bogus-flag");
    expect(r.stdout).toContain("valid flags");
  });

  it.each(PASSTHROUGH_SUBCOMMANDS)("%s --help documents that unknown flags are forwarded to the CLI", (cmd) => {
    const r = run(cmd, "--help");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("passthrough[");
    expect(r.stdout).toContain("higgsfield generate create");
  });

  it("unknown command exits 2 listing valid commands", () => {
    const r = run("frobnicate");
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("unknown command");
    expect(r.stdout).toContain("models");
  });

  it("there is no cancel command", () => {
    const r = run("cancel", "some-id");
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("unknown command");
  });

  it("image/video require the prompt argument", () => {
    for (const cmd of PASSTHROUGH_SUBCOMMANDS) {
      const r = run(cmd);
      expect(r.status).toBe(2);
      expect(r.stdout).toContain("missing required argument <prompt>");
    }
  });
});
