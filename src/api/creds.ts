// Credential loading. Precedence: HF_API_KEY_ID / HF_API_KEY_SECRET env vars,
// then ~/.config/higgsfield-axi/credentials (KEY=VALUE lines). Values are
// never printed anywhere.

import { existsSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { AxiError } from "../output/errors.js";

export interface Creds {
  keyId: string;
  keySecret: string;
  source: "env" | "file";
}

export function credsFilePath(): string {
  const base =
    process.env["XDG_CONFIG_HOME"] && process.env["XDG_CONFIG_HOME"] !== ""
      ? process.env["XDG_CONFIG_HOME"]
      : join(homedir(), ".config");
  return join(base, "higgsfield-axi", "credentials");
}

function fromEnv(): Creds | null {
  const keyId = process.env["HF_API_KEY_ID"];
  const keySecret = process.env["HF_API_KEY_SECRET"];
  if (keyId && keySecret) return { keyId, keySecret, source: "env" };
  return null;
}

function fromFile(): Creds | null {
  const path = credsFilePath();
  if (!existsSync(path)) return null;
  const vars: Record<string, string> = {};
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  const keyId = vars["HF_API_KEY_ID"];
  const keySecret = vars["HF_API_KEY_SECRET"];
  if (keyId && keySecret) return { keyId, keySecret, source: "file" };
  return null;
}

export function loadCreds(): Creds | null {
  return fromEnv() ?? fromFile();
}

export function requireCreds(): Creds {
  const creds = loadCreds();
  if (creds) return creds;
  throw new AxiError(
    "no Higgsfield API credentials found",
    `set HF_API_KEY_ID and HF_API_KEY_SECRET env vars, or write them as KEY=VALUE lines to ${credsFilePath()}; create keys at https://cloud.higgsfield.ai`,
  );
}

export function authHeader(creds: Creds): string {
  return `Key ${creds.keyId}:${creds.keySecret}`;
}

/** One-line credential status for the home view. Never includes values. */
export function credsStatus(): string {
  const creds = loadCreds();
  if (!creds) return "missing (set HF_API_KEY_ID + HF_API_KEY_SECRET)";
  return creds.source === "env" ? "configured (env)" : `configured (${credsFilePath()})`;
}
