import { readFile } from "node:fs/promises";
import { db } from "./db";
import {
  comfySettingsSchema,
  inferBindings,
  workflowSchema,
  type ComfySettings,
} from "./comfy-workflow";

export async function getComfySettings(): Promise<ComfySettings> {
  const stored = await db.appSetting.findUnique({ where: { key: "comfyui" } });
  if (stored) return comfySettingsSchema.parse(JSON.parse(stored.value));
  let workflow = null;
  if (process.env.COMFYUI_WORKFLOW_PATH) {
    try {
      workflow = workflowSchema.parse(
        JSON.parse(await readFile(process.env.COMFYUI_WORKFLOW_PATH, "utf8")),
      );
    } catch {
      /* Settings UI explains missing or incompatible files. */
    }
  }
  return comfySettingsSchema.parse({
    baseUrl: process.env.COMFYUI_BASE_URL || "http://127.0.0.1:8188",
    workflow,
    bindings: workflow ? inferBindings(workflow) : {},
    model: process.env.COMFYUI_CHECKPOINT || "",
  });
}
