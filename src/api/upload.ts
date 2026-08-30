// Media input resolution. URLs pass through; local files upload via the
// presigned-URL flow (docs/concepts/file-uploads) and resolve to the
// returned public URL. API credentials are never sent to the storage URL.

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { extname } from "node:path";
import { AxiError } from "../output/errors.js";
import { apiRequest } from "./http.js";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".wav": "audio/wav",
  ".mp4": "video/mp4",
};

interface UploadTicket {
  public_url: string;
  upload_url: string;
  upload_headers?: Record<string, string>;
}

export function isUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

export async function uploadFile(path: string): Promise<string> {
  if (!existsSync(path)) {
    throw new AxiError(
      `input file not found: ${path}`,
      "pass an existing local file path or an https:// URL",
    );
  }
  const ext = extname(path).toLowerCase();
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) {
    throw new AxiError(
      `unsupported input file type '${ext || "(none)"}' for ${path}`,
      `supported extensions: ${Object.keys(CONTENT_TYPES).join(", ")}`,
    );
  }
  const ticket = (await apiRequest("POST", "/files/generate-upload-url", {
    body: { content_type: contentType },
  })) as UploadTicket;
  if (!ticket?.upload_url || !ticket?.public_url) {
    throw new AxiError("upload URL response was malformed", "retry; report if it persists");
  }
  const bytes = await readFile(path);
  let res: Response;
  try {
    res = await fetch(ticket.upload_url, {
      method: "PUT",
      headers: ticket.upload_headers ?? { "Content-Type": contentType },
      body: new Uint8Array(bytes),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new AxiError(`uploading ${path} failed: ${message}`, "check connectivity and retry");
  }
  if (!res.ok) {
    throw new AxiError(`uploading ${path} failed: storage returned HTTP ${res.status}`, "retry");
  }
  return ticket.public_url;
}

/** Resolve a --ref/--image value (local file path or URL) to a public URL. */
export async function resolveMediaInput(value: string): Promise<string> {
  return isUrl(value) ? value : uploadFile(value);
}
