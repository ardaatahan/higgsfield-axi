// Unit tests for catalog lookups and request-body construction.

import { describe, expect, it } from "vitest";
import { DEFAULTS, MODELS, buildBody, findModel, roleParam } from "../src/catalog/index.js";
import { AxiError, UsageError } from "../src/output/errors.js";

describe("catalog", () => {
  it("contains both kinds and unique ids", () => {
    expect(MODELS.length).toBeGreaterThan(30);
    expect(new Set(MODELS.map((m) => m.id)).size).toBe(MODELS.length);
    expect(MODELS.some((m) => m.kind === "image")).toBe(true);
    expect(MODELS.some((m) => m.kind === "video")).toBe(true);
  });

  it("includes the documented default models", () => {
    for (const id of Object.values(DEFAULTS)) {
      expect(findModel(id).id).toBe(id);
    }
  });

  it("suggests near-matches for unknown ids", () => {
    try {
      findModel("soul");
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(UsageError);
      expect((err as UsageError).suggestion).toContain("soul/standard");
    }
  });

  it("maps roles across model families", () => {
    expect(roleParam(findModel("veo3.1/image-to-video"), "image")?.name).toBe("image_url");
    expect(roleParam(findModel("veo3.1/first-last-frame-to-video"), "image")?.name).toBe(
      "first_frame_url",
    );
    expect(roleParam(findModel("soul/reference"), "ref")?.name).toBe("image_reference_url");
    expect(roleParam(findModel("nano-banana"), "ref")?.name).toBe("input_images");
    expect(roleParam(findModel("soul/character"), "n")?.name).toBe("batch_size");
  });
});

describe("buildBody", () => {
  it("coerces numeric strings and validates ranges", () => {
    const model = findModel("soul/standard");
    const body = buildBody(model, { prompt: "p", values: { num_images: "3" } });
    expect(body["num_images"]).toBe(3);
    expect(() => buildBody(model, { prompt: "p", values: { num_images: "9" } })).toThrow(/<= 4/);
  });

  it("coerces integer-enum params (duration, batch_size) to numbers, not strings", () => {
    const video = findModel("kling-video/v2.5-turbo/pro/image-to-video");
    const videoBody = buildBody(video, {
      prompt: "p",
      values: { duration: "10", image_url: "https://example.com/a.png" },
    });
    expect(videoBody["duration"]).toBe(10);
    expect(typeof videoBody["duration"]).toBe("number");

    const image = findModel("soul/reference");
    const imageBody = buildBody(image, {
      prompt: "p",
      values: { batch_size: "4", image_reference_url: "https://example.com/a.png" },
    });
    expect(imageBody["batch_size"]).toBe(4);
    expect(typeof imageBody["batch_size"]).toBe("number");
  });

  it("fills required params from schema defaults", () => {
    const model = findModel("veo3.1");
    const body = buildBody(model, { prompt: "p", values: {} });
    expect(body).toEqual({
      prompt: "p",
      resolution: "720",
      aspect_ratio: "16:9",
      generate_audio: false,
    });
  });

  it("errors on a required param with no default and no value", () => {
    const model = findModel("soul/character");
    try {
      buildBody(model, { prompt: "p", values: {} });
      expect.unreachable();
    } catch (err) {
      expect(err).toBeInstanceOf(AxiError);
      expect((err as AxiError).message).toContain("custom_reference_id");
      expect((err as AxiError).suggestion).toContain("--params");
    }
  });

  it("shapes url lists for object-array params", () => {
    const model = findModel("nano-banana");
    const body = buildBody(model, {
      prompt: "p",
      values: {},
      mediaLists: { input_images: ["https://a/img.png"] },
    });
    expect(body["input_images"]).toEqual([{ type: "image_url", image_url: "https://a/img.png" }]);
  });

  it("keeps plain string arrays for url-array params", () => {
    const model = findModel("veo3.1/reference-to-video");
    const body = buildBody(model, {
      prompt: "p",
      values: {},
      mediaLists: { image_urls: ["https://a/1.png", "https://a/2.png"] },
    });
    expect(body["image_urls"]).toEqual(["https://a/1.png", "https://a/2.png"]);
  });
});
