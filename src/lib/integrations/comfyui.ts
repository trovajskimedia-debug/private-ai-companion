import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Character } from "@prisma/client";
import { db } from "../db";
import { ApiError } from "../http";
import { getComfySettings } from "../comfy-settings";
import {
  applyBindings,
  modelCatalog,
  validateWorkflow,
  type ComfySettings,
  type ObjectInfo,
} from "../comfy-workflow";
import { readProfile } from "../profile";
import { portraitPrompt } from "../visual-prompt";
export { portraitPrompt } from "../visual-prompt";

export async function comfyFetch(
  base: string,
  endpoint: string,
  options: RequestInit = {},
  timeout = 10_000,
) {
  try {
    return await fetch(`${base.replace(/\/$/, "")}${endpoint}`, {
      ...options,
      signal: AbortSignal.timeout(timeout),
      cache: "no-store",
      redirect: "error",
    });
  } catch {
    throw new ApiError(
      503,
      `ComfyUI is not reachable at ${base}. Start ComfyUI Desktop and copy its actual server address into Settings. When running the app on Windows, both services can use 127.0.0.1.`,
    );
  }
}
export async function inspectComfySettings(settings: ComfySettings) {
  const issues: string[] = [];
  let connected = false;
  let info: ObjectInfo = {};
  try {
    const stats = await comfyFetch(settings.baseUrl, "/system_stats", {}, 5000);
    if (!stats.ok)
      throw new ApiError(
        502,
        `ComfyUI returned HTTP ${stats.status} from /system_stats. Check the server address.`,
      );
    connected = true;
    const response = await comfyFetch(
      settings.baseUrl,
      "/object_info",
      {},
      10_000,
    );
    if (!response.ok)
      throw new ApiError(
        502,
        `Cannot read ComfyUI node/model definitions (HTTP ${response.status}).`,
      );
    info = await response.json();
    if (!settings.workflow)
      issues.push(
        "Import a ComfyUI API workflow in Settings, or load the official Z-Image-Turbo template.",
      );
    else if (!settings.bindings.prompt)
      issues.push("Select the workflow's positive prompt field in Settings.");
    else {
      try {
        issues.push(
          ...validateWorkflow(
            applyBindings(
              settings,
              "A fully clothed fictional adult portrait",
              42,
            ),
            info,
            settings.bindings.reference,
          ),
        );
      } catch (error) {
        issues.push((error as Error).message);
      }
    }
  } catch (error) {
    issues.push(
      error instanceof ApiError
        ? error.message
        : "ComfyUI returned an invalid API response.",
    );
  }
  return {
    connected,
    ready: connected && !issues.length,
    checkpointConfigured: !!settings.workflow,
    model: settings.model,
    issues,
    error: issues[0],
    models: modelCatalog(info),
  };
}
export async function comfyStatus() {
  return inspectComfySettings(await getComfySettings());
}
export async function queueImage(character: Character, scene: string) {
  const settings = await getComfySettings();
  if (!settings.workflow || !settings.bindings.prompt)
    throw new ApiError(
      503,
      "Import a ComfyUI API workflow and select its prompt field in Settings first. Z-Image-Turbo is available as an official template.",
    );
  const profile = readProfile(character.profile);
  const seed = profile.seed;
  const prompt = portraitPrompt({ ...character, profile }, scene);
  let reference: string | undefined;
  if (profile.referenceImageId) {
    if (!settings.bindings.reference)
      throw new ApiError(
        400,
        "This character has a reference image, but the workflow has no reference-image binding. Choose a reference-capable workflow or clear the selected reference in Advanced.",
      );
    const image = await db.referenceImage.findFirst({
      where: { id: profile.referenceImageId, characterId: character.id },
    });
    if (!image)
      throw new ApiError(
        400,
        "The selected reference image does not belong to this character or was deleted.",
      );
    const bytes = await readFile(
      path.join(process.cwd(), "data", "images", image.filename),
    );
    const form = new FormData();
    form.set("image", new Blob([new Uint8Array(bytes)]), image.filename);
    form.set("type", "input");
    form.set("overwrite", "false");
    const upload = await comfyFetch(
      settings.baseUrl,
      "/upload/image",
      { method: "POST", body: form },
      30_000,
    );
    if (!upload.ok)
      throw new ApiError(502, "ComfyUI could not receive the reference image.");
    const result = await upload.json();
    if (typeof result.name !== "string")
      throw new ApiError(
        502,
        "ComfyUI returned an invalid reference image filename.",
      );
    reference = result.subfolder
      ? `${result.subfolder}/${result.name}`
      : result.name;
  }
  let workflow;
  try {
    workflow = applyBindings(settings, prompt, seed, reference);
  } catch (error) {
    throw new ApiError(400, (error as Error).message);
  }
  const schemaResponse = await comfyFetch(settings.baseUrl, "/object_info");
  if (!schemaResponse.ok)
    throw new ApiError(
      502,
      "Could not read installed ComfyUI nodes and models.",
    );
  const issues = validateWorkflow(workflow, await schemaResponse.json());
  if (issues.length) throw new ApiError(400, issues.slice(0, 5).join(" "));
  const response = await comfyFetch(
    settings.baseUrl,
    "/prompt",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: workflow }),
    },
    20_000,
  );
  const data = await response.json();
  if (!response.ok || data.error) {
    const details = Object.values(data.node_errors || {})
      .flatMap(
        (node: unknown) =>
          (node as { errors?: { message?: string; details?: string }[] })
            .errors || [],
      )
      .map((item) =>
        `${item.message || "Node error"}: ${item.details || ""}`.slice(0, 300),
      )
      .slice(0, 4)
      .join(" ");
    throw new ApiError(
      502,
      `ComfyUI rejected the workflow. ${details || "Check the selected models, installed nodes, and API export."}`,
    );
  }
  if (typeof data.prompt_id !== "string")
    throw new ApiError(502, "ComfyUI did not return a job ID.");
  return {
    promptId: data.prompt_id as string,
    serverUrl: settings.baseUrl,
    metadata: JSON.parse(
      JSON.stringify({
        seed: settings.bindings.seed ? seed : null,
        prompt,
        workflow,
        model: settings.model,
        clip: settings.clip,
        vae: settings.vae,
        width: settings.bindings.width ? settings.width : null,
        height: settings.bindings.height ? settings.height : null,
        referenceImageId: profile.referenceImageId || null,
      }),
    ),
  };
}
export type ComfyHistory = {
  status?: {
    status_str?: string;
    completed?: boolean;
    messages?: [
      string,
      { exception_type?: string; exception_message?: string },
    ][];
  };
  outputs?: Record<
    string,
    { images?: { filename: string; subfolder: string; type: string }[] }
  >;
};
export async function imageHistory(
  promptId: string,
  serverUrl?: string,
): Promise<ComfyHistory | null> {
  const base = serverUrl || (await getComfySettings()).baseUrl;
  const response = await comfyFetch(
    base,
    `/history/${encodeURIComponent(promptId)}`,
  );
  if (!response.ok) throw new ApiError(502, "Could not check the ComfyUI job.");
  const data = await response.json();
  return data[promptId] || null;
}
