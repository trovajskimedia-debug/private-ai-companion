import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, body, json, route, sameOrigin } from "@/lib/http";
import { z } from "zod";
export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return route(async () => {
    sameOrigin(request);
    await requireAuth();
    const { id } = await context.params;
    const { messageId } = z
      .object({ messageId: z.string().min(1).max(100) })
      .parse(await body(request));
    const image = await db.message.findFirst({
      where: { id: messageId, characterId: id, imagePath: { not: null } },
    });
    if (!image)
      throw new ApiError(404, "Image does not belong to this character.");
    // Protect a chosen chat image from later conversation cleanup.
    const result = await db.$transaction(async (tx) => {
      await tx.message.update({
        where: { id: messageId },
        data: { kind: "portrait" },
      });
      return tx.character.update({
        where: { id },
        data: { portraitId: messageId, portraitSpec: null },
        include: { relationship: true },
      });
    });
    return json(result);
  });
}
