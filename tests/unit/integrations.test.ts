import { afterEach, describe, expect, it, vi } from "vitest";
import type { Character } from "@prisma/client";
import {
  portraitPrompt,
  queueImage,
  imageHistory,
} from "@/lib/integrations/comfyui";
import { ollamaStatus, replyWithOllama } from "@/lib/integrations/ollama";
import { newCompanion } from "@/lib/defaults";
import { getComfySettings } from "@/lib/comfy-settings";
import { readProfile } from "@/lib/profile";
import {
  inferBindings,
  comfySettingsSchema,
  type ObjectInfo,
} from "@/lib/comfy-workflow";
import template from "../../workflows/z-image-turbo.api.json";
vi.mock("@/lib/comfy-settings", () => ({ getComfySettings: vi.fn() }));

const character = {
  ...newCompanion,
  id: "test",
  createdAt: new Date(),
  updatedAt: new Date(),
  profile: JSON.parse(JSON.stringify(readProfile(newCompanion.profile))),
  portraitId: null,
  portraitSpec: null,
} as Character;
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("Ollama protocol", () => {
  it("sends persona, relationship and ordered conversation to the local model", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ message: { content: "A real model reply." } }),
          { status: 200 },
        ),
      );
    vi.stubGlobal("fetch", fetcher);
    vi.stubEnv("OLLAMA_MODEL", "test-model");
    const reply = await replyWithOllama(
      character,
      [{ role: "user", content: "Hej!" }],
      "creative",
    );
    expect(reply).toBe("A real model reply.");
    const request = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(request.model).toBe("test-model");
    expect(request.stream).toBe(false);
    expect(request.messages[0].content).toContain("creative");
    expect(request.messages.at(-1)).toEqual({ role: "user", content: "Hej!" });
  });
  it("reports missing models instead of treating an open service as readiness", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(
            JSON.stringify({ models: [{ name: "different-model" }] }),
          ),
        ),
    );
    const status = await ollamaStatus();
    expect(status.connected).toBe(false);
    expect(status.error).toContain("not installed");
  });
  it("fails explicitly when inference is unavailable or empty", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(replyWithOllama(character, [], "friendship")).rejects.toThrow(
      "Ollama did not respond",
    );
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response(JSON.stringify({ message: { content: "" } })),
        ),
    );
    await expect(replyWithOllama(character, [], "friendship")).rejects.toThrow(
      "empty reply",
    );
  });
});

const settings = comfySettingsSchema.parse({
  baseUrl: "http://127.0.0.1:8188",
  workflow: template,
  bindings: inferBindings(template),
  model: "z_image_turbo_bf16.safetensors",
  clip: "qwen_3_4b.safetensors",
  vae: "ae.safetensors",
});
const info: ObjectInfo = Object.fromEntries(
  Object.values(template).map((node) => [
    node.class_type,
    { input: { required: {} }, output: ["*", "*", "*"] },
  ]),
);
describe("ComfyUI API integration", () => {
  it("uses detailed visual fields without sending private biography to the image service", () => {
    const prompt = portraitPrompt(
      {
        ...newCompanion,
        profile: readProfile({
          gender: "man",
          eyeColor: "green",
          appearanceDescription: "distinctive adult face",
          privateDetails: "do not send this secret",
        }),
      },
      "a sunny garden",
    );
    expect(prompt).toContain("27 years old");
    expect(prompt).toContain("green");
    expect(prompt).toContain("distinctive adult face");
    expect(prompt).not.toContain("do not send this secret");
    expect(prompt).not.toContain("adult woman");
  });
  it("binds the actual imported graph and saves the submitted prompt, seed and workflow", async () => {
    vi.mocked(getComfySettings).mockResolvedValue(settings);
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce(new Response(JSON.stringify(info)))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ prompt_id: "job-123" })),
      );
    vi.stubGlobal("fetch", fetcher);
    const result = await queueImage(character, "in the garden");
    expect(result.promptId).toBe("job-123");
    const payload = JSON.parse(fetcher.mock.calls[1][1].body);
    const target = settings.bindings.prompt!;
    expect(payload.prompt[target.nodeId].inputs[target.input]).toContain(
      "in the garden",
    );
    expect(result.metadata.seed).toBe(42);
    expect(result.metadata.workflow).toEqual(payload.prompt);
  });
  it("refuses to manufacture a workflow when none was imported", async () => {
    vi.mocked(getComfySettings).mockResolvedValue({
      ...settings,
      workflow: null,
    });
    await expect(queueImage(character, "garden")).rejects.toThrow(
      "Import a ComfyUI API workflow",
    );
  });
  it("distinguishes pending history from completed history", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response("{}"))
        .mockResolvedValueOnce(
          new Response(
            JSON.stringify({
              id: { status: { completed: true }, outputs: {} },
            }),
          ),
        ),
    );
    expect(await imageHistory("id", settings.baseUrl)).toBeNull();
    expect(
      (await imageHistory("id", settings.baseUrl))?.status?.completed,
    ).toBe(true);
  });
});
