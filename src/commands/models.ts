// `models` - list the live catalog via `higgsfield model list`, or show one
// model's parameters via `higgsfield model get <job-type>`.

import type { CommandModule } from "../cli/router.js";
import { emitFromJson } from "../output/fromJson.js";
import { helpBlock } from "../output/suggest.js";
import { print } from "../output/toon.js";
import { hf } from "../hf/exec.js";

const KIND_VALUES = ["image", "video", "audio", "text"];

// `model get --json` reports the model's media kind under `media` (the field
// name the CLI's own catalog struct emits), so the next step can name the one
// command that accepts it. An absent or unrecognized value means both stay on
// offer rather than guessing wrong.
function generateKind(raw: string): "image" | "video" | undefined {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return undefined;
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
  const record = data as Record<string, unknown>;
  const media = record["media"] ?? record["media_type"];
  if (typeof media !== "string") return undefined;
  const kind = media.trim().toLowerCase().split("/")[0];
  return kind === "image" || kind === "video" ? kind : undefined;
}

export const modelsCommand: CommandModule = {
  spec: {
    name: "models",
    summary: "List models from the Higgsfield CLI's live catalog, or show one model's parameters",
    args: [{ name: "model-id", required: false, description: "show accepted parameters for one model (job_type)" }],
    flags: [{ name: "kind", type: "string", values: KIND_VALUES, description: "filter by media kind" }],
    examples: [
      "higgsfield-axi models",
      "higgsfield-axi models --kind video",
      "higgsfield-axi models nano_banana_2",
    ],
  },
  async run(parsed) {
    const id = parsed.positionals[0];
    if (id !== undefined) {
      const stdout = await hf(["model", "get", id, "--json"]);
      print(emitFromJson("model", stdout));
      const kind = generateKind(stdout);
      print(
        helpBlock(
          kind
            ? [`higgsfield-axi ${kind} "<prompt>" --model ${id}`]
            : [`higgsfield-axi image "<prompt>" --model ${id}`, `higgsfield-axi video "<prompt>" --model ${id}`],
        ),
      );
      return 0;
    }

    const kind = parsed.flags["kind"] as string | undefined;
    const args = ["model", "list"];
    if (kind) args.push(`--${kind}`);
    args.push("--json");
    const stdout = await hf(args);
    print(emitFromJson("models", stdout));
    print(
      helpBlock([
        "higgsfield-axi models <model-id>",
        'higgsfield-axi image "<prompt>" --model <model-id>',
        'higgsfield-axi video "<prompt>" --model <model-id>',
      ]),
    );
    return 0;
  },
};
