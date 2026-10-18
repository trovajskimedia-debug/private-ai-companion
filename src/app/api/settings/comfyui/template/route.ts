import { requireAuth } from "@/lib/auth";
import { json, route } from "@/lib/http";
import template from "../../../../../../workflows/z-image-turbo.api.json";
export async function GET() {
  return route(async () => {
    await requireAuth();
    return json({
      workflow: template,
      source:
        "Comfy-Org/workflow_templates@59a3b48bf369c5a15f29a1308bae3e279fa15505",
      models: {
        model: "z_image_turbo_bf16.safetensors",
        clip: "qwen_3_4b.safetensors",
        vae: "ae.safetensors",
      },
    });
  });
}
