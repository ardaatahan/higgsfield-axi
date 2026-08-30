// End-to-end tests against a mocked Higgsfield API: request construction,
// auth headers, polling/backoff, uploads, downloads, cancel semantics, and
// error mapping. Fully offline.

import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MockApi } from "./helpers/mock-server.js";

const bin = fileURLToPath(new URL("../bin/higgsfield-axi.js", import.meta.url));
const REQ_ID = "d7e6c0f3-6699-4f6c-bb45-2ad7fd9158ff";

let api: MockApi;
let base: string;
let workDir: string;

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

// The mock API lives in this process, so the CLI must run asynchronously:
// a blocking spawnSync would freeze the event loop and deadlock the server.
function exec(args: string[], env: Record<string, string>, cwd: string): Promise<RunResult> {
  return new Promise((resolve, reject) => {
    const child = spawn("node", [bin, ...args], { cwd, env });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8").on("data", (d: string) => (stdout += d));
    child.stderr.setEncoding("utf8").on("data", (d: string) => (stderr += d));
    child.on("error", reject);
    child.on("close", (status) => resolve({ status, stdout, stderr }));
  });
}

function run(args: string[], env: Record<string, string> = {}): Promise<RunResult> {
  return exec(
    args,
    {
      ...process.env,
      HIGGSFIELD_BASE_URL: base,
      HF_API_KEY_ID: "test-id",
      HF_API_KEY_SECRET: "test-secret",
      HIGGSFIELD_AXI_POLL_BASE_MS: "10",
      HIGGSFIELD_AXI_POLL_CAP_MS: "40",
      ...env,
    } as Record<string, string>,
    workDir,
  );
}

function queued(extra: Record<string, unknown> = {}) {
  return {
    status: "queued",
    request_id: REQ_ID,
    status_url: `${base}/requests/${REQ_ID}/status`,
    cancel_url: `${base}/requests/${REQ_ID}/cancel`,
    ...extra,
  };
}

beforeEach(async () => {
  api = new MockApi();
  base = await api.start();
  workDir = mkdtempSync(join(tmpdir(), "hf-axi-test-"));
});

afterEach(async () => {
  await api.stop();
});

