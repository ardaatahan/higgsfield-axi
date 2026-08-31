// Subprocess wrapper around the official Higgsfield CLI (`higgsfield`,
// package @higgsfield/cli: https://github.com/higgsfield-ai/cli). Every
// generation, listing, and lifecycle command in this tool shells out through
// here instead of calling api.higgsfield.ai directly.

import { spawn } from "node:child_process";
import { AxiError } from "../output/errors.js";

/** Test-only override so the offline suite can point at a mocked binary. */
export const HF_BIN = process.env["HIGGSFIELD_AXI_BIN"] || "higgsfield";

const INSTALL_HINT =
  "install it: npm install -g @higgsfield/cli (or: brew install higgsfield-ai/tap/higgsfield, or the curl installer - see https://github.com/higgsfield-ai/cli#install), then run: higgsfield auth login";

export interface HfRun {
  code: number;
  stdout: string;
  stderr: string;
}

/**
 * Run the Higgsfield CLI and resolve with its result, whatever the exit code.
 * The vendor's update notice ("A new Higgsfield CLI is available: ...") is
 * disabled via HIGGSFIELD_NO_UPDATE_CHECK: this tool parses the CLI's stdout
 * strictly and never wants an interactive nudge in a scripted context.
 */
export function runHf(args: string[]): Promise<HfRun> {
  return new Promise((resolve, reject) => {
    const child = spawn(HF_BIN, args, {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, HIGGSFIELD_NO_UPDATE_CHECK: "1" },
    });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (d: string) => (stdout += d));
    child.stderr.setEncoding("utf8").on("data", (d: string) => (stderr += d));
    child.on("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "ENOENT") {
        reject(
          new AxiError(
            `the official Higgsfield CLI ('${HF_BIN}') is not installed or not on PATH`,
            INSTALL_HINT,
          ),
        );
      } else {
        reject(
          new AxiError(
            `failed to run the Higgsfield CLI: ${err.message}`,
            `verify '${HF_BIN}' is executable and on PATH`,
          ),
        );
      }
    });
    child.on("close", (code) => resolve({ code: code ?? 1, stdout, stderr }));
  });
}

// The vendor binary formats its Hint: lines with its own program name, `hf`,
// which no install actually puts on PATH (npm and brew ship `higgsfield`), so
// self-references are rewritten to the binary this tool invokes.
function rewriteHint(hint: string): string {
  return hint.replace(/\bhf\b/g, HF_BIN);
}

/** The CLI prints "Error: ...\nHint: ..." to stderr on failure, any --json. */
function parseHfError(stderr: string, code: number): AxiError {
  const lines = stderr
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const errLine = lines.find((l) => l.startsWith("Error:"));
  const hintLine = lines.find((l) => l.startsWith("Hint:"));
  const message = errLine ? errLine.replace(/^Error:\s*/, "") : stderr.trim() || `higgsfield exited with code ${code}`;
  const suggestion = hintLine ? rewriteHint(hintLine.replace(/^Hint:\s*/, "")) : undefined;
  return new AxiError(message, suggestion);
}

/** Run the CLI and return stdout, or throw a structured AxiError on failure. */
export async function hf(args: string[]): Promise<string> {
  const res = await runHf(args);
  if (res.code !== 0) throw parseHfError(res.stderr, res.code);
  return res.stdout;
}

export interface CliStatus {
  installed: boolean;
  version?: string;
  /** undefined when installed but the auth check itself failed unexpectedly. */
  authenticated?: boolean;
}

/** Best-effort CLI presence/auth probe for the home view. Never throws. */
export async function probeCli(): Promise<CliStatus> {
  let versionRun: HfRun;
  try {
    versionRun = await runHf(["version"]);
  } catch {
    return { installed: false };
  }
  const version = versionRun.stdout.trim().split("\n")[0] || undefined;
  let authenticated: boolean | undefined;
  try {
    // Discard stdout: a successful call prints the access token, which must
    // never be echoed anywhere. Only the exit code is used.
    const tokenRun = await runHf(["auth", "token"]);
    authenticated = tokenRun.code === 0;
  } catch {
    authenticated = undefined;
  }
  return { installed: true, version, authenticated };
}
