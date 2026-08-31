// `models` - list the live catalog via `higgsfield model list`, or show one
// model's parameters via `higgsfield model get <job-type>`.

import type { CommandModule } from "../cli/router.js";
import { emitFromJson } from "../output/fromJson.js";
import { helpBlock } from "../output/suggest.js";
import { print } from "../output/toon.js";
import { hf } from "../hf/exec.js";

const KIND_VALUES = ["image", "video", "audio", "text"];

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
      print(
        helpBlock([
          `higgsfield-axi image "<prompt>" --model ${id}`,
          `higgsfield-axi video "<prompt>" --model ${id}`,
        ]),
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
