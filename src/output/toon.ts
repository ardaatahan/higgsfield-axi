// TOON (Token-Oriented Object Notation) emitter. All stdout flows through
// this module so every command stays consistent (AXI principle 1).

export function print(text: string): void {
  process.stdout.write(text + "\n");
}

// A row is one physical line, so a line break inside a value would emit extra
// lines under a header that already declares how many rows follow. Vendor JSON
// reaches here verbatim (see output/fromJson.ts), so breaks become visible \n /
// \r escapes, which then force the quoted form.
export function toonValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const raw = String(value);
  const escaped = raw.replace(/\r/g, "\\r").replace(/\n/g, "\\n");
  if (/[,"]/.test(escaped) || escaped !== raw) return '"' + escaped.replace(/"/g, '""') + '"';
  return escaped;
}

export function emitList(
  name: string,
  rows: Array<Record<string, unknown>>,
  fields: string[],
): string {
  const header = `${name}[${rows.length}]{${fields.join(",")}}:`;
  const lines = rows.map(
    (row) => "  " + fields.map((f) => toonValue(row[f])).join(","),
  );
  return [header, ...lines].join("\n");
}

/** A named block of pre-formatted lines, e.g. help[2]: or next[3]:. */
export function emitBlock(name: string, lines: string[]): string {
  return [`${name}[${lines.length}]:`, ...lines.map((l) => "  " + l)].join("\n");
}

export function emitKV(pairs: Array<[string, unknown]>): string {
  return pairs.map(([k, v]) => `${k}: ${toonValue(v)}`.trimEnd()).join("\n");
}
