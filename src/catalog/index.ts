// Catalog lookups and request-body construction on top of the generated
// model list. All parameter validation happens here, before any API call.

import { AxiError, UsageError } from "../output/errors.js";
import { MODELS, type ModelEntry, type ModelParam } from "./models.generated.js";

export { MODELS, type ModelEntry, type ModelParam };

export const DEFAULTS = {
  image: "soul/standard",
  imageWithRef: "soul/reference",
  video: "veo3.1/fast",
  videoWithImage: "veo3.1/fast/image-to-video",
} as const;

export function findModel(id: string): ModelEntry {
  const model = MODELS.find((m) => m.id === id);
  if (model) return model;
  const near = MODELS.filter((m) => m.id.includes(id)).slice(0, 4);
  throw new UsageError(
    `unknown model '${id}'`,
    near.length > 0
      ? `did you mean: ${near.map((m) => m.id).join(", ")}? full list: higgsfield-axi models`
      : "list models with: higgsfield-axi models",
  );
}

export function param(model: ModelEntry, name: string): ModelParam | undefined {
  return model.params.find((p) => p.name === name);
}

/**
 * Map a CLI input role to the model's parameter name. Different families
 * name the same concept differently (image_url vs first_frame_url, ...).
 */
const ROLE_CANDIDATES: Record<string, string[]> = {
  image: ["image_url", "first_frame_url"],
  endImage: ["end_image_url", "last_frame_url"],
  ref: ["image_reference_url", "image_urls", "input_images"],
  n: ["num_images", "batch_size"],
  aspect: ["aspect_ratio"],
  resolution: ["resolution"],
  duration: ["duration"],
  seed: ["seed"],
};

export function roleParam(model: ModelEntry, role: string): ModelParam | undefined {
  for (const name of ROLE_CANDIDATES[role] ?? []) {
    const p = param(model, name);
    if (p) return p;
  }
  return undefined;
}

/** Required inputs beyond the prompt, e.g. "image_url" - shown in lists. */
export function requiredInputs(model: ModelEntry): string {
  return model.params
    .filter((p) => p.required && p.name !== "prompt")
    .map((p) => p.name)
    .join(" ");
}

function coerce(p: ModelParam, value: unknown): unknown {
  if (typeof value !== "string") return value;
  if (p.type === "integer" || p.type === "number") {
    const n = Number(value);
    if (!Number.isFinite(n)) {
      throw new UsageError(`parameter '${p.name}' expects a number, got '${value}'`);
    }
    return n;
  }
  if (p.type === "boolean") {
    if (value === "true") return true;
    if (value === "false") return false;
    throw new UsageError(`parameter '${p.name}' expects true or false, got '${value}'`);
  }
  return value;
}

function validateValue(model: ModelEntry, p: ModelParam, value: unknown): unknown {
  const v = coerce(p, value);
  if (p.enum && !p.enum.includes(String(v))) {
    throw new UsageError(
      `invalid value '${String(v)}' for '${p.name}' on ${model.id}`,
      `valid values: ${p.enum.join(", ")}`,
    );
  }
  if (typeof v === "number") {
    if (p.min !== undefined && v < p.min) {
      throw new UsageError(`'${p.name}' must be >= ${p.min} on ${model.id}`);
    }
    if (p.max !== undefined && v > p.max) {
      throw new UsageError(`'${p.name}' must be <= ${p.max} on ${model.id}`);
    }
  }
  return v;
}

/** Wrap URL lists for array params that expect {type, image_url} items. */
function shapeArrayValue(p: ModelParam, urls: string[]): unknown {
  if (p.itemFields?.includes("image_url")) {
    return urls.map((u) => ({ type: "image_url", image_url: u }));
  }
  return urls;
}

export interface BodyInputs {
  prompt: string;
  /** Values keyed by parameter name (already resolved to URLs where media). */
  values: Record<string, unknown>;
  /** Media URL lists keyed by parameter name, shaped per param type. */
  mediaLists?: Record<string, string[]>;
}

export function buildBody(model: ModelEntry, inputs: BodyInputs): Record<string, unknown> {
  const body: Record<string, unknown> = { prompt: inputs.prompt };
  for (const [name, value] of Object.entries(inputs.values)) {
    const p = param(model, name);
    if (!p) {
      throw new UsageError(
        `model ${model.id} does not accept parameter '${name}'`,
        `see accepted parameters with: higgsfield-axi models ${model.id}`,
      );
    }
    body[name] = validateValue(model, p, value);
  }
  for (const [name, urls] of Object.entries(inputs.mediaLists ?? {})) {
    const p = param(model, name);
    if (!p) continue;
    body[name] = p.type === "array" ? shapeArrayValue(p, urls) : urls[0];
  }
  for (const p of model.params) {
    if (body[p.name] !== undefined) continue;
    if (p.default !== undefined) {
      if (p.required) body[p.name] = p.default;
      continue;
    }
    if (p.required) {
      throw new AxiError(
        `model ${model.id} requires '${p.name}' and no value was provided`,
        `inspect it with: higgsfield-axi models ${model.id}, then pass --params '{"${p.name}": ...}' or the matching flag`,
      );
    }
  }
  return body;
}
