// TOON (Token-Oriented Object Notation) emitter. All stdout flows through
// this module so every command stays consistent (AXI principle 1).

export function print(text: string): void {
  process.stdout.write(text + "\n");
}

export function toonValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[,"\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
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
