import { requireAuth } from "@/lib/auth";
import { json, route } from "@/lib/http";
import { ollamaStatus } from "@/lib/integrations/ollama";
import { comfyStatus } from "@/lib/integrations/comfyui";

export async function GET() {
  return route(async () => {
    await requireAuth();
    const [ollama, comfyui] = await Promise.all([
      ollamaStatus(),
      comfyStatus(),
    ]);
    return json({ ollama, comfyui });
  });
}
