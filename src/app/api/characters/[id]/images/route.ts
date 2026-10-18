import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ApiError, body, json, route, sameOrigin } from "@/lib/http";
import { imageSchema } from "@/lib/validation";
import { queueImage } from "@/lib/integrations/comfyui";
import { withChatLock } from "@/lib/chat-lock";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, context: Context) {
  return route(async () => {
    await requireAuth();
    const { id } = await context.params;
    return json(
      await db.imageJob.findMany({
        where: { characterId: id, status: { in: ["queued", "running"] } },
        select: { id: true, status: true, error: true },
      }),
    );
  });
}
export async function POST(request: Request, context: Context) {
  return route(async () => {
    sameOrigin(request);
    await requireAuth();
    const { id } = await context.params;
    const { prompt } = imageSchema.parse(await body(request));
    return withChatLock(`image:${id}`, async () => {
      const character = await db.character.findUnique({ where: { id } });
      if (!character) throw new ApiError(404, "Companion not found.");
      if (
        await db.imageJob.count({
          where: { characterId: id, status: { in: ["queued", "running"] } },
        })
      )
        throw new ApiError(
          409,
          "An image is already queued for this companion.",
        );
      const job = await db.imageJob.create({
        data: { characterId: id, prompt },
      });
      try {
        const promptId = await queueImage(character, prompt);
        return json(
          await db.imageJob.update({
            where: { id: job.id },
            data: { promptId, status: "running" },
            select: { id: true, status: true, error: true },
          }),
          202,
        );
      } catch (error) {
        await db.imageJob.update({
          where: { id: job.id },
          data: {
            status: "failed",
            error:
              error instanceof ApiError
                ? error.message
                : "Image generation failed.",
          },
        });
        throw error;
      }
    });
  });
}
