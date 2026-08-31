// `models` - list the live catalog via `higgsfield model list`, or show one
// model's parameters via `higgsfield model get <job-type>`.

import type { CommandModule } from "../cli/router.js";
import { emitFromJson } from "../output/fromJson.js";
import { helpBlock } from "../output/suggest.js";
import { print } from "../output/toon.js";
import { hf } from "../hf/exec.js";

const KIND_VALUES = ["image", "video", "audio", "text"];

// The model's media kind is read from `media`, believed to be the field name
// the CLI emits: `media_type` appears nowhere in the compiled binary while a
// single `media` json tag does. That is an inference from the binary, not
// confirmed against live `model list`/`model get --json` output (no workspace
// was available to check), which is why `media_type` stays on as a fallback
// key - if the guess is wrong the kind simply reads as absent.
function mediaKind(raw: string): string | undefined {
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
  return media.trim().toLowerCase().split("/")[0] || undefined;
}

// Only image and video have a generate command here. A kind the tool cannot
// generate must not be offered to either of them; an absent kind keeps both on
// offer, since there is then nothing to tell them apart by.
function modelNextSteps(id: string, kind: string | undefined): string[] {
  if (kind === "image" || kind === "video") return [`higgsfield-axi ${kind} "<prompt>" --model ${id}`];
  if (kind === undefined) {
    return [`higgsfield-axi image "<prompt>" --model ${id}`, `higgsfield-axi video "<prompt>" --model ${id}`];
  }
  return KIND_VALUES.includes(kind) ? [`higgsfield-axi models --kind ${kind}`] : ["higgsfield-axi models"];
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
      print(helpBlock(modelNextSteps(id, mediaKind(stdout))));
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
