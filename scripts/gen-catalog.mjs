// Generates src/catalog/models.generated.ts from the Higgsfield OpenAPI spec.
//
// Usage:
//   node scripts/gen-catalog.mjs                # fetch the live spec
//   node scripts/gen-catalog.mjs ./openapi.json # use a local copy
//
// The generated file is checked into the repo so the CLI works offline and
// installs stay reproducible. Re-run this script (then `npm run build` and
// commit the diff) when Higgsfield ships new models.

import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const SPEC_URL = "https://docs.higgsfield.ai/docs/openapi.json";

// Every model endpoint carries exactly one OpenAPI tag. The spec does not
// state whether a model outputs images or video, so this map supplies that
// one judgment. An unknown tag fails the build loudly rather than guessing.
const TAG_KIND = {
  Soul: "image",
  Popcorn: "image",
  "Flux Pro": "image",
  "Nano Banana": "image",
  Reve: "image",
  Dop: "video",
  "Veo3.1": "video",
  "Kling Video": "video",
  Minimax: "video",
  Bytedance: "video",
  "Sora 2": "video",
  "Wan 25 Preview": "video",
};

const src = process.argv[2];
let specText;
if (src && !src.startsWith("http")) {
  specText = readFileSync(src, "utf8");
} else {
  const res = await fetch(src ?? SPEC_URL);
  if (!res.ok) {
    console.log(`error: fetching spec failed: HTTP ${res.status}`);
    process.exit(1);
  }
  specText = await res.text();
}
const spec = JSON.parse(specText);

function deref(schema) {
  if (schema && schema.$ref) {
    const name = schema.$ref.split("/").pop();
    return spec.components.schemas[name];
  }
  return schema;
}

function paramType(prop) {
  if (Array.isArray(prop.type)) return prop.type.find((t) => t !== "null") ?? "string";
  if (prop.type) return prop.type;
  if (prop.enum) return typeof prop.enum[0] === "number" ? "integer" : "string";
  return "string";
}

const models = [];
for (const [path, ops] of Object.entries(spec.paths)) {
  if (path.startsWith("/requests/")) continue;
  const op = ops.post;
  if (!op) continue;
  const tag = op.tags?.[0] ?? "";
  const kind = TAG_KIND[tag];
  if (!kind) {
    console.log(`error: unclassified tag '${tag}' for ${path}`);
    console.log("suggestion: add it to TAG_KIND in scripts/gen-catalog.mjs");
    process.exit(1);
  }
  const body = op.requestBody?.content?.["application/json"]?.schema;
  if (!body) continue;
  const required = new Set(body.required ?? []);
  const params = [];
  for (const [name, rawProp] of Object.entries(body.properties ?? {})) {
    const prop = rawProp.$ref ? deref(rawProp) : rawProp;
    const p = {
      name,
      type: rawProp.items ? "array" : paramType(prop),
      required: required.has(name),
    };
    if (prop.enum) p.enum = prop.enum.map(String);
    if (prop.default !== undefined && prop.default !== null) p.default = prop.default;
    if (typeof prop.minimum === "number") p.min = prop.minimum;
    if (typeof prop.maximum === "number") p.max = prop.maximum;
    if (rawProp.items) {
      const item = deref(rawProp.items);
      if (item?.properties) p.itemFields = Object.keys(item.properties);
    }
    params.push(p);
  }
  // Model id: the API path minus the leading slash and Higgsfield's own
  // vendor prefix. Deterministic and collision-free across the spec.
  const id = path.slice(1).replace(/^higgsfield-ai\//, "");
  models.push({ id, path, kind, family: tag, params });
}

models.sort((a, b) => (a.kind === b.kind ? a.id.localeCompare(b.id) : a.kind.localeCompare(b.kind)));

const header = `// GENERATED FILE - do not edit by hand.
// Source: Higgsfield OpenAPI spec (${SPEC_URL}).
// Regenerate: node scripts/gen-catalog.mjs && npm run build

export interface ModelParam {
  name: string;
  type: string;
  required: boolean;
  enum?: string[];
  default?: string | number | boolean;
  min?: number;
  max?: number;
  itemFields?: string[];
}

export interface ModelEntry {
  id: string;
  path: string;
  kind: "image" | "video";
  family: string;
  params: ModelParam[];
}

export const MODELS: ModelEntry[] = `;

const out = header + JSON.stringify(models, null, 2) + ";\n";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outPath = join(root, "src", "catalog", "models.generated.ts");
writeFileSync(outPath, out);
console.log(`catalog: wrote ${models.length} models to src/catalog/models.generated.ts`);
