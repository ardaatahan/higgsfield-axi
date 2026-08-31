// Contextual next-step suggestions (AXI principle 9).

import { emitBlock } from "./toon.js";

/**
 * Shell-quotes a value interpolated into a suggested command, so that running
 * the suggestion verbatim uses the literal value this tool used - single
 * quotes, so whitespace holds together and $, backticks and ! stay inert.
 */
export function quoteArg(value: string): string {
  return `'${value.replace(/'/g, "'\\''")}'`;
}

/** The one place the `wait` follow-up command is spelled out. */
export function waitSuggestion(jobId: string, outDir: string): string {
  return `higgsfield-axi wait ${jobId} --out ${quoteArg(outDir)}`;
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
