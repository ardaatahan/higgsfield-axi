// RequestStatus shape shared by submissions, status polls, and downloads.

export const TERMINAL_STATES = ["completed", "failed", "nsfw", "canceled"] as const;

export interface MediaOutput {
  url: string;
}

export interface RequestStatus {
  status: string;
  request_id: string;
  status_url?: string;
  cancel_url?: string;
  error?: string | null;
  images?: MediaOutput[];
  video?: MediaOutput;
  audio?: MediaOutput;
  audios?: MediaOutput[];
}

export function isTerminal(status: string): boolean {
  return (TERMINAL_STATES as readonly string[]).includes(status);
}

export function asRequestStatus(data: unknown): RequestStatus {
  const obj = data as RequestStatus;
  if (!obj || typeof obj.status !== "string" || typeof obj.request_id !== "string") {
    throw new Error("API response is not a request status object");
  }
  return obj;
}

/** Flatten every output URL, whatever field the model used. */
export function outputUrls(status: RequestStatus): string[] {
  const urls: string[] = [];
  for (const img of status.images ?? []) urls.push(img.url);
  if (status.video) urls.push(status.video.url);
  if (status.audio) urls.push(status.audio.url);
  for (const aud of status.audios ?? []) urls.push(aud.url);
  return urls;
}
