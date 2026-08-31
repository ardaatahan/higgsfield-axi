// Turns a --json response from the Higgsfield CLI into TOON. Output that is
// not JSON is rejected rather than wrapped as if it were catalog data, the
// same rule src/hf/job.ts applies to job payloads.

import { malformedResponse } from "./errors.js";
import { emitBlock, emitKV, emitList } from "./toon.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// Scalars render as themselves; anything deeper stays readable as JSON rather
// than collapsing to "[object Object]" through String().
function cell(value: unknown): unknown {
  return value !== null && typeof value === "object" ? JSON.stringify(value) : value;
}

function emitRows(name: string, items: unknown[]): string {
  if (items.length === 0) return emitBlock(name, []);
  const rows = items.map((item) => (isRecord(item) ? item : { value: item }));
  const fields = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const cells = rows.map((row) => Object.fromEntries(fields.map((f) => [f, cell(row[f])])));
  return emitList(name, cells, fields);
}

export function emitFromJson(name: string, raw: string, vendorCommand: string): string {
  let data: unknown;
  try {
    data = JSON.parse(raw.trim());
  } catch {
    throw malformedResponse(raw, vendorCommand);
  }
  if (Array.isArray(data)) {
    return emitRows(name, data);
  }
  if (isRecord(data)) {
    const scalars: Array<[string, unknown]> = [];
    const blocks: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (Array.isArray(value)) blocks.push(emitRows(key, value));
      else scalars.push([key, cell(value)]);
    }
    const parts = scalars.length > 0 ? [emitKV(scalars), ...blocks] : blocks;
    return parts.length > 0 ? parts.join("\n") : emitKV([[name, ""]]);
  }
  return emitBlock(name, [String(data)]);
}
