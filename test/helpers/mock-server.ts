// Minimal mock of the Higgsfield API for offline tests. Records every
// request (method, path, headers, parsed body) and serves scripted
// responses per route.

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";

export interface RecordedRequest {
  method: string;
  path: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
  rawBody: Buffer;
}

export type Handler = (req: RecordedRequest, res: ServerResponse) => void;

export class MockApi {
  server: Server;
  requests: RecordedRequest[] = [];
  routes = new Map<string, Handler[]>();
  fallback: Handler = (_req, res) => {
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ detail: "no route" }));
  };

  constructor() {
    this.server = createServer((req, res) => void this.handle(req, res));
  }

  /** Queue handlers for METHOD PATH; each handler serves one request, the last repeats. */
  on(method: string, path: string, ...handlers: Handler[]): void {
    this.routes.set(`${method} ${path}`, handlers);
  }

  json(status: number, body: unknown): Handler {
    return (_req, res) => {
      res.writeHead(status, { "content-type": "application/json" });
      res.end(JSON.stringify(body));
    };
  }

  bytes(status: number, contentType: string, data: Buffer): Handler {
    return (_req, res) => {
      res.writeHead(status, { "content-type": contentType });
      res.end(data);
    };
  }

  private async handle(req: IncomingMessage, res: ServerResponse): Promise<void> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const rawBody = Buffer.concat(chunks);
    let body: unknown = undefined;
    if (rawBody.length > 0 && (req.headers["content-type"] ?? "").includes("json")) {
      try {
        body = JSON.parse(rawBody.toString("utf8"));
      } catch {
        body = rawBody.toString("utf8");
      }
    }
    const path = new URL(req.url ?? "/", "http://localhost").pathname;
    const recorded: RecordedRequest = {
      method: req.method ?? "GET",
      path,
      headers: req.headers,
      body,
      rawBody,
    };
    this.requests.push(recorded);
    const queue = this.routes.get(`${recorded.method} ${path}`);
    if (queue && queue.length > 0) {
      const handler = queue.length > 1 ? queue.shift()! : queue[0]!;
      handler(recorded, res);
      return;
    }
    this.fallback(recorded, res);
  }

  async start(): Promise<string> {
    await new Promise<void>((resolve) => this.server.listen(0, "127.0.0.1", resolve));
    const { port } = this.server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve, reject) =>
      this.server.close((err) => (err ? reject(err) : resolve())),
    );
  }

  calls(method: string, path: string): RecordedRequest[] {
    return this.requests.filter((r) => r.method === method && r.path === path);
  }
}
