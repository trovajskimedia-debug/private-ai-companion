import { requireAuth } from "@/lib/auth";
import { body, json, route, sameOrigin } from "@/lib/http";
import { comfySettingsSchema } from "@/lib/comfy-workflow";
import { inspectComfySettings } from "@/lib/integrations/comfyui";
export async function POST(request: Request) {
  return route(async () => {
    sameOrigin(request);
    await requireAuth();
    const settings = comfySettingsSchema.parse(await body(request, 2_000_000));
    return json(await inspectComfySettings(settings));
  });
}
