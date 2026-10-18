import { afterEach, describe, expect, it, vi } from "vitest";
import type { Character } from "@prisma/client";
import {
  buildWorkflow,
  fillWorkflow,
  portraitPrompt,
  queueImage,
  imageHistory,
} from "@/lib/integrations/comfyui";
import { ollamaStatus, replyWithOllama } from "@/lib/integrations/ollama";
import { newCompanion } from "@/lib/defaults";

const character = {
  ...newCompanion,
  id: "test",
  createdAt: new Date(),
  updatedAt: new Date(),
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

describe("ComfyUI workflow", () => {
  it("includes the adult age, wardrobe and requested scene in generation", () => {
    const prompt = portraitPrompt(character, "a sunny garden");
    expect(prompt).toContain("27 years old");
    expect(prompt).toContain("yoga pants");
    expect(prompt).toContain(character.outfitColor);
    expect(prompt).toContain("a sunny garden");
    const workflow = buildWorkflow(prompt, "portrait.safetensors", 123);
    expect(workflow["1"].inputs.ckpt_name).toBe("portrait.safetensors");
    expect(workflow["5"].inputs.seed).toBe(123);
    expect(workflow["7"].class_type).toBe("SaveImage");
  });
  it("substitutes custom workflow placeholders without reparsing prompt text", () => {
    expect(
      fillWorkflow(
        { text: "{{PROMPT}}", seed: "{{SEED}}" },
        'a "quoted" scene',
        42,
      ),
    ).toEqual({ text: 'a "quoted" scene', seed: "42" });
  });
  it("queues a real API-format request and returns the prompt id", async () => {
    vi.stubEnv("COMFYUI_CHECKPOINT", "portrait.safetensors");
    vi.stubEnv("COMFYUI_WORKFLOW_PATH", "");
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(JSON.stringify({ prompt_id: "job-123" })),
      );
    vi.stubGlobal("fetch", fetcher);
    expect(await queueImage(character, "in the garden")).toBe("job-123");
    const payload = JSON.parse(fetcher.mock.calls[0][1].body);
    expect(payload.prompt["2"].inputs.text).toContain("in the garden");
  });
  it("does not pretend image generation succeeded without a checkpoint", async () => {
    vi.stubEnv("COMFYUI_CHECKPOINT", "");
    vi.stubEnv("COMFYUI_WORKFLOW_PATH", "");
    await expect(queueImage(character, "garden")).rejects.toThrow(
      "COMFYUI_CHECKPOINT",
    );
  });
  it("distinguishes an unfinished job from a completed history entry", async () => {
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
    expect(await imageHistory("id")).toBeNull();
    expect((await imageHistory("id"))?.status?.completed).toBe(true);
  });
});
