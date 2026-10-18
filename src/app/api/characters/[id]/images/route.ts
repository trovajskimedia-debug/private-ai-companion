import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { body, json, route, sameOrigin } from "@/lib/http";
import { imageSchema } from "@/lib/validation";
import { createImageJob } from "@/lib/image-jobs";
type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return route(async () => {
    await requireAuth();
    const { id } = await context.params;
    return json(
      await db.imageJob.findMany({
        where: { characterId: id, status: { in: ["queued", "running"] } },
        select: { id: true, status: true, error: true, purpose: true },
      }),
    );
  });
}
export async function POST(request: Request, context: Context) {
  return route(async () => {
    sameOrigin(request);
    await requireAuth();
    const { id } = await context.params;
    const { prompt, purpose } = imageSchema.parse(await body(request));
    return json(await createImageJob(id, prompt, purpose), 202);
  });
}
