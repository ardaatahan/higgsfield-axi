// GENERATED FILE - do not edit by hand.
// Source: Higgsfield OpenAPI spec (https://docs.higgsfield.ai/docs/openapi.json).
// Regenerate: node scripts/gen-catalog.mjs && npm run build

export interface ModelParam {
  name: string;
  type: string;
  required: boolean;
  enum?: string[];
  default?: string | number | boolean;
  min?: number;
  max?: number;
  itemFields?: string[];
}

export interface ModelEntry {
  id: string;
  path: string;
  kind: "image" | "video";
  family: string;
  params: ModelParam[];
}

export const MODELS: ModelEntry[] = [
  {
    "id": "flux-pro/kontext/max/text-to-image",
    "path": "/flux-pro/kontext/max/text-to-image",
    "kind": "image",
    "family": "Flux Pro",
    "params": [
      {
        "name": "seed",
        "type": "integer",
        "required": false,
        "min": 1,
        "max": 1000000
      },
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "16:9",
          "4:3",
          "1:1",
          "3:4",
          "9:16",
          "2:3",
          "1:2",
          "2:1",
          "4:5",
          "3:2"
        ],
        "default": "16:9"
      },
      {
        "name": "safety_tolerance",
        "type": "integer",
        "required": false,
        "default": 6,
        "min": 0,
        "max": 6
      }
    ]
  },
  {
    "id": "nano-banana",
    "path": "/nano-banana",
    "kind": "image",
    "family": "Nano Banana",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "num_images",
        "type": "integer",
        "required": false,
        "default": 1,
        "min": 1,
        "max": 4
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "auto",
          "1:1",
          "4:3",
          "3:4",
          "3:2",
          "2:3",
          "5:4",
          "4:5",
          "16:9",
          "9:16",
          "21:9"
        ],
        "default": "4:3"
      },
      {
        "name": "input_images",
        "type": "array",
        "required": false,
        "itemFields": [
          "type",
          "image_url"
        ]
      },
      {
        "name": "output_format",
        "type": "string",
        "required": false,
        "enum": [
          "jpeg",
          "png"
        ],
        "default": "jpeg"
      }
    ]
  },
  {
    "id": "popcorn/auto",
    "path": "/higgsfield-ai/popcorn/auto",
    "kind": "image",
    "family": "Popcorn",
    "params": [
      {
        "name": "seed",
        "type": "integer",
        "required": false,
        "min": 1,
        "max": 1000000
      },
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "image_urls",
        "type": "array",
        "required": false
      },
      {
        "name": "num_images",
        "type": "integer",
        "required": false,
        "default": 1,
        "min": 1,
        "max": 8
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "720p",
          "1600p"
        ],
        "default": "720p"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "1:1",
          "4:3",
          "3:4",
          "3:2",
          "2:3",
          "16:9",
          "9:16"
        ],
        "default": "4:3"
      }
    ]
  },
  {
    "id": "reve/edit",
    "path": "/reve/edit",
    "kind": "image",
    "family": "Reve",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "num_images",
        "type": "integer",
        "required": false,
        "default": 1,
        "min": 1,
        "max": 4
      }
    ]
  },
  {
    "id": "reve/fast/edit",
    "path": "/reve/fast/edit",
    "kind": "image",
    "family": "Reve",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "num_images",
        "type": "integer",
        "required": false,
        "default": 1,
        "min": 1,
        "max": 4
      }
    ]
  },
  {
    "id": "reve/fast/remix",
    "path": "/reve/fast/remix",
    "kind": "image",
    "family": "Reve",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "image_urls",
        "type": "array",
        "required": true
      },
      {
        "name": "num_images",
        "type": "integer",
        "required": false,
        "default": 1,
        "min": 1,
        "max": 4
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "1:1",
          "4:3",
          "3:4",
          "3:2",
          "2:3",
          "5:4",
          "4:5",
          "16:9",
          "9:16"
        ],
        "default": "4:3"
      }
    ]
  },
  {
    "id": "reve/remix",
    "path": "/reve/remix",
    "kind": "image",
    "family": "Reve",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "image_urls",
        "type": "array",
        "required": true
      },
      {
        "name": "num_images",
        "type": "integer",
        "required": false,
        "default": 1,
        "min": 1,
        "max": 4
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "1:1",
          "4:3",
          "3:4",
          "3:2",
          "2:3",
          "5:4",
          "4:5",
          "16:9",
          "9:16"
        ],
        "default": "4:3"
      }
    ]
  },
  {
    "id": "reve/text-to-image",
    "path": "/reve/text-to-image",
    "kind": "image",
    "family": "Reve",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "num_images",
        "type": "integer",
        "required": false,
        "default": 1,
        "min": 1,
        "max": 4
      }
    ]
  },
  {
    "id": "soul/character",
    "path": "/higgsfield-ai/soul/character",
    "kind": "image",
    "family": "Soul",
    "params": [
      {
        "name": "seed",
        "type": "integer",
        "required": false,
        "min": 1,
        "max": 1000000
      },
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "style_id",
        "type": "string",
        "required": false
      },
      {
        "name": "batch_size",
        "type": "integer",
        "required": false,
        "enum": [
          "1",
          "4"
        ],
        "default": 1
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "720p",
          "1080p"
        ],
        "default": "720p"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "9:16",
          "16:9",
          "4:3",
          "3:4",
          "1:1",
          "2:3",
          "3:2"
        ],
        "default": "4:3"
      },
      {
        "name": "enhance_prompt",
        "type": "boolean",
        "required": false,
        "default": true
      },
      {
        "name": "style_strength",
        "type": "number",
        "required": false,
        "default": 1,
        "min": 0,
        "max": 1
      },
      {
        "name": "custom_reference_id",
        "type": "string",
        "required": true
      },
      {
        "name": "image_reference_url",
        "type": "string",
        "required": false
      },
      {
        "name": "custom_reference_strength",
        "type": "number",
        "required": true,
        "default": 1,
        "min": 0,
        "max": 1
      }
    ]
  },
  {
    "id": "soul/reference",
    "path": "/higgsfield-ai/soul/reference",
    "kind": "image",
    "family": "Soul",
    "params": [
      {
        "name": "seed",
        "type": "integer",
        "required": false,
        "min": 1,
        "max": 1000000
      },
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "style_id",
        "type": "string",
        "required": false
      },
      {
        "name": "batch_size",
        "type": "integer",
        "required": false,
        "enum": [
          "1",
          "4"
        ],
        "default": 1
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "720p",
          "1080p"
        ],
        "default": "720p"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "9:16",
          "16:9",
          "4:3",
          "3:4",
          "1:1",
          "2:3",
          "3:2"
        ],
        "default": "4:3"
      },
      {
        "name": "enhance_prompt",
        "type": "boolean",
        "required": false,
        "default": true
      },
      {
        "name": "style_strength",
        "type": "number",
        "required": false,
        "default": 1,
        "min": 0,
        "max": 1
      },
      {
        "name": "image_reference_url",
        "type": "string",
        "required": true
      }
    ]
  },
  {
    "id": "soul/standard",
    "path": "/higgsfield-ai/soul/standard",
    "kind": "image",
    "family": "Soul",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "num_images",
        "type": "integer",
        "required": false,
        "default": 1,
        "min": 1,
        "max": 4
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "2K",
          "4K"
        ],
        "default": "2K"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "1:1",
          "4:3",
          "3:4",
          "3:2",
          "2:3",
          "5:4",
          "4:5",
          "16:9",
          "9:16",
          "21:9"
        ],
        "default": "4:3"
      }
    ]
  },
  {
    "id": "bytedance/seedance/v1/lite/image-to-video",
    "path": "/bytedance/seedance/v1/lite/image-to-video",
    "kind": "video",
    "family": "Bytedance",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "default": 5,
        "min": 2,
        "max": 12
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "480",
          "720",
          "1080"
        ],
        "default": "1080"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "16:9",
          "9:16",
          "4:3",
          "3:4",
          "1:1",
          "21:9"
        ],
        "default": "16:9"
      },
      {
        "name": "camera_fixed",
        "type": "boolean",
        "required": false,
        "default": false
      }
    ]
  },
  {
    "id": "bytedance/seedance/v1/lite/text-to-video",
    "path": "/bytedance/seedance/v1/lite/text-to-video",
    "kind": "video",
    "family": "Bytedance",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "default": 5,
        "min": 2,
        "max": 12
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "480",
          "720",
          "1080"
        ],
        "default": "720"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "16:9",
          "9:16",
          "4:3",
          "3:4",
          "1:1",
          "21:9"
        ],
        "default": "16:9"
      },
      {
        "name": "camera_fixed",
        "type": "boolean",
        "required": false,
        "default": false
      }
    ]
  },
  {
    "id": "bytedance/seedance/v1/pro/fast/image-to-video",
    "path": "/bytedance/seedance/v1/pro/fast/image-to-video",
    "kind": "video",
    "family": "Bytedance",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "default": 5,
        "min": 2,
        "max": 12
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "480",
          "720",
          "1080"
        ],
        "default": "1080"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "16:9",
          "9:16",
          "4:3",
          "3:4",
          "1:1",
          "21:9"
        ],
        "default": "16:9"
      },
      {
        "name": "camera_fixed",
        "type": "boolean",
        "required": false,
        "default": false
      }
    ]
  },
  {
    "id": "bytedance/seedance/v1/pro/fast/text-to-video",
    "path": "/bytedance/seedance/v1/pro/fast/text-to-video",
    "kind": "video",
    "family": "Bytedance",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "default": 5,
        "min": 2,
        "max": 12
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "480",
          "720",
          "1080"
        ],
        "default": "1080"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "16:9",
          "9:16",
          "4:3",
          "3:4",
          "1:1",
          "21:9"
        ],
        "default": "16:9"
      },
      {
        "name": "camera_fixed",
        "type": "boolean",
        "required": false,
        "default": false
      }
    ]
  },
  {
    "id": "dop/lite",
    "path": "/higgsfield-ai/dop/lite",
    "kind": "video",
    "family": "Dop",
    "params": [
      {
        "name": "seed",
        "type": "integer",
        "required": false,
        "min": 1,
        "max": 1000000
      },
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "motions",
        "type": "array",
        "required": false,
        "itemFields": [
          "id",
          "strength"
        ]
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "end_image_url",
        "type": "string",
        "required": false
      },
      {
        "name": "enhance_prompt",
        "type": "boolean",
        "required": false,
        "default": true
      }
    ]
  },
  {
    "id": "dop/standard",
    "path": "/higgsfield-ai/dop/standard",
    "kind": "video",
    "family": "Dop",
    "params": [
      {
        "name": "seed",
        "type": "integer",
        "required": false,
        "min": 1,
        "max": 1000000
      },
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "motions",
        "type": "array",
        "required": false,
        "itemFields": [
          "id",
          "strength"
        ]
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "end_image_url",
        "type": "string",
        "required": false
      },
      {
        "name": "enhance_prompt",
        "type": "boolean",
        "required": false,
        "default": true
      }
    ]
  },
  {
    "id": "dop/turbo",
    "path": "/higgsfield-ai/dop/turbo",
    "kind": "video",
    "family": "Dop",
    "params": [
      {
        "name": "seed",
        "type": "integer",
        "required": false,
        "min": 1,
        "max": 1000000
      },
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "motions",
        "type": "array",
        "required": false,
        "itemFields": [
          "id",
          "strength"
        ]
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "end_image_url",
        "type": "string",
        "required": false
      },
      {
        "name": "enhance_prompt",
        "type": "boolean",
        "required": false,
        "default": true
      }
    ]
  },
  {
    "id": "kling-video/v2.1/master/image-to-video",
    "path": "/kling-video/v2.1/master/image-to-video",
    "kind": "video",
    "family": "Kling Video",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "5",
          "10"
        ],
        "default": 5
      },
      {
        "name": "cfg_scale",
        "type": "number",
        "required": false,
        "default": 0.5,
        "min": 0,
        "max": 1
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "negative_prompt",
        "type": "string",
        "required": false,
        "default": ""
      }
    ]
  },
  {
    "id": "kling-video/v2.1/master/text-to-video",
    "path": "/kling-video/v2.1/master/text-to-video",
    "kind": "video",
    "family": "Kling Video",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "5",
          "10"
        ],
        "default": 5
      },
      {
        "name": "cfg_scale",
        "type": "number",
        "required": false,
        "default": 0.5,
        "min": 0,
        "max": 1
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "1:1",
          "16:9",
          "9:16"
        ],
        "default": "1:1"
      },
      {
        "name": "negative_prompt",
        "type": "string",
        "required": false,
        "default": ""
      }
    ]
  },
  {
    "id": "kling-video/v2.1/pro/image-to-video",
    "path": "/kling-video/v2.1/pro/image-to-video",
    "kind": "video",
    "family": "Kling Video",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "5",
          "10"
        ],
        "default": 5
      },
      {
        "name": "cfg_scale",
        "type": "number",
        "required": false,
        "default": 0.5,
        "min": 0,
        "max": 1
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "negative_prompt",
        "type": "string",
        "required": false,
        "default": ""
      }
    ]
  },
  {
    "id": "kling-video/v2.1/standard/image-to-video",
    "path": "/kling-video/v2.1/standard/image-to-video",
    "kind": "video",
    "family": "Kling Video",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "5",
          "10"
        ],
        "default": 5
      },
      {
        "name": "cfg_scale",
        "type": "number",
        "required": false,
        "default": 0.5,
        "min": 0,
        "max": 1
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "negative_prompt",
        "type": "string",
        "required": false,
        "default": ""
      }
    ]
  },
  {
    "id": "kling-video/v2.5-turbo/pro/image-to-video",
    "path": "/kling-video/v2.5-turbo/pro/image-to-video",
    "kind": "video",
    "family": "Kling Video",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "5",
          "10"
        ],
        "default": 5
      },
      {
        "name": "cfg_scale",
        "type": "number",
        "required": false,
        "default": 0.5,
        "min": 0,
        "max": 1
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "negative_prompt",
        "type": "string",
        "required": false,
        "default": ""
      }
    ]
  },
  {
    "id": "kling-video/v2.5-turbo/pro/text-to-video",
    "path": "/kling-video/v2.5-turbo/pro/text-to-video",
    "kind": "video",
    "family": "Kling Video",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "5",
          "10"
        ],
        "default": 5
      },
      {
        "name": "cfg_scale",
        "type": "number",
        "required": false,
        "default": 0.5,
        "min": 0,
        "max": 1
      },
      {
        "name": "negative_prompt",
        "type": "string",
        "required": false,
        "default": ""
      }
    ]
  },
  {
    "id": "kling-video/v2.5-turbo/standard/image-to-video",
    "path": "/kling-video/v2.5-turbo/standard/image-to-video",
    "kind": "video",
    "family": "Kling Video",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "5",
          "10"
        ],
        "default": 5
      },
      {
        "name": "cfg_scale",
        "type": "number",
        "required": false,
        "default": 0.5,
        "min": 0,
        "max": 1
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "negative_prompt",
        "type": "string",
        "required": false,
        "default": ""
      }
    ]
  },
  {
    "id": "minimax/hailuo-02/pro/image-to-video",
    "path": "/minimax/hailuo-02/pro/image-to-video",
    "kind": "video",
    "family": "Minimax",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "end_image_url",
        "type": "string",
        "required": false
      },
      {
        "name": "prompt_optimizer",
        "type": "boolean",
        "required": false,
        "default": true
      }
    ]
  },
  {
    "id": "minimax/hailuo-02/pro/text-to-video",
    "path": "/minimax/hailuo-02/pro/text-to-video",
    "kind": "video",
    "family": "Minimax",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "prompt_optimizer",
        "type": "boolean",
        "required": false,
        "default": true
      }
    ]
  },
  {
    "id": "minimax/hailuo-02/standard/image-to-video",
    "path": "/minimax/hailuo-02/standard/image-to-video",
    "kind": "video",
    "family": "Minimax",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "6",
          "10"
        ],
        "default": 6
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "512P",
          "768P"
        ],
        "default": "768P"
      },
      {
        "name": "end_image_url",
        "type": "string",
        "required": false
      },
      {
        "name": "prompt_optimizer",
        "type": "boolean",
        "required": false,
        "default": true
      }
    ]
  },
  {
    "id": "minimax/hailuo-02/standard/text-to-video",
    "path": "/minimax/hailuo-02/standard/text-to-video",
    "kind": "video",
    "family": "Minimax",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "6",
          "10"
        ],
        "default": 6
      },
      {
        "name": "prompt_optimizer",
        "type": "boolean",
        "required": false,
        "default": true
      }
    ]
  },
  {
    "id": "minimax/hailuo-2.3-fast/pro/image-to-video",
    "path": "/minimax/hailuo-2.3-fast/pro/image-to-video",
    "kind": "video",
    "family": "Minimax",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "prompt_optimizer",
        "type": "boolean",
        "required": false,
        "default": true
      }
    ]
  },
  {
    "id": "minimax/hailuo-2.3-fast/standard/image-to-video",
    "path": "/minimax/hailuo-2.3-fast/standard/image-to-video",
    "kind": "video",
    "family": "Minimax",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "6",
          "10"
        ],
        "default": 6
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "prompt_optimizer",
        "type": "boolean",
        "required": false,
        "default": true
      }
    ]
  },
  {
    "id": "minimax/hailuo-2.3/pro/image-to-video",
    "path": "/minimax/hailuo-2.3/pro/image-to-video",
    "kind": "video",
    "family": "Minimax",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "prompt_optimizer",
        "type": "boolean",
        "required": false,
        "default": true
      }
    ]
  },
  {
    "id": "minimax/hailuo-2.3/pro/text-to-video",
    "path": "/minimax/hailuo-2.3/pro/text-to-video",
    "kind": "video",
    "family": "Minimax",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "prompt_optimizer",
        "type": "boolean",
        "required": false,
        "default": true
      }
    ]
  },
  {
    "id": "minimax/hailuo-2.3/standard/image-to-video",
    "path": "/minimax/hailuo-2.3/standard/image-to-video",
    "kind": "video",
    "family": "Minimax",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "6",
          "10"
        ],
        "default": 6
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "prompt_optimizer",
        "type": "boolean",
        "required": false,
        "default": true
      }
    ]
  },
  {
    "id": "minimax/hailuo-2.3/standard/text-to-video",
    "path": "/minimax/hailuo-2.3/standard/text-to-video",
    "kind": "video",
    "family": "Minimax",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "6",
          "10"
        ],
        "default": 6
      },
      {
        "name": "prompt_optimizer",
        "type": "boolean",
        "required": false,
        "default": true
      }
    ]
  },
  {
    "id": "sora-2/image-to-video",
    "path": "/sora-2/image-to-video",
    "kind": "video",
    "family": "Sora 2",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "4",
          "8",
          "12"
        ],
        "default": 4
      },
      {
        "name": "image_url",
        "type": "string",
        "required": false
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "720p"
        ],
        "default": "720p"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "16:9",
          "9:16"
        ],
        "default": "16:9"
      }
    ]
  },
  {
    "id": "sora-2/image-to-video/pro",
    "path": "/sora-2/image-to-video/pro",
    "kind": "video",
    "family": "Sora 2",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "4",
          "8",
          "12"
        ],
        "default": 4
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "720p",
          "1080p"
        ],
        "default": "720p"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "16:9",
          "9:16"
        ],
        "default": "16:9"
      }
    ]
  },
  {
    "id": "sora-2/text-to-video",
    "path": "/sora-2/text-to-video",
    "kind": "video",
    "family": "Sora 2",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "4",
          "8",
          "12"
        ],
        "default": 4
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "720p"
        ],
        "default": "720p"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "16:9",
          "9:16"
        ],
        "default": "16:9"
      }
    ]
  },
  {
    "id": "sora-2/text-to-video/pro",
    "path": "/sora-2/text-to-video/pro",
    "kind": "video",
    "family": "Sora 2",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "4",
          "8",
          "12"
        ],
        "default": 4
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "720p",
          "1080p"
        ],
        "default": "720p"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "16:9",
          "9:16"
        ],
        "default": "16:9"
      }
    ]
  },
  {
    "id": "veo3.1",
    "path": "/veo3.1",
    "kind": "video",
    "family": "Veo3.1",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "string",
        "required": false,
        "enum": [
          "4",
          "6",
          "8"
        ],
        "default": "6"
      },
      {
        "name": "resolution",
        "type": "string",
        "required": true,
        "enum": [
          "720",
          "1080"
        ],
        "default": "720"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": true,
        "enum": [
          "16:9",
          "9:16"
        ],
        "default": "16:9"
      },
      {
        "name": "generate_audio",
        "type": "boolean",
        "required": true,
        "default": false
      }
    ]
  },
  {
    "id": "veo3.1/fast",
    "path": "/veo3.1/fast",
    "kind": "video",
    "family": "Veo3.1",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "string",
        "required": false,
        "enum": [
          "4",
          "6",
          "8"
        ],
        "default": "6"
      },
      {
        "name": "resolution",
        "type": "string",
        "required": true,
        "enum": [
          "720",
          "1080"
        ],
        "default": "720"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": true,
        "enum": [
          "16:9",
          "9:16"
        ],
        "default": "16:9"
      },
      {
        "name": "generate_audio",
        "type": "boolean",
        "required": true,
        "default": false
      }
    ]
  },
  {
    "id": "veo3.1/fast/first-last-frame-to-video",
    "path": "/veo3.1/fast/first-last-frame-to-video",
    "kind": "video",
    "family": "Veo3.1",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "string",
        "required": false,
        "enum": [
          "4",
          "6",
          "8"
        ],
        "default": "6"
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "720",
          "1080"
        ],
        "default": "720"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "16:9",
          "9:16"
        ],
        "default": "16:9"
      },
      {
        "name": "generate_audio",
        "type": "boolean",
        "required": false,
        "default": false
      },
      {
        "name": "last_frame_url",
        "type": "string",
        "required": true
      },
      {
        "name": "first_frame_url",
        "type": "string",
        "required": true
      }
    ]
  },
  {
    "id": "veo3.1/fast/image-to-video",
    "path": "/veo3.1/fast/image-to-video",
    "kind": "video",
    "family": "Veo3.1",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "string",
        "required": false,
        "enum": [
          "4",
          "6",
          "8"
        ],
        "default": "6"
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "720",
          "1080"
        ],
        "default": "720"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "16:9",
          "9:16"
        ],
        "default": "16:9"
      },
      {
        "name": "generate_audio",
        "type": "boolean",
        "required": false,
        "default": false
      }
    ]
  },
  {
    "id": "veo3.1/first-last-frame-to-video",
    "path": "/veo3.1/first-last-frame-to-video",
    "kind": "video",
    "family": "Veo3.1",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "string",
        "required": false,
        "enum": [
          "4",
          "6",
          "8"
        ],
        "default": "6"
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "720",
          "1080"
        ],
        "default": "720"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "16:9",
          "9:16"
        ],
        "default": "16:9"
      },
      {
        "name": "generate_audio",
        "type": "boolean",
        "required": false,
        "default": false
      },
      {
        "name": "last_frame_url",
        "type": "string",
        "required": true
      },
      {
        "name": "first_frame_url",
        "type": "string",
        "required": true
      }
    ]
  },
  {
    "id": "veo3.1/image-to-video",
    "path": "/veo3.1/image-to-video",
    "kind": "video",
    "family": "Veo3.1",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "string",
        "required": false,
        "enum": [
          "4",
          "6",
          "8"
        ],
        "default": "6"
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "720",
          "1080"
        ],
        "default": "720"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "16:9",
          "9:16"
        ],
        "default": "16:9"
      },
      {
        "name": "generate_audio",
        "type": "boolean",
        "required": false,
        "default": false
      }
    ]
  },
  {
    "id": "veo3.1/reference-to-video",
    "path": "/veo3.1/reference-to-video",
    "kind": "video",
    "family": "Veo3.1",
    "params": [
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "string",
        "required": false,
        "enum": [
          "4",
          "6",
          "8"
        ],
        "default": "6"
      },
      {
        "name": "image_urls",
        "type": "array",
        "required": true
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "720",
          "1080"
        ],
        "default": "720"
      },
      {
        "name": "aspect_ratio",
        "type": "string",
        "required": false,
        "enum": [
          "16:9",
          "9:16"
        ],
        "default": "16:9"
      },
      {
        "name": "generate_audio",
        "type": "boolean",
        "required": false,
        "default": false
      }
    ]
  },
  {
    "id": "wan-25-preview/image-to-video",
    "path": "/wan-25-preview/image-to-video",
    "kind": "video",
    "family": "Wan 25 Preview",
    "params": [
      {
        "name": "seed",
        "type": "integer",
        "required": false,
        "default": -1,
        "min": -1,
        "max": 1000000
      },
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "5",
          "10"
        ],
        "default": 5
      },
      {
        "name": "audio_url",
        "type": "string",
        "required": false
      },
      {
        "name": "image_url",
        "type": "string",
        "required": true
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "480p",
          "720p",
          "1080p"
        ],
        "default": "720p"
      },
      {
        "name": "negative_prompt",
        "type": "string",
        "required": false,
        "default": ""
      }
    ]
  },
  {
    "id": "wan-25-preview/text-to-video",
    "path": "/wan-25-preview/text-to-video",
    "kind": "video",
    "family": "Wan 25 Preview",
    "params": [
      {
        "name": "seed",
        "type": "integer",
        "required": false,
        "default": -1,
        "min": -1,
        "max": 1000000
      },
      {
        "name": "prompt",
        "type": "string",
        "required": true
      },
      {
        "name": "duration",
        "type": "integer",
        "required": false,
        "enum": [
          "5",
          "10"
        ],
        "default": 5
      },
      {
        "name": "audio_url",
        "type": "string",
        "required": false
      },
      {
        "name": "resolution",
        "type": "string",
        "required": false,
        "enum": [
          "480p",
          "720p",
          "1080p"
        ],
        "default": "720p"
      },
      {
        "name": "negative_prompt",
        "type": "string",
        "required": false,
        "default": ""
      }
    ]
  }
];
