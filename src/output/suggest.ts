// Contextual next-step suggestions (AXI principle 9).

import { emitBlock } from "./toon.js";

/**
 * Quotes a value interpolated into a suggested command, so that a path with
 * whitespace stays a single argument when the suggestion is run verbatim.
 */
export function quoteArg(value: string): string {
  return `"${value.replace(/"/g, '\\"')}"`;
}

export function helpBlock(lines: string[]): string {
  return emitBlock("help", lines);
}

/**
 * Like helpBlock, but for commands to run in a DIFFERENT program (the
 * wrapped `higgsfield` CLI, npm/brew installers) rather than this tool.
 * Kept out of help[]/next[]/golden-path[] so AXI tooling that discovers
 * subcommands from those blocks never mistakes a third-party command for
 * one of ours.
 */
export function fixBlock(lines: string[]): string {
  return emitBlock("fix", lines);
}
