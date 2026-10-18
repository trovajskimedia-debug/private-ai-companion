import { readFile } from "node:fs/promises";
import type { Character } from "@prisma/client";
import { ApiError } from "../http";

type Workflow = Record<
  string,
  { class_type: string; inputs: Record<string, unknown> }
>;
export const comfyBase = () =>
  (process.env.COMFYUI_BASE_URL || "http://127.0.0.1:8188").replace(/\/$/, "");
export async function comfyStatus() {
  const checkpointConfigured = !!(
    process.env.COMFYUI_CHECKPOINT || process.env.COMFYUI_WORKFLOW_PATH
  );
  try {
    const response = await fetch(`${comfyBase()}/system_stats`, {
      signal: AbortSignal.timeout(4000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Unavailable");
    return { connected: true, checkpointConfigured };
  } catch {
    return {
      connected: false,
      checkpointConfigured,
      error:
        "ComfyUI is not reachable. Start it and configure a workflow or checkpoint.",
    };
  }
}

export function portraitPrompt(character: Character, scene: string) {
  const outfit =
    character.outfit === "yoga"
      ? "yoga pants and a sports top"
      : character.outfit === "dress"
        ? "a casual dress"
        : "relaxed trousers and a top";
  return `Photorealistic editorial photograph of one fictional adult woman, ${character.age} years old, ${character.height} cm tall, ${character.build < 35 ? "slender" : character.build > 65 ? "athletic, broad-shouldered" : "balanced build"}, ${character.curves > 65 ? "curvy figure" : "natural proportions"}, ${character.hairStyle} hairstyle, hair color ${character.hairColor}, skin tone ${character.skinColor}, wearing ${outfit} in ${character.outfitColor} with top color ${character.topColor}. Scene: ${scene}. Natural skin texture, realistic anatomy, soft natural light, 85mm portrait lens, tasteful fully clothed portrait.`;
}

export function buildWorkflow(
  prompt: string,
  checkpoint: string,
  seed: number,
): Workflow {
  return {
    "1": {
      class_type: "CheckpointLoaderSimple",
      inputs: { ckpt_name: checkpoint },
    },
    "2": {
      class_type: "CLIPTextEncode",
      inputs: { text: prompt, clip: ["1", 1] },
    },
    "3": {
      class_type: "CLIPTextEncode",
      inputs: {
        text: "child, underage, nude, nudity, explicit, deformed, extra limbs, watermark, text, illustration, cartoon",
        clip: ["1", 1],
      },
    },
    "4": {
      class_type: "EmptyLatentImage",
      inputs: { width: 768, height: 1024, batch_size: 1 },
    },
    "5": {
      class_type: "KSampler",
      inputs: {
        seed,
        steps: 25,
        cfg: 7,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["3", 0],
        latent_image: ["4", 0],
      },
    },
    "6": {
      class_type: "VAEDecode",
      inputs: { samples: ["5", 0], vae: ["1", 2] },
    },
    "7": {
      class_type: "SaveImage",
      inputs: { filename_prefix: "PrivateCompanion", images: ["6", 0] },
    },
  };
}

export function fillWorkflow(
  value: unknown,
  prompt: string,
  seed: number,
): unknown {
  if (typeof value === "string")
    return value
      .replaceAll("{{PROMPT}}", prompt)
      .replaceAll("{{SEED}}", String(seed));
  if (Array.isArray(value))
    return value.map((item) => fillWorkflow(item, prompt, seed));
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        fillWorkflow(item, prompt, seed),
      ]),
    );
  return value;
}

export async function queueImage(character: Character, scene: string) {
  const seed = Math.floor(Math.random() * 2 ** 32);
  const prompt = portraitPrompt(character, scene);
  let workflow: unknown;
  if (process.env.COMFYUI_WORKFLOW_PATH) {
    try {
      workflow = fillWorkflow(
        JSON.parse(await readFile(process.env.COMFYUI_WORKFLOW_PATH, "utf8")),
        prompt,
        seed,
      );
    } catch {
      throw new ApiError(
        503,
        "The configured ComfyUI API workflow cannot be read. Check COMFYUI_WORKFLOW_PATH.",
      );
    }
  } else {
    if (!process.env.COMFYUI_CHECKPOINT)
      throw new ApiError(
        503,
        "Set COMFYUI_CHECKPOINT to an installed checkpoint filename, or configure an API workflow.",
      );
    workflow = buildWorkflow(prompt, process.env.COMFYUI_CHECKPOINT, seed);
  }
  let response: Response;
  try {
    response = await fetch(`${comfyBase()}/prompt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new ApiError(
      503,
      "ComfyUI is not reachable. No image was generated.",
    );
  }
  if (!response.ok)
    throw new ApiError(
      502,
      "ComfyUI rejected the workflow. Check the installed checkpoint and node compatibility.",
    );
  const data = await response.json();
  if (typeof data.prompt_id !== "string")
    throw new ApiError(502, "ComfyUI did not return a job ID.");
  return data.prompt_id as string;
}

export type ComfyHistory = {
  status?: { status_str?: string; completed?: boolean };
  outputs?: Record<
    string,
    { images?: { filename: string; subfolder: string; type: string }[] }
  >;
};
export async function imageHistory(
  promptId: string,
): Promise<ComfyHistory | null> {
  let response: Response;
  try {
    response = await fetch(
      `${comfyBase()}/history/${encodeURIComponent(promptId)}`,
      { signal: AbortSignal.timeout(8000), cache: "no-store" },
    );
  } catch {
    throw new ApiError(
      503,
      "ComfyUI is temporarily unreachable. The job is saved; retry shortly.",
    );
  }
  if (!response.ok) throw new ApiError(502, "Could not check the ComfyUI job.");
  const data = await response.json();
  return data[promptId] || null;
}
