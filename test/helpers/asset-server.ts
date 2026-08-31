// Minimal HTTP server serving fixed bytes at fixed paths, standing in for
// the CDN URLs a completed Higgsfield job would point at. Only used to
// exercise the download step (src/hf/download.ts) - the CLI itself is
// mocked separately via test/helpers/mock-hf.mjs.

import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

export class AssetServer {
  server: Server;
  assets = new Map<string, { contentType: string; body: Buffer }>();

  constructor() {
    this.server = createServer((req, res) => {
      const path = new URL(req.url ?? "/", "http://localhost").pathname;
      const asset = this.assets.get(path);
      if (!asset) {
        res.writeHead(404);
        res.end();
        return;
      }
      res.writeHead(200, { "content-type": asset.contentType });
      res.end(asset.body);
    });
  }

  set(path: string, contentType: string, body: Buffer): void {
    this.assets.set(path, { contentType, body });
  }

  async start(): Promise<string> {
    await new Promise<void>((resolve) => this.server.listen(0, "127.0.0.1", resolve));
    const { port } = this.server.address() as AddressInfo;
    return `http://127.0.0.1:${port}`;
  }

  async stop(): Promise<void> {
    await new Promise<void>((resolve, reject) => this.server.close((err) => (err ? reject(err) : resolve())));
  }
}
