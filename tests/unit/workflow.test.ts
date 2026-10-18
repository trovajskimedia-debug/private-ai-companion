import { describe, expect, it } from "vitest";
import {
  applyBindings,
  comfySettingsSchema,
  inferBindings,
  validateWorkflow,
  workflowSchema,
} from "@/lib/comfy-workflow";
import template from "../../workflows/z-image-turbo.api.json";
describe("imported workflows and dynamic bindings", () => {
  it("reports an empty installed-model list as a missing model", () => {
    const issues = validateWorkflow(
      {
        load: {
          class_type: "UNETLoader",
          inputs: { unet_name: "model.safetensors" },
        },
        save: { class_type: "SaveImage", inputs: {} },
      },
      {
        UNETLoader: { input: { required: { unet_name: [[]] } } },
        SaveImage: { input: { required: {} } },
      },
    );
    expect(issues.join(" ")).toContain("model.safetensors");
    expect(issues.join(" ")).toContain("unavailable");
  });
  it("accepts the official-derived Z-Image-Turbo graph and discovers its real IDs", () => {
    const graph = workflowSchema.parse(template);
    const bindings = inferBindings(graph);
    expect(bindings.prompt).not.toBeNull();
    expect(bindings.model).not.toBeNull();
    expect(graph[bindings.model!.nodeId].class_type).toBe("UNETLoader");
    expect(
      Object.values(graph).find((node) => node.class_type === "KSampler")!
        .inputs.cfg,
    ).toBe(1);
    expect(
      Object.values(graph).find((node) => node.class_type === "KSampler")!
        .inputs.steps,
    ).toBe(8);
  });
  it("works with unrelated node IDs and preserves integer seeds", () => {
    const graph = {
      "custom-loader-A": {
        class_type: "UNETLoader",
        inputs: { unet_name: "old" },
      },
      "prompt-900": { class_type: "CLIPTextEncode", inputs: { text: "old" } },
      "sampler-X": { class_type: "KSampler", inputs: { seed: 0 } },
    };
    const settings = comfySettingsSchema.parse({
      baseUrl: "http://127.0.0.1:8000",
      workflow: graph,
      bindings: inferBindings(graph),
      model: "installed.safetensors",
    });
    const submitted = applyBindings(settings, 'a "quoted" adult portrait', 123);
    expect(submitted["prompt-900"].inputs.text).toBe(
      'a "quoted" adult portrait',
    );
    expect(submitted["sampler-X"].inputs.seed).toBe(123);
    expect(graph["sampler-X"].inputs.seed).toBe(0);
  });
  it("reports missing nodes, unavailable models and broken connections", () => {
    const graph = {
      a: { class_type: "MissingNode", inputs: {} },
      b: {
        class_type: "UNETLoader",
        inputs: { unet_name: "missing.safetensors" },
      },
      c: { class_type: "SaveImage", inputs: { images: ["no-node", 0] } },
    };
    const issues = validateWorkflow(graph, {
      UNETLoader: {
        input: { required: { unet_name: [["installed.safetensors"]] } },
      },
      SaveImage: { input: { required: { images: ["IMAGE"] } } },
    });
    expect(issues.join(" ")).toContain("MissingNode");
    expect(issues.join(" ")).toContain("missing.safetensors");
    expect(issues.join(" ")).toContain("invalid connection");
  });
  it("does not guess between positive and negative text fields", () => {
    const bindings = inferBindings({
      a: { class_type: "CLIPTextEncode", inputs: { text: "positive" } },
      b: { class_type: "CLIPTextEncode", inputs: { text: "negative" } },
    });
    expect(bindings.prompt).toBeNull();
  });
  it("rejects credential-bearing URLs and visual workflow exports", () => {
    expect(
      comfySettingsSchema.safeParse({
        baseUrl: "http://user:secret@localhost",
        workflow: null,
        bindings: {},
      }).success,
    ).toBe(false);
    expect(workflowSchema.safeParse({ nodes: [] }).success).toBe(false);
  });
});
