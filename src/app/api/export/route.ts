import { requireAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { json, route } from "@/lib/http";
export async function GET() {
  return route(async () => {
    await requireAuth();
    const characters = await db.character.findMany({
      include: { relationship: true, messages: { orderBy: { id: "asc" } } },
    });
    return json({
      version: 1,
      exportedAt: new Date().toISOString(),
      characters,
    });
  });
}
