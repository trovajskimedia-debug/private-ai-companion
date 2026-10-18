import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ApiError, body, json, route, sameOrigin } from "@/lib/http";
import { characterSchema } from "@/lib/validation";
import { purgeImages } from "@/lib/purge-images";
import { withChatLock } from "@/lib/chat-lock";

type Context = { params: Promise<{ id: string }> };
export async function PATCH(request: Request, context: Context) {
  return route(async () => {
    sameOrigin(request);
    await requireAuth();
    const { id } = await context.params;
    if (!(await db.character.findUnique({ where: { id } })))
      throw new ApiError(404, "Companion not found.");
    const data = characterSchema.parse(await body(request));
    return json(
      await db.character.update({
        where: { id },
        data,
        include: { relationship: true },
      }),
    );
  });
}
export async function DELETE(request: Request, context: Context) {
  return route(async () => {
    sameOrigin(request);
    await requireAuth();
    const { id } = await context.params;
    return withChatLock(id, () =>
      withChatLock(`image:${id}`, async () => {
        const character = await db.character.findUnique({
          where: { id },
          include: { messages: { select: { imagePath: true } } },
        });
        if (!character) throw new ApiError(404, "Companion not found.");
        const active = await db.imageJob.count({
          where: { characterId: id, status: { in: ["queued", "running"] } },
        });
        if (active)
          throw new ApiError(
            409,
            "Wait for the image job to finish before deleting this companion.",
          );
        await purgeImages(
          character.messages.map((message) => message.imagePath),
        );
        await db.character.delete({ where: { id } });
        return json({ ok: true });
      }),
    );
  });
}
