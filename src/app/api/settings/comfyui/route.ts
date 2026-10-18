import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { body, json, route, sameOrigin } from "@/lib/http";
import { comfySettingsSchema } from "@/lib/comfy-workflow";
import { getComfySettings } from "@/lib/comfy-settings";
export async function GET() {
  return route(async () => {
    await requireAuth();
    return json(await getComfySettings());
  });
}
export async function PUT(request: Request) {
  return route(async () => {
    sameOrigin(request);
    await requireAuth();
    const settings = comfySettingsSchema.parse(await body(request, 2_000_000));
    await db.appSetting.upsert({
      where: { key: "comfyui" },
      create: { key: "comfyui", value: JSON.stringify(settings) },
      update: { value: JSON.stringify(settings) },
    });
    return json(settings);
  });
}
