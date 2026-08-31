// Turns a --json response from the Higgsfield CLI into TOON. Falls back to
// wrapping raw text when a response isn't JSON (or the CLI changes shape),
// so an unexpected upstream format degrades gracefully instead of crashing.

import { emitBlock, emitKV, emitList } from "./toon.js";

export function emitFromJson(name: string, raw: string): string {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    const lines = raw.trim().split("\n").filter(Boolean);
    return lines.length > 0 ? emitBlock(name, lines) : emitKV([[name, ""]]);
  }
  if (Array.isArray(data)) {
    const rows = data.map((r) => (r && typeof r === "object" ? (r as Record<string, unknown>) : { value: r }));
    const fields = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    return emitList(name, rows, fields);
  }
  if (data && typeof data === "object") {
    return emitKV(Object.entries(data as Record<string, unknown>));
  }
  return emitBlock(name, [String(data)]);
}
