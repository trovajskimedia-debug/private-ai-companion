import { db } from "@/lib/db";
import { requireAuth } from "@/lib/auth";
import { body, json, route, sameOrigin } from "@/lib/http";
import { characterSchema } from "@/lib/validation";

export async function GET() {
  return route(async () => {
    await requireAuth();
    return json(
      await db.character.findMany({
        include: { relationship: true },
        orderBy: { createdAt: "asc" },
      }),
    );
  });
}
export async function POST(request: Request) {
  return route(async () => {
    sameOrigin(request);
    await requireAuth();
    const data = characterSchema.parse(await body(request, 160_000));
    const character = await db.character.create({
      data: {
        ...data,
        relationship: {
          create: { kind: data.profile?.relationshipRole || "friendship" },
        },
        messages: {
          create: {
            role: "assistant",
            content: `Hi, I'm ${data.name}. It's lovely to meet you. What's on your mind today?`,
            provider: "welcome",
          },
        },
      },
      include: { relationship: true },
    });
    return json(character, 201);
  });
}
