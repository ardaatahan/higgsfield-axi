// Downloads a completed job's output URLs to a local directory. The
// Higgsfield CLI only prints result URLs; fetching them locally so an agent
// gets a file path back is this tool's own value-add over the vendor CLI.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AxiError } from "../output/errors.js";
import { waitSuggestion } from "../output/suggest.js";

const EXT_BY_CONTENT_TYPE: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "video/mp4": ".mp4",
  "audio/wav": ".wav",
  "audio/mpeg": ".mp3",
};

export interface DownloadedFile {
  path: string;
  bytes: number;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function extFromUrl(url: string): string | null {
  try {
    const pathname = new URL(url).pathname;
    const match = /\.[A-Za-z0-9]{2,5}$/.exec(pathname);
    return match ? match[0].toLowerCase() : null;
  } catch {
    return null;
  }
}

export async function downloadOutputs(
  jobId: string,
  urls: string[],
  outDir: string,
): Promise<DownloadedFile[]> {
  if (urls.length === 0) return [];
  // Two recoveries, because outDir is only to blame in one of them: a fetch
  // failure is worth retrying with the same --out, while a filesystem failure
  // would repeat identically, so that suggestion never echoes the path back.
  const retry = `re-fetch outputs with: ${waitSuggestion(jobId, outDir)}`;
  const retryElsewhere = `--out must name a writable directory; once it does, re-fetch outputs with: higgsfield-axi wait ${jobId} --out <writable-dir>`;
  try {
    await mkdir(outDir, { recursive: true });
  } catch (err) {
    throw new AxiError(`creating the output directory ${outDir} failed: ${errorMessage(err)}`, retryElsewhere);
  }
  const files: DownloadedFile[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]!;
    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      throw new AxiError(`downloading output ${i + 1} failed: ${errorMessage(err)}`, retry);
    }
    if (!res.ok) {
      throw new AxiError(
        `downloading output ${i + 1} failed: HTTP ${res.status}`,
        retry,
      );
    }
    const contentType = (res.headers.get("content-type") ?? "").split(";")[0]!.trim();
    const ext = extFromUrl(url) ?? EXT_BY_CONTENT_TYPE[contentType] ?? ".bin";
    const suffix = urls.length > 1 ? `-${i + 1}` : "";
    const path = join(outDir, `${jobId}${suffix}${ext}`);
    const buf = Buffer.from(await res.arrayBuffer());
    try {
      await writeFile(path, buf);
    } catch (err) {
      throw new AxiError(`writing output ${i + 1} to ${path} failed: ${errorMessage(err)}`, retryElsewhere);
    }
    files.push({ path, bytes: buf.length });
  }
  return files;
}