describe("image generation", () => {
  it("submits, polls to completion, downloads outputs, prints local paths", async () => {
    const png = Buffer.from("fake-png-bytes");
    api.on("POST", "/higgsfield-ai/soul/standard", api.json(200, queued()));
    api.on(
      "GET",
      `/requests/${REQ_ID}/status`,
      api.json(200, { status: "in_progress", request_id: REQ_ID }),
      api.json(200, {
        status: "completed",
        request_id: REQ_ID,
        images: [{ url: `${base}/cdn/out-1.png` }, { url: `${base}/cdn/out-2.png` }],
      }),
    );
    api.on("GET", "/cdn/out-1.png", api.bytes(200, "image/png", png));
    api.on("GET", "/cdn/out-2.png", api.bytes(200, "image/png", png));

    const r = await run(["image", "a red chair", "--aspect", "16:9", "--n", "2"]);
    expect(r.stderr.trim()).toBe("");
    expect(r.status).toBe(0);

    const submit = api.calls("POST", "/higgsfield-ai/soul/standard")[0]!;
    expect(submit.headers["authorization"]).toBe("Key test-id:test-secret");
    expect(submit.body).toEqual({ prompt: "a red chair", aspect_ratio: "16:9", num_images: 2 });

    expect(api.calls("GET", `/requests/${REQ_ID}/status`).length).toBe(2);
    expect(r.stdout).toContain(`request: ${REQ_ID}`);
    expect(r.stdout).toContain("status: completed");
    expect(r.stdout).toContain("files[2]{path,bytes}:");
    const file1 = join(workDir, "higgsfield-out", `${REQ_ID}-1.png`);
    expect(existsSync(file1)).toBe(true);
    expect(readFileSync(file1)).toEqual(png);
  });

  it("--no-wait prints the request id without polling", async () => {
    api.on("POST", "/higgsfield-ai/soul/standard", api.json(200, queued()));
    const r = await run(["image", "a chair", "--no-wait"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain(`request: ${REQ_ID}`);
    expect(r.stdout).toContain("status: queued");
    expect(r.stdout).toContain(`higgsfield-axi wait ${REQ_ID}`);
    expect(api.calls("GET", `/requests/${REQ_ID}/status`).length).toBe(0);
  });

  it("validates enum values before any API call", async () => {
    const r = await run(["image", "a chair", "--aspect", "7:5"]);
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("error: invalid value '7:5'");
    expect(r.stdout).toContain("16:9");
    expect(api.requests.length).toBe(0);
  });

  it("rejects parameters the model does not accept", async () => {
    const r = await run(["image", "a chair", "--params", '{"nope": 1}']);
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("does not accept parameter 'nope'");
    expect(api.requests.length).toBe(0);
  });

  it("defaults to the reference model when --ref is a URL", async () => {
    api.on("POST", "/higgsfield-ai/soul/reference", api.json(200, queued()));
    const r = await run(["image", "same scene", "--ref", "https://example.com/day.jpg", "--no-wait"]);
    expect(r.status).toBe(0);
    const submit = api.calls("POST", "/higgsfield-ai/soul/reference")[0]!;
    expect(submit.body).toMatchObject({
      prompt: "same scene",
      image_reference_url: "https://example.com/day.jpg",
    });
  });

  it("uploads local --ref files via the presigned flow", async () => {
    const filePath = join(workDir, "ref.png");
    writeFileSync(filePath, Buffer.from("local-image"));
    api.on(
      "POST",
      "/files/generate-upload-url",
      api.json(200, {
        public_url: `${base}/cdn/public/ref.png`,
        upload_url: `${base}/upload/slot-1`,
        content_type: "image/png",
        upload_headers: { "Content-Type": "image/png", "x-amz-tagging": "retention=temporary" },
      }),
    );
    api.on("PUT", "/upload/slot-1", api.bytes(200, "text/plain", Buffer.from("")));
    api.on("POST", "/higgsfield-ai/soul/reference", api.json(200, queued()));

    const r = await run(["image", "same scene", "--ref", filePath, "--no-wait"]);
    expect(r.status).toBe(0);

    const ticket = api.calls("POST", "/files/generate-upload-url")[0]!;
    expect(ticket.body).toEqual({ content_type: "image/png" });
    const put = api.calls("PUT", "/upload/slot-1")[0]!;
    expect(put.rawBody.toString()).toBe("local-image");
    expect(put.headers["x-amz-tagging"]).toBe("retention=temporary");
    // Credentials must never be sent to the storage URL.
    expect(put.headers["authorization"]).toBeUndefined();
    const submit = api.calls("POST", "/higgsfield-ai/soul/reference")[0]!;
    expect(submit.body).toMatchObject({ image_reference_url: `${base}/cdn/public/ref.png` });
  });

  it("exits 1 with the error when generation fails", async () => {
    api.on("POST", "/higgsfield-ai/soul/standard", api.json(200, queued()));
    api.on(
      "GET",
      `/requests/${REQ_ID}/status`,
      api.json(200, { status: "failed", request_id: REQ_ID, error: "Generation failed" }),
    );
    const r = await run(["image", "a chair"]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("status: failed");
    expect(r.stdout).toContain("Generation failed");
  });

  it("maps 403 to an insufficient-credits error", async () => {
    api.on("POST", "/higgsfield-ai/soul/standard", api.json(403, { detail: "Not enough credits" }));
    const r = await run(["image", "a chair"]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("insufficient credits");
    expect(r.stdout).toContain("suggestion:");
  });
});

describe("video generation", () => {
  it("fills required schema defaults and switches model when --image is set", async () => {
    api.on("POST", "/veo3.1/fast/image-to-video", api.json(200, queued()));
    const r = await run([
      "video",
      "animate this",
      "--image",
      "https://example.com/hero.png",
      "--duration",
      "8",
      "--no-wait",
    ]);
    expect(r.status).toBe(0);
    const submit = api.calls("POST", "/veo3.1/fast/image-to-video")[0]!;
    // Optional params are omitted so the API applies its own defaults;
    // required-with-default filling is covered in catalog.test.ts.
    expect(submit.body).toEqual({
      prompt: "animate this",
      image_url: "https://example.com/hero.png",
      duration: "8",
    });
  });

  it("downloads a completed video output", async () => {
    const mp4 = Buffer.from("fake-mp4");
    api.on("POST", "/veo3.1/fast", api.json(200, queued()));
    api.on(
      "GET",
      `/requests/${REQ_ID}/status`,
      api.json(200, {
        status: "completed",
        request_id: REQ_ID,
        video: { url: `${base}/cdn/clip.mp4` },
      }),
    );
    api.on("GET", "/cdn/clip.mp4", api.bytes(200, "video/mp4", mp4));
    const r = await run(["video", "slow pan", "--out", "assets"]);
    expect(r.status).toBe(0);
    const file = join(workDir, "assets", `${REQ_ID}.mp4`);
    expect(existsSync(file)).toBe(true);
    expect(r.stdout).toContain("files[1]{path,bytes}:");
  });

  it("rejects --image on a text-to-video-only model", async () => {
    const r = await run([
      "video",
      "x",
      "--model",
      "sora-2/text-to-video/pro",
      "--image",
      "https://example.com/a.png",
    ]);
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("does not support --image");
    expect(api.requests.length).toBe(0);
  });
});

describe("request lifecycle commands", () => {
  it("status shows state and output urls without downloading", async () => {
    api.on(
      "GET",
      `/requests/${REQ_ID}/status`,
      api.json(200, {
        status: "completed",
        request_id: REQ_ID,
        images: [{ url: "https://cdn.example.com/x.jpg" }],
      }),
    );
    const r = await run(["status", REQ_ID]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("status: completed");
    expect(r.stdout).toContain("https://cdn.example.com/x.jpg");
    expect(existsSync(join(workDir, "higgsfield-out"))).toBe(false);
  });

  it("wait retries transient 5xx during polling and then succeeds", async () => {
    api.on(
      "GET",
      `/requests/${REQ_ID}/status`,
      api.json(500, { detail: "boom" }),
      api.json(200, { status: "completed", request_id: REQ_ID, images: [] }),
    );
    const r = await run(["wait", REQ_ID]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("status: completed");
    expect(api.calls("GET", `/requests/${REQ_ID}/status`).length).toBe(2);
  });

  it("wait stops immediately on 404", async () => {
    api.on("GET", `/requests/${REQ_ID}/status`, api.json(404, { detail: "not found" }));
    const r = await run(["wait", REQ_ID]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("error: not found");
    expect(api.calls("GET", `/requests/${REQ_ID}/status`).length).toBe(1);
  });

  it("wait times out with a resume suggestion", async () => {
    api.on("GET", `/requests/${REQ_ID}/status`, api.json(200, { status: "queued", request_id: REQ_ID }));
    const r = await run(["wait", REQ_ID, "--timeout", "0.05"]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("timed out");
    expect(r.stdout).toContain(`higgsfield-axi wait ${REQ_ID}`);
  });

  it("polls repeatedly until the terminal state arrives", async () => {
    let polls = 0;
    api.on("GET", `/requests/${REQ_ID}/status`, (_req, res) => {
      polls++;
      const done = polls >= 4;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({ status: done ? "completed" : "queued", request_id: REQ_ID, images: [] }),
      );
    });
    const r = await run(["wait", REQ_ID]);
    expect(r.status).toBe(0);
    expect(polls).toBe(4);
    expect(r.stdout).toContain("status: completed");
  });

  it("cancel succeeds on a queued request", async () => {
    api.on("POST", `/requests/${REQ_ID}/cancel`, (_req, res) => {
      res.writeHead(202);
      res.end();
    });
    const r = await run(["cancel", REQ_ID]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("status: canceled");
  });

  it("cancel of an already-terminal request is a no-op exit 0", async () => {
    api.on("POST", `/requests/${REQ_ID}/cancel`, api.json(400, { detail: "already finished" }));
    api.on("GET", `/requests/${REQ_ID}/status`, api.json(200, { status: "completed", request_id: REQ_ID }));
    const r = await run(["cancel", REQ_ID]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("nothing to cancel");
  });

  it("cancel of a started request explains it can no longer be canceled", async () => {
    api.on("POST", `/requests/${REQ_ID}/cancel`, api.json(400, { detail: "in progress" }));
    api.on("GET", `/requests/${REQ_ID}/status`, api.json(200, { status: "in_progress", request_id: REQ_ID }));
    const r = await run(["cancel", REQ_ID]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("can no longer be canceled");
    expect(r.stdout).toContain(`higgsfield-axi wait ${REQ_ID}`);
  });
});

describe("credentials", () => {
  it("reads credentials from the config file when env vars are absent", async () => {
    const configHome = mkdtempSync(join(tmpdir(), "hf-axi-config-"));
    const dir = join(configHome, "higgsfield-axi");
    mkdirSync(dir, { recursive: true });
    writeFileSync(
      join(dir, "credentials"),
      "# comment\nHF_API_KEY_ID=file-id\nHF_API_KEY_SECRET=file-secret\n",
    );
    api.on("POST", "/higgsfield-ai/soul/standard", api.json(200, queued()));
    const r = await exec(
      ["image", "a chair", "--no-wait"],
      { ...cleanEnv(), HIGGSFIELD_BASE_URL: base, XDG_CONFIG_HOME: configHome },
      workDir,
    );
    expect(r.status).toBe(0);
    expect(api.calls("POST", "/higgsfield-ai/soul/standard")[0]!.headers["authorization"]).toBe(
      "Key file-id:file-secret",
    );
  });

  it("env credentials take precedence over the file", async () => {
    const configHome = mkdtempSync(join(tmpdir(), "hf-axi-config-"));
    const dir = join(configHome, "higgsfield-axi");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "credentials"), "HF_API_KEY_ID=file-id\nHF_API_KEY_SECRET=file-secret\n");
    api.on("POST", "/higgsfield-ai/soul/standard", api.json(200, queued()));
    const r = await exec(
      ["image", "a chair", "--no-wait"],
      {
        ...cleanEnv(),
        HIGGSFIELD_BASE_URL: base,
        XDG_CONFIG_HOME: configHome,
        HF_API_KEY_ID: "env-id",
        HF_API_KEY_SECRET: "env-secret",
      },
      workDir,
    );
    expect(r.status).toBe(0);
    expect(api.calls("POST", "/higgsfield-ai/soul/standard")[0]!.headers["authorization"]).toBe(
      "Key env-id:env-secret",
    );
  });

  it("missing credentials is a structured error naming the env vars, and never echoes secrets", async () => {
    const configHome = mkdtempSync(join(tmpdir(), "hf-axi-config-"));
    const r = await exec(["image", "a chair"], { ...cleanEnv(), XDG_CONFIG_HOME: configHome }, workDir);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("error: no Higgsfield API credentials found");
    expect(r.stdout).toContain("HF_API_KEY_ID");
    expect(r.stdout).toContain("https://cloud.higgsfield.ai");
    expect(api.requests.length).toBe(0);
  });

  it("never prints credential values in any output", async () => {
    api.on("POST", "/higgsfield-ai/soul/standard", api.json(200, queued()));
    const home = await run(["--help"]);
    const noArgs = await run([]);
    const submit = await run(["image", "a chair", "--no-wait"]);
    for (const r of [home, noArgs, submit]) {
      expect(r.stdout).not.toContain("test-secret");
      expect(r.stderr).not.toContain("test-secret");
    }
  });
});

function cleanEnv(): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [k, v] of Object.entries(process.env)) {
    if (v === undefined) continue;
    if (k === "HF_API_KEY_ID" || k === "HF_API_KEY_SECRET" || k === "XDG_CONFIG_HOME") continue;
    env[k] = v;
  }
  return env;
}
