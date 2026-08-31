// Small constants shared by the generate commands and the home/skill views.
// The full catalog is never bundled here - it's read live from
// `higgsfield model list` (see commands/models.ts and MODELS.md upstream).

export const DEFAULT_MODELS = {
  image: "nano_banana_2",
  video: "veo3_1",
} as const;

// Point-in-time count from the upstream README's model tables, for the
// no-args home view only. Not authoritative - `higgsfield-axi models` and
// `higgsfield model list` always reflect the live catalog.
export const CATALOG_BLURB =
  "55+ models across image, video, 3D, and audio - see `higgsfield-axi models` or MODELS.md upstream";
