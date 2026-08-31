// Downloads a completed job's output URLs to a local directory. The
// Higgsfield CLI only prints result URLs; fetching them locally so an agent
// gets a file path back is this tool's own value-add over the vendor CLI.

import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AxiError } from "../output/errors.js";

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
  await mkdir(outDir, { recursive: true });
  const files: DownloadedFile[] = [];
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i]!;
    let res: Response;
    try {
      res = await fetch(url);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new AxiError(
        `downloading output ${i + 1} failed: ${message}`,
        `re-fetch outputs with: higgsfield-axi status ${jobId}`,
      );
    }
    if (!res.ok) {
      throw new AxiError(
        `downloading output ${i + 1} failed: HTTP ${res.status}`,
        `re-fetch outputs with: higgsfield-axi status ${jobId}`,
      );
    }
    const contentType = (res.headers.get("content-type") ?? "").split(";")[0]!.trim();
    const ext = extFromUrl(url) ?? EXT_BY_CONTENT_TYPE[contentType] ?? ".bin";
    const suffix = urls.length > 1 ? `-${i + 1}` : "";
    const path = join(outDir, `${jobId}${suffix}${ext}`);
    const buf = Buffer.from(await res.arrayBuffer());
    await writeFile(path, buf);
    files.push({ path, bytes: buf.length });
  }
  return files;
}
