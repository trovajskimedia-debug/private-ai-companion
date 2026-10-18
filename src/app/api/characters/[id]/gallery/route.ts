import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError, json, route } from "@/lib/http";
export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  return route(async () => {
    await requireAuth();
    const { id } = await context.params;
    if (!(await db.character.findUnique({ where: { id } })))
      throw new ApiError(404, "Companion not found.");
    const before = new URL(request.url).searchParams.get("before");
    const rows = await db.message.findMany({
      where: { characterId: id, imagePath: { not: null } },
      orderBy: { id: "desc" },
      take: 25,
      ...(before ? { cursor: { id: before }, skip: 1 } : {}),
    });
    return json({ images: rows.slice(0, 24), hasMore: rows.length > 24 });
  });
}
