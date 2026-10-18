import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { ApiError, body, json, route, sameOrigin } from "@/lib/http";
import { chatSchema } from "@/lib/validation";
import { demoReply, replyWithOllama } from "@/lib/integrations/ollama";
import { withChatLock } from "@/lib/chat-lock";
import { purgeImages } from "@/lib/purge-images";

export const maxDuration = 180;
type Context = { params: Promise<{ id: string }> };
export async function GET(request: Request, context: Context) {
  return route(async () => {
    await requireAuth();
    const { id } = await context.params;
    if (!(await db.character.findUnique({ where: { id } })))
      throw new ApiError(404, "Companion not found.");
    const before = new URL(request.url).searchParams.get("before");
    const rows = await db.message.findMany({
      where: { characterId: id },
      orderBy: { id: "desc" },
      take: 51,
      ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    });
    return json({
      messages: rows.slice(0, 50).reverse(),
      hasMore: rows.length > 50,
    });
  });
}
export async function POST(request: Request, context: Context) {
  return route(async () => {
    sameOrigin(request);
    await requireAuth();
    const { id } = await context.params;
    const { content, mode } = chatSchema.parse(await body(request));
    return withChatLock(id, async () => {
      const character = await db.character.findUnique({
        where: { id },
        include: { relationship: true },
      });
      if (!character) throw new ApiError(404, "Companion not found.");
      const history = await db.message.findMany({
        where: { characterId: id, kind: "text" },
        orderBy: { id: "desc" },
        take: 39,
      });
      const reply =
        mode === "demo"
          ? demoReply(character.name, content, character.interests)
          : await replyWithOllama(
              character,
              [...history.reverse(), { role: "user", content }],
              character.relationship?.kind || "friendship",
            );
      // A failed inference leaves no half-saved conversation or relationship reward.
      const result = await db.$transaction(async (tx) => {
        const user = await tx.message.create({
          data: { characterId: id, role: "user", content },
        });
        const assistant = await tx.message.create({
          data: {
            characterId: id,
            role: "assistant",
            content: reply,
            provider: mode,
          },
        });
        const relationship = await tx.relationship.update({
          where: { characterId: id },
          data: {
            points: { increment: 5 },
            interactions: { increment: 1 },
            lastActivity: new Date(),
          },
        });
        return { messages: [user, assistant], relationship };
      });
      return json(result, 201);
    });
  });
}
export async function DELETE(request: Request, context: Context) {
  return route(async () => {
    sameOrigin(request);
    await requireAuth();
    const { id } = await context.params;
    return withChatLock(id, () =>
      withChatLock(`image:${id}`, async () => {
        if (
          await db.imageJob.count({
            where: { characterId: id, status: { in: ["queued", "running"] } },
          })
        )
          throw new ApiError(
            409,
            "Wait for the image job to finish before clearing this conversation.",
          );
        const images = await db.message.findMany({
          where: { characterId: id, imagePath: { not: null } },
          select: { imagePath: true },
        });
        await purgeImages(images.map((image) => image.imagePath));
        await db.$transaction([
          db.message.deleteMany({ where: { characterId: id } }),
          db.imageJob.deleteMany({ where: { characterId: id } }),
        ]);
        return json({ ok: true });
      }),
    );
  });
}
