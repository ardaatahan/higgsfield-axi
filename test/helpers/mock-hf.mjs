#!/usr/bin/env node
// Stand-in for the official `higgsfield` binary. Every offline test points
// HIGGSFIELD_AXI_BIN at this script so higgsfield-axi's subprocess wrapper
// (src/hf/exec.ts) shells out to it instead of the real CLI. Behavior is
// controlled entirely by env vars set per test; every invocation's argv is
// appended (one JSON array per line) to MOCK_HF_LOG for assertions.

import { appendFileSync } from "node:fs";

const args = process.argv.slice(2);

const logPath = process.env.MOCK_HF_LOG;
if (logPath) appendFileSync(logPath, JSON.stringify(args) + "\n");

function fail(message, hint, code) {
  process.stderr.write(`Error: ${message}\n`);
  if (hint) process.stderr.write(`Hint: ${hint}\n`);
  process.exit(code);
}

const [cmd, sub, ...rest] = args;

if (cmd === "version") {
  process.stdout.write((process.env.MOCK_HF_VERSION ?? "higgsfield 9.9.9 (mock) built 2026-01-01T00:00:00Z") + "\n");
  process.exit(0);
}

if (cmd === "auth" && sub === "token") {
  if ((process.env.MOCK_HF_AUTH ?? "ok") === "missing") {
    fail("Not authenticated.", "Run: hf auth login", 2);
  }
  process.stdout.write((process.env.MOCK_HF_TOKEN ?? "mock-secret-token-abc123") + "\n");
  process.exit(0);
}

if (process.env.MOCK_HF_FAIL_WORKSPACE === "1" && (cmd === "model" || cmd === "generate")) {
  fail("No workspace selected.", "Run: hf workspace set <workspace_id>", 4);
}

if (cmd === "model" && sub === "list") {
  process.stdout.write(
    process.env.MOCK_HF_MODEL_LIST ??
      JSON.stringify([{ job_type: "nano_banana_2", name: "Nano Banana Pro", media_type: "image" }]),
  );
  process.exit(0);
}

if (cmd === "model" && sub === "get") {
  const id = rest[0];
  if (id === "totally-bogus-model") {
    fail(`Unknown model "${id}".`, "Run: higgsfield model list for the current catalog.", 1);
  }
  process.stdout.write(
    process.env.MOCK_HF_MODEL_GET ?? JSON.stringify({ job_type: id, params: [{ name: "aspect_ratio", type: "string" }] }),
  );
  process.exit(0);
}

if (cmd === "generate" && (sub === "create" || sub === "get" || sub === "wait")) {
  const id = sub === "create" ? (process.env.MOCK_HF_JOB_ID ?? "job-1") : rest[0];
  if (id === "missing-job") {
    fail(`Unknown job "${id}".`, "Run: higgsfield generate list", 1);
  }
  const status = process.env.MOCK_HF_JOB_STATUS ?? "completed";
  const urls = JSON.parse(process.env.MOCK_HF_JOB_URLS ?? "[]");
  process.stdout.write(JSON.stringify({ job_id: id, job_type: sub === "create" ? rest[0] : undefined, status, urls }));
  process.exit(0);
}

fail(`unknown command "${args.join(" ")}" for "higgsfield"`, undefined, 1);
