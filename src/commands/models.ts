// `models` - list the catalog; `models <id>` - full parameter detail.

import type { CommandModule } from "../cli/router.js";
import { MODELS, findModel, requiredInputs } from "../catalog/index.js";
import { UsageError } from "../output/errors.js";
import { emitKV, emitList, print } from "../output/toon.js";
import { helpBlock } from "../output/suggest.js";

const LIST_FIELDS = ["id", "kind", "inputs", "family"];
const ALL_FIELDS = [...LIST_FIELDS, "path", "params"];

export const modelsCommand: CommandModule = {
  spec: {
    name: "models",
    summary: "List available models, or show one model's parameters",
    args: [{ name: "model-id", required: false, description: "show full parameter detail for one model" }],
    flags: [
      { name: "kind", type: "string", values: ["image", "video"], description: "filter by output kind" },
      {
        name: "fields",
        type: "string",
        default: LIST_FIELDS.join(","),
        description: `comma-separated columns from: ${ALL_FIELDS.join(", ")}`,
      },
    ],
    examples: [
      "higgsfield-axi models",
      "higgsfield-axi models --kind video",
      "higgsfield-axi models soul/standard",
    ],
  },
  run(parsed) {
    const id = parsed.positionals[0];
    if (id !== undefined) {
      const model = findModel(id);
      print(
        emitKV([
          ["model", model.id],
          ["kind", model.kind],
          ["family", model.family],
          ["endpoint", model.path],
        ]),
      );
      print(
        emitList(
          "params",
          model.params.map((p) => ({
            name: p.name,
            type: p.type,
            required: p.required ? "yes" : "no",
            default: p.default === undefined ? "" : String(p.default),
            values: p.enum
              ? p.enum.join("|")
              : [p.min !== undefined ? `min ${p.min}` : "", p.max !== undefined ? `max ${p.max}` : ""]
                  .filter(Boolean)
                  .join(" "),
          })),
          ["name", "type", "required", "default", "values"],
        ),
      );
      const cmd = model.kind === "image" ? "image" : "video";
      print(
        helpBlock([
          `higgsfield-axi ${cmd} "<prompt>" --model ${model.id}`,
          `higgsfield-axi models --kind ${model.kind}`,
        ]),
      );
      return 0;
    }

    const fields = String(parsed.flags["fields"]).split(",").map((f) => f.trim());
    for (const f of fields) {
      if (!ALL_FIELDS.includes(f)) {
        throw new UsageError(`unknown field '${f}' for --fields`, `valid fields: ${ALL_FIELDS.join(", ")}`);
      }
    }
    const kind = parsed.flags["kind"] as string | undefined;
    const rows = MODELS.filter((m) => kind === undefined || m.kind === kind);
    if (rows.length === 0) {
      print(`models: 0 ${kind ?? ""} models in the catalog`.replace(/\s+/g, " "));
      print(helpBlock(["higgsfield-axi models"]));
      return 0;
    }
    print(
      emitList(
        "models",
        rows.map((m) => ({
          id: m.id,
          kind: m.kind,
          family: m.family,
          inputs: requiredInputs(m),
          path: m.path,
          params: m.params.map((p) => p.name).join(" "),
        })),
        fields,
        { total: MODELS.length },
      ),
    );
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
