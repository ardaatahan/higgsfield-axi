import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CommandModule } from "../cli/router.js";
import { print } from "../output/toon.js";
import { renderHome, rootHelpText } from "../skill/content.js";
import { probeCli } from "../hf/exec.js";

function readVersion(): string {
  const pkgPath = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8")) as { version: string };
  return pkg.version;
}

export const homeCommand: CommandModule = {
  spec: {
    name: "",
    summary: "Home view: live content first (AXI principle 8)",
    flags: [{ name: "version", type: "boolean", description: "print the tool version" }],
    examples: ["higgsfield-axi", "higgsfield-axi --version"],
  },
  async run(parsed) {
    if (parsed.flags["version"]) {
      print(`higgsfield-axi: ${readVersion()}`);
      return 0;
    }
    // Never crash on a missing/unauthenticated CLI (AXI principle 8):
    // probeCli reports its state instead of throwing.
    const status = await probeCli();
    print(renderHome(process.argv[1] ?? "higgsfield-axi", status));
    return 0;
  },
};

export function rootHelp(): string {
  return rootHelpText();
}
