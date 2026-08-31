// End-to-end tests against a mocked `higgsfield` binary (test/helpers/mock-hf.mjs):
// argv construction, --json parsing, downloads, passthrough flags, and error
// mapping. Fully offline - HIGGSFIELD_AXI_BIN points at the mock, never the
// real CLI.

import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AssetServer } from "./helpers/asset-server.js";

const bin = fileURLToPath(new URL("../bin/higgsfield-axi.js", import.meta.url));
const mockHf = fileURLToPath(new URL("./helpers/mock-hf.mjs", import.meta.url));

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

// The asset server lives in this process, so the CLI must run asynchronously:
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

let workDir: string;
let logPath: string;

function run(args: string[], env: Record<string, string> = {}): Promise<RunResult> {
  return exec(
    args,
    {
      ...process.env,
      HIGGSFIELD_AXI_BIN: mockHf,
      MOCK_HF_LOG: logPath,
      ...env,
    } as Record<string, string>,
    workDir,
  );
}

function invocations(): string[][] {
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, "utf8")
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as string[]);
}

beforeEach(() => {
  workDir = mkdtempSync(join(tmpdir(), "hf-axi-test-"));
  logPath = join(workDir, "mock-hf.log");
});

describe("image generation", () => {
  it("shells out to `generate create`, waits, downloads outputs, prints local paths", async () => {
    let asset: AssetServer | undefined;
    try {
      asset = new AssetServer();
      const base = await asset.start();
      const png = Buffer.from("fake-png-bytes");
      asset.set("/out.png", "image/png", png);

      const r = await run(["image", "a red chair", "--aspect_ratio", "16:9"], {
        MOCK_HF_JOB_ID: "job-abc",
        MOCK_HF_JOB_STATUS: "completed",
        MOCK_HF_JOB_URLS: JSON.stringify([`${base}/out.png`]),
      });
      expect(r.stderr.trim()).toBe("");
      expect(r.status).toBe(0);

      const calls = invocations();
      expect(calls).toHaveLength(1);
      expect(calls[0]).toEqual([
        "generate",
        "create",
        "nano_banana_2",
        "--prompt",
        "a red chair",
        "--aspect_ratio",
        "16:9",
        "--wait",
        "--json",
      ]);

      expect(r.stdout).toContain("job: job-abc");
      expect(r.stdout).toContain("status: completed");
      expect(r.stdout).toContain("files[1]{path,bytes}:");
      const file = join(workDir, "higgsfield-out", "job-abc.png");
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file)).toEqual(png);
    } finally {
      await asset?.stop();
    }
  });

  it("--no-wait prints the job id without waiting or downloading", async () => {
    const r = await run(["image", "a chair", "--no-wait"], { MOCK_HF_JOB_ID: "job-nowait" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("job: job-nowait");
    expect(r.stdout).toContain(`higgsfield-axi wait job-nowait`);

    const calls = invocations();
    expect(calls[0]).toEqual(["generate", "create", "nano_banana_2", "--prompt", "a chair", "--json"]);
    expect(calls[0]).not.toContain("--wait");
  });

  it("uses --model to override the default and forwards unknown flags to the CLI verbatim", async () => {
    const r = await run(["image", "product shot", "--model", "gpt_image_2", "--quality", "high", "--no-wait"]);
    expect(r.status).toBe(0);
    const calls = invocations();
    expect(calls[0]).toEqual([
      "generate",
      "create",
      "gpt_image_2",
      "--prompt",
      "product shot",
      "--quality",
      "high",
      "--json",
    ]);
  });

  it("forwards local file paths for media flags unchanged (the CLI auto-uploads them)", async () => {
    const refPath = join(workDir, "ref.png");
    writeFileSync(refPath, Buffer.from("local-image"));
    const r = await run(["video", "animate this", "--start-image", refPath, "--no-wait"]);
    expect(r.status).toBe(0);
    const calls = invocations();
    expect(calls[0]).toEqual([
      "generate",
      "create",
      "veo3_1",
      "--prompt",
      "animate this",
      "--start-image",
      refPath,
      "--json",
    ]);
  });

  it("forwards every occurrence of a repeated passthrough flag, in order", async () => {
    const r = await run([
      "image",
      "same scene at night",
      "--image-references",
      "./a.png",
      "--image-references",
      "./b.png",
      "--no-wait",
    ]);
    expect(r.status).toBe(0);
    expect(invocations()[0]).toEqual([
      "generate",
      "create",
      "nano_banana_2",
      "--prompt",
      "same scene at night",
      "--image-references",
      "./a.png",
      "--image-references",
      "./b.png",
      "--json",
    ]);
  });

  it("fails loudly when the CLI's --json stdout is not job JSON, instead of reporting success", async () => {
    const r = await run(["image", "a chair", "--no-wait"], {
      MOCK_HF_JOB_RAW: "Warning: upgrade available\nSubmitted.",
    });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("error: higgsfield returned a malformed response");
    expect(r.stdout).toContain("Submitted.");
    expect(r.stdout).toContain("suggestion:");
    expect(r.stdout).not.toContain("status: unknown");
  });

  it("parses the job JSON even when the CLI prints progress lines before it", async () => {
    const r = await run(["image", "a chair", "--no-wait"], {
      MOCK_HF_JOB_RAW: `Submitting job...\nWaiting for job (10%)\n${JSON.stringify({ job_id: "job-noisy", status: "queued" })}\n`,
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("job: job-noisy");
    expect(r.stdout).toContain("status: queued");
    expect(r.stdout).not.toContain("malformed");
  });

  it("fails loudly when the job JSON parses but carries no identifiable job id", async () => {
    const r = await run(["image", "a chair"], {
      MOCK_HF_JOB_RAW: JSON.stringify({ job: { id: "job-abc", status: "completed", result_url: "https://cdn/x.png" } }),
    });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("error: higgsfield returned a malformed response");
    expect(r.stdout).toContain("suggestion:");
    expect(r.stdout).not.toContain("status: unknown");
    expect(existsSync(join(workDir, "higgsfield-out"))).toBe(false);
  });

  it("marks a completed job that produced no outputs explicitly and suggests re-checking it", async () => {
    const r = await run(["image", "a chair"], {
      MOCK_HF_JOB_ID: "job-empty",
      MOCK_HF_JOB_URLS: "[]",
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("outputs: 0");
    expect(r.stdout).toContain("higgsfield-axi wait job-empty");
    expect(r.stdout).toContain("higgsfield-axi status job-empty");
    expect(r.stdout).not.toContain('higgsfield-axi image "<prompt>"');
  });

  it("exits 1 and reports the failure when the job's terminal status indicates failure", async () => {
    const r = await run(["image", "a chair"], { MOCK_HF_JOB_STATUS: "failed" });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("status: failed");
    expect(r.stdout).toContain("error: failed");
  });
});

describe("video generation", () => {
  it("defaults to veo3_1 and passes wait-timeout/wait-interval through", async () => {
    const r = await run([
      "video",
      "slow pan",
      "--wait-timeout",
      "20m",
      "--wait-interval",
      "5s",
      "--no-wait",
    ]);
    expect(r.status).toBe(0);
    const calls = invocations();
    // --no-wait means neither --wait nor the wait-timeout/interval flags are sent.
    expect(calls[0]).toEqual(["generate", "create", "veo3_1", "--prompt", "slow pan", "--json"]);
  });

  it("passes wait-timeout/wait-interval to the CLI when waiting", async () => {
    const r = await run(["video", "slow pan", "--wait-timeout", "20m", "--wait-interval", "5s"], {
      MOCK_HF_JOB_URLS: "[]",
    });
    expect(r.status).toBe(0);
    const calls = invocations();
    expect(calls[0]).toEqual([
      "generate",
      "create",
      "veo3_1",
      "--prompt",
      "slow pan",
      "--wait",
      "--wait-timeout",
      "20m",
      "--wait-interval",
      "5s",
      "--json",
    ]);
  });
});

describe("job lifecycle commands", () => {
  it("status shells to `generate get` and shows state + urls without downloading", async () => {
    const r = await run(["status", "job-xyz"], {
      MOCK_HF_JOB_STATUS: "completed",
      MOCK_HF_JOB_URLS: JSON.stringify(["https://cdn.example.com/x.jpg"]),
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("status: completed");
    expect(r.stdout).toContain("https://cdn.example.com/x.jpg");
    expect(existsSync(join(workDir, "higgsfield-out"))).toBe(false);
    expect(invocations()[0]).toEqual(["generate", "get", "job-xyz", "--json"]);
  });

  it("wait shells to `generate wait` with --timeout/--interval and downloads on success", async () => {
    let asset: AssetServer | undefined;
    try {
      asset = new AssetServer();
      const base = await asset.start();
      const mp4 = Buffer.from("fake-mp4");
      asset.set("/clip.mp4", "video/mp4", mp4);
      const r = await run(["wait", "job-xyz", "--timeout", "5m", "--interval", "2s"], {
        MOCK_HF_JOB_URLS: JSON.stringify([`${base}/clip.mp4`]),
      });
      expect(r.status).toBe(0);
      expect(invocations()[0]).toEqual([
        "generate",
        "wait",
        "job-xyz",
        "--timeout",
        "5m",
        "--interval",
        "2s",
        "--quiet",
        "--json",
      ]);
      const file = join(workDir, "higgsfield-out", "job-xyz.mp4");
      expect(existsSync(file)).toBe(true);
    } finally {
      await asset?.stop();
    }
  });

  it("downloads from result_url when the CLI reports an empty urls array", async () => {
    let asset: AssetServer | undefined;
    try {
      asset = new AssetServer();
      const base = await asset.start();
      const png = Buffer.from("single-result-bytes");
      asset.set("/out.png", "image/png", png);
      const r = await run(["wait", "job-single"], {
        MOCK_HF_JOB_URLS: JSON.stringify([]),
        MOCK_HF_JOB_RESULT_URL: `${base}/out.png`,
      });
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("files[1]{path,bytes}:");
      const file = join(workDir, "higgsfield-out", "job-single.png");
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file)).toEqual(png);
    } finally {
      await asset?.stop();
    }
  });

  it("status fails loudly when the CLI's --json stdout is not job JSON", async () => {
    const r = await run(["status", "job-xyz"], { MOCK_HF_JOB_RAW: "not json at all" });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("error: higgsfield returned a malformed response");
    expect(r.stdout).toContain("not json at all");
  });

  it("suggests a command that actually re-downloads when fetching an output fails", async () => {
    let asset: AssetServer | undefined;
    try {
      asset = new AssetServer();
      const base = await asset.start();
      const r = await run(["wait", "job-x", "--out", "assets"], {
        MOCK_HF_JOB_URLS: JSON.stringify([`${base}/gone.png`]),
      });
      expect(r.status).toBe(1);
      expect(r.stdout).toContain("error: downloading output 1 failed: HTTP 404");
      expect(r.stdout).toContain("suggestion: re-fetch outputs with: higgsfield-axi wait job-x --out assets");
    } finally {
      await asset?.stop();
    }
  });

  it("wait falls back to the requested job id when the CLI's response omits it", async () => {
    let asset: AssetServer | undefined;
    try {
      asset = new AssetServer();
      const base = await asset.start();
      const mp4 = Buffer.from("id-less-payload");
      asset.set("/x.mp4", "video/mp4", mp4);
      const r = await run(["wait", "job-known"], {
        MOCK_HF_JOB_RAW: JSON.stringify({ status: "completed", result_url: `${base}/x.mp4` }),
      });
      expect(r.status).toBe(0);
      expect(r.stdout).toContain("job: job-known");
      expect(r.stdout).toContain("status: completed");
      const file = join(workDir, "higgsfield-out", "job-known.mp4");
      expect(existsSync(file)).toBe(true);
      expect(readFileSync(file)).toEqual(mp4);
    } finally {
      await asset?.stop();
    }
  });

  it("status falls back to the requested job id when the CLI's response omits it", async () => {
    const r = await run(["status", "job-known"], {
      MOCK_HF_JOB_RAW: JSON.stringify({ status: "queued" }),
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("job: job-known");
    expect(r.stdout).toContain("status: queued");
  });

  it("there is no cancel command (the upstream CLI does not expose one)", async () => {
    const r = await run(["cancel", "job-xyz"]);
    expect(r.status).toBe(2);
    expect(r.stdout).toContain("unknown command");
    expect(invocations()).toHaveLength(0);
  });
});

describe("models", () => {
  it("lists models via `model list --json`", async () => {
    const r = await run(["models", "--kind", "video"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("models[");
    expect(invocations()[0]).toEqual(["model", "list", "--video", "--json"]);
  });

  it("shows one model's parameters via `model get --json`", async () => {
    const r = await run(["models", "nano_banana_2"]);
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("nano_banana_2");
    expect(invocations()[0]).toEqual(["model", "get", "nano_banana_2", "--json"]);
  });

  it("renders a model's nested params as a counted TOON table, not [object Object]", async () => {
    const r = await run(["models", "nano_banana_2"], {
      MOCK_HF_MODEL_GET: JSON.stringify({
        job_type: "nano_banana_2",
        params: [
          { name: "aspect_ratio", type: "string", required: false },
          { name: "resolution", type: "string", required: true },
        ],
      }),
    });
    expect(r.status).toBe(0);
    expect(r.stdout).not.toContain("[object Object]");
    expect(r.stdout).toContain("job_type: nano_banana_2");
    expect(r.stdout).toContain("params[2]{name,type,required}:");
    expect(r.stdout).toContain("aspect_ratio,string,false");
    expect(r.stdout).toContain("resolution,string,true");
  });

  it("keeps the counted list header when the catalog comes back wrapped in an object", async () => {
    const r = await run(["models"], {
      MOCK_HF_MODEL_LIST: JSON.stringify({
        total: 2,
        models: [
          { job_type: "nano_banana_2", media: "image" },
          { job_type: "veo3_1", media: "video" },
        ],
      }),
    });
    expect(r.status).toBe(0);
    expect(r.stdout).not.toContain("[object Object]");
    expect(r.stdout).toContain("total: 2");
    expect(r.stdout).toContain("models[2]{job_type,media}:");
    expect(r.stdout).toContain("veo3_1,video");
  });

  it("suggests only the command matching the model's media kind", async () => {
    const image = await run(["models", "nano_banana_2"], {
      MOCK_HF_MODEL_GET: JSON.stringify({ job_type: "nano_banana_2", media: "image" }),
    });
    expect(image.status).toBe(0);
    expect(image.stdout).toContain('higgsfield-axi image "<prompt>" --model nano_banana_2');
    expect(image.stdout).not.toContain('higgsfield-axi video "<prompt>" --model nano_banana_2');

    const video = await run(["models", "veo3_1"], {
      MOCK_HF_MODEL_GET: JSON.stringify({ job_type: "veo3_1", media: "video" }),
    });
    expect(video.status).toBe(0);
    expect(video.stdout).toContain('higgsfield-axi video "<prompt>" --model veo3_1');
    expect(video.stdout).not.toContain('higgsfield-axi image "<prompt>" --model veo3_1');
  });

  it("suggests both commands only when the model's media kind cannot be read at all", async () => {
    const absent = await run(["models", "nano_banana_2"], {
      MOCK_HF_MODEL_GET: JSON.stringify({ job_type: "nano_banana_2" }),
    });
    const unparseable = await run(["models", "some_model"], {
      MOCK_HF_MODEL_GET: "not json at all",
    });
    for (const [r, id] of [[absent, "nano_banana_2"], [unparseable, "some_model"]] as const) {
      expect(r.status).toBe(0);
      expect(r.stdout).toContain(`higgsfield-axi image "<prompt>" --model ${id}`);
      expect(r.stdout).toContain(`higgsfield-axi video "<prompt>" --model ${id}`);
    }
  });

  it("suggests neither image nor video for a model whose kind this tool cannot generate", async () => {
    const audio = await run(["models", "some_audio_model"], {
      MOCK_HF_MODEL_GET: JSON.stringify({ job_type: "some_audio_model", media: "audio" }),
    });
    expect(audio.status).toBe(0);
    expect(audio.stdout).not.toContain("higgsfield-axi image");
    expect(audio.stdout).not.toContain("higgsfield-axi video");
    expect(audio.stdout).toContain("higgsfield-axi models --kind audio");

    const other = await run(["models", "some_3d_model"], {
      MOCK_HF_MODEL_GET: JSON.stringify({ job_type: "some_3d_model", media: "3d" }),
    });
    expect(other.status).toBe(0);
    expect(other.stdout).not.toContain("higgsfield-axi image");
    expect(other.stdout).not.toContain("higgsfield-axi video");
    expect(other.stdout).toContain("higgsfield-axi models");
  });

  it("maps an unknown model id to a structured error", async () => {
    const r = await run(["models", "totally-bogus-model"]);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('error: Unknown model "totally-bogus-model".');
    expect(r.stdout).toContain("suggestion:");
  });
});

describe("environment and error mapping", () => {
  it("maps a missing CLI binary to a clear install instruction, not a crash", async () => {
    const r = await run(["models"], { HIGGSFIELD_AXI_BIN: join(workDir, "nonexistent-higgsfield-binary") });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("error: the official Higgsfield CLI");
    expect(r.stdout).toContain("not installed");
    expect(r.stdout).toContain("npm install -g @higgsfield/cli");
    expect(invocations()).toHaveLength(0);
  });

  it("maps 'no workspace selected' from the CLI to a clear fix", async () => {
    const r = await run(["models"], { MOCK_HF_FAIL_WORKSPACE: "1" });
    expect(r.status).toBe(1);
    expect(r.stdout).toContain("error: No workspace selected.");
    expect(r.stdout).toContain("suggestion: Run: hf workspace set <workspace_id>");
  });

  it("never prints the access token anywhere, even when authenticated", async () => {
    const home = await run([]);
    const models = await run(["models"], { MOCK_HF_TOKEN: "super-secret-token-value" });
    for (const r of [home, models]) {
      expect(r.stdout).not.toContain("super-secret-token-value");
      expect(r.stderr).not.toContain("super-secret-token-value");
      expect(r.stdout).not.toContain("mock-secret-token-abc123");
    }
  });
});

describe("no-args home view", () => {
  it("reports the CLI as not installed and instructs how to install it, exit 0", async () => {
    const r = await run([], { HIGGSFIELD_AXI_BIN: join(workDir, "nonexistent-higgsfield-binary") });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("higgsfield-cli: not installed");
    expect(r.stdout).toContain("npm install -g @higgsfield/cli");
    expect(invocations()).toHaveLength(0);
  });

  it("reports authenticated status and example commands when the CLI is present and logged in", async () => {
    const r = await run([], { MOCK_HF_AUTH: "ok" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("higgsfield-cli: installed");
    expect(r.stdout).toContain("auth: authenticated");
    expect(r.stdout).toContain("higgsfield-axi image");
  });

  it("reports not-authenticated status and points at auth login", async () => {
    const r = await run([], { MOCK_HF_AUTH: "missing" });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain("auth: not authenticated");
    expect(r.stdout).toContain("higgsfield auth login");
  });
});
