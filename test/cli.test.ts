// Smoke tests for the AXI contract. Requires a build first (`pretest`
// runs it automatically via `npm test`).

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const bin = fileURLToPath(new URL("../bin/higgsfield-axi.js", import.meta.url));
const SUBCOMMANDS = ["models", "image", "video", "status", "wait", "cancel"];

function run(...args: string[]) {
  return spawnSync("node", [bin, ...args], { encoding: "utf8" });
}

describe("higgsfield-axi AXI contract", () => {
  it("no-args shows content and exits 0 (principle 8)", () => {
    const r = run();
    expect(r.status).toBe(0);
    expect(r.stdout).not.toMatch(/^\s*usage[:\s]/i);
    expect(r.stdout).toContain("credentials:");
    expect(r.stdout).toContain("catalog:");
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

  it.each(SUBCOMMANDS)("%s --help exits 0 with flags and examples (principle 10)", (cmd) => {
    const r = run(cmd, "--help");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("flags[");
    expect(r.stdout).toContain("examples[");
    expect(r.stderr.trim()).toBe("");
  });

  it.each(SUBCOMMANDS)("%s rejects unknown flags with exit 2 (principle 6)", (cmd) => {
    const r = run(cmd, "--bogus-flag");
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("error: unknown flag --bogus-flag");
    expect(r.stdout).toContain("valid flags");
  });

  it("unknown command exits 2 listing valid commands", () => {
    const r = run("frobnicate");
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("unknown command");
    expect(r.stdout).toContain("models");
  });

  it("models list has a total count header (principle 4)", () => {
    const r = run("models");
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/models\[\d+\]\{/);
  });

  it("models --fields opts into extra columns (principle 2)", () => {
    const r = run("models", "--fields", "id,path");
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("{id,path}");
    const bad = run("models", "--fields", "id,nope");
    expect(bad.status).toBe(2);
    expect(bad.stdout).toContain("valid fields");
  });
});
