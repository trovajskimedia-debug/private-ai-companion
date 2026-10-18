import { z } from "zod";
export const workflowSchema = z
  .record(
    z.string().min(1).max(100),
    z.object({
      class_type: z.string().min(1).max(200),
      inputs: z.record(z.string(), z.unknown()),
      _meta: z.object({ title: z.string() }).passthrough().optional(),
    }),
  )
  .refine(
    (value) =>
      Object.keys(value).length > 0 && Object.keys(value).length <= 500,
    "Use an API workflow with 1–500 nodes.",
  );
export type Workflow = z.infer<typeof workflowSchema>;
const binding = z
  .object({
    nodeId: z.string().min(1).max(100),
    input: z.string().min(1).max(100),
  })
  .nullable();
export const bindingsSchema = z.object({
  prompt: binding.default(null),
  seed: binding.default(null),
  model: binding.default(null),
  clip: binding.default(null),
  vae: binding.default(null),
  width: binding.default(null),
  height: binding.default(null),
  reference: binding.default(null),
});
export type Bindings = z.infer<typeof bindingsSchema>;
export const comfySettingsSchema = z.object({
  baseUrl: z
    .string()
    .url()
    .refine((value) => {
      const u = new URL(value);
      return (
        ["http:", "https:"].includes(u.protocol) &&
        !u.username &&
        !u.password &&
        !u.search &&
        !u.hash
      );
    }, "Use an http(s) server address without credentials, query or fragment."),
  workflow: workflowSchema.nullable(),
  bindings: bindingsSchema,
  model: z.string().max(300).default(""),
  clip: z.string().max(300).default(""),
  vae: z.string().max(300).default(""),
  width: z.number().int().min(256).max(2048).multipleOf(64).default(512),
  height: z.number().int().min(256).max(2048).multipleOf(64).default(768),
});
export type ComfySettings = z.infer<typeof comfySettingsSchema>;
export type NodeInfo = {
  input?: {
    required?: Record<string, unknown[]>;
    optional?: Record<string, unknown[]>;
  };
  output?: string[];
};
export type ObjectInfo = Record<string, NodeInfo>;
export function bindingOptions(workflow: Workflow) {
  return Object.entries(workflow).flatMap(([id, node]) =>
    Object.entries(node.inputs)
      .filter(
        ([, value]) =>
          !Array.isArray(value) &&
          (typeof value === "string" || typeof value === "number"),
      )
      .map(([input]) => ({
        nodeId: id,
        input,
        label: `${id} · ${node._meta?.title || node.class_type} · ${input}`,
      })),
  );
}
export function inferBindings(workflow: Workflow): Bindings {
  const all = bindingOptions(workflow);
  const choose = (names: string[]) => {
    const found = all.filter((x) => names.includes(x.input));
    return found.length === 1
      ? { nodeId: found[0].nodeId, input: found[0].input }
      : null;
  };
  return {
    prompt: choose(["text", "prompt"]),
    seed: choose(["seed", "noise_seed"]),
    model: choose(["unet_name", "ckpt_name"]),
    clip: choose(["clip_name"]),
    vae: choose(["vae_name"]),
    width: choose(["width"]),
    height: choose(["height"]),
    reference: choose(["image"]),
  };
}
export function applyBindings(
  settings: ComfySettings,
  prompt: string,
  seed: number,
  reference?: string,
) {
  const workflow = structuredClone(settings.workflow || {});
  const changes = {
    prompt,
    seed,
    model: settings.model,
    clip: settings.clip,
    vae: settings.vae,
    width: settings.width,
    height: settings.height,
    reference,
  };
  for (const [key, target] of Object.entries(settings.bindings)) {
    if (!target) continue;
    const node = workflow[target.nodeId];
    if (!node || !(target.input in node.inputs))
      throw new Error(
        `Workflow binding ${key} points to a missing field. Re-select it in Settings.`,
      );
    const value = changes[key as keyof typeof changes];
    if (value !== undefined && value !== "") node.inputs[target.input] = value;
  }
  return workflow;
}
export function validateWorkflow(
  workflow: Workflow,
  info: ObjectInfo,
  deferredInput?: { nodeId: string; input: string } | null,
) {
  const issues: string[] = [];
  if (!Object.values(workflow).some((node) => node.class_type === "SaveImage"))
    issues.push("Workflow needs a SaveImage output node.");
  for (const [id, node] of Object.entries(workflow)) {
    const schema = info[node.class_type];
    if (!schema) {
      issues.push(
        `Node ${id}: ${node.class_type} is not installed. Update ComfyUI or install that node.`,
      );
      continue;
    }
    for (const [input, definition] of Object.entries(
      schema.input?.required || {},
    )) {
      if (!(input in node.inputs)) {
        issues.push(
          `Node ${id} (${node.class_type}) is missing required input ${input}.`,
        );
        continue;
      }
      const value = node.inputs[input];
      if (Array.isArray(value)) {
        const source = workflow[String(value[0])];
        if (
          value.length !== 2 ||
          !source ||
          !Number.isInteger(value[1]) ||
          value[1] < 0
        )
          issues.push(`Node ${id}.${input} has an invalid connection.`);
        else if (
          info[source.class_type]?.output &&
          value[1] >= info[source.class_type].output!.length
        )
          issues.push(`Node ${id}.${input} references a missing output.`);
        continue;
      }
      const choices = definition[0];
      if (
        Array.isArray(choices) &&
        !(deferredInput?.nodeId === id && deferredInput.input === input) &&
        !choices.includes(value)
      )
        issues.push(
          `Node ${id} (${node.class_type}): ${input} “${String(value)}” is unavailable. Select an installed model or supported option.`,
        );
      if (choices === "INT" && !Number.isInteger(value))
        issues.push(`Node ${id}.${input} must be an integer.`);
      if (
        choices === "FLOAT" &&
        (typeof value !== "number" || !Number.isFinite(value))
      )
        issues.push(`Node ${id}.${input} must be a number.`);
      if (choices === "STRING" && typeof value !== "string")
        issues.push(`Node ${id}.${input} must be text.`);
      if (choices === "BOOLEAN" && typeof value !== "boolean")
        issues.push(`Node ${id}.${input} must be true or false.`);
    }
  }
  return issues;
}
export function modelCatalog(info: ObjectInfo) {
  const values = (field: string) =>
    Array.from(
      new Set(
        Object.values(info).flatMap((node) => {
          const list = (node.input?.required?.[field] ||
            node.input?.optional?.[field])?.[0];
          return Array.isArray(list)
            ? list.filter((v): v is string => typeof v === "string")
            : [];
        }),
      ),
    ).sort();
  return {
    diffusion: values("unet_name"),
    checkpoints: values("ckpt_name"),
    textEncoders: values("clip_name"),
    vaes: values("vae_name"),
  };
}
